import {AST, Parser} from 'node-sql-parser/build/mysql'
import exp = require("constants");

export type ParserArgs = {
    headerMap: Map<string, number>,
    maxOR: number,
    maxAND: number,
    maxRows: number,
}

type SelectQuery = {
    fields: number[],
    whereConditions: number[][][]
}

type InsertQuery = {
    insertValues: number[]
}

type UpdateQuery = {
    setExpressions: number[][],
    whereConditions: number[][][]
}

type DeleteQuery = {
    whereConditions: number[][][]
}

class Condition {
    left: number;
    right: number;

    public constructor(left: number, right: number) {
        this.left = left;
        this.right = right;
    }
}

class ANDCondition {
    conditions: Condition[] = [];

    public constructor(...inner: Condition[]) {
        if (inner) {
            this.conditions = inner;
        }
    }
}

class WhereCondition {
    conditions: ANDCondition[] = [];

    public constructor(...inner: ANDCondition[]) {
        if (inner) {
            this.conditions = inner;
        }
    }

    public serialize(nAND: number, nOR: number): number[][][] {
        let whereEncoded = [];
        for (const andCond of this.conditions) {
            let inner = [];
            for (let i = 0; i < nAND; i++) {
                let cond = andCond.conditions.find((c) => c.left == i + 1);
                if (cond !== undefined) {
                    inner.push([cond.left, cond.right]);
                } else {
                    inner.push([0,0])
                }
            }
            whereEncoded.push(inner);
        }

        for (let i = 0; i < nOR - whereEncoded.length; i++) {
            whereEncoded.push([...Array(nAND)].map(_ => [0, 0]));
        }

        return whereEncoded;
    }
}

export function parseSelect(sql: string, args: ParserArgs): SelectQuery {
    const parser = new Parser();
    let {ast} = parser.parse(sql);

    let fields: number[] = [];

    if ("columns" in ast) {
        if (ast.columns === '*') {
            fields = [...Array(args.headerMap.size)].map(_ => 1);
        } else {
            fields = [...Array(args.headerMap.size)].map(_ => 0)

            ast.columns!.forEach((cRef) => {
                let columnIdx = args.headerMap.get(cRef.expr.column);
                if (columnIdx === undefined) {
                    throw Error("unknown column");
                }

                fields[columnIdx - 1] = 1;
            });
        }
    } else {
        throw Error("select query must have columns")
    }

    let where = new WhereCondition();
    if ("where" in ast && ast.where !== null) {
        where = parseWhere(ast.where, args);
    }

    return {
        fields: fields,
        whereConditions: where.serialize(args.maxAND, args.maxOR)
    }
}

export function parseInsert(sql: string, args: ParserArgs): InsertQuery {
    const parser = new Parser();
    let {ast} = parser.parse(sql);


    if ("values" in ast && ast.values !== null && Array.isArray(ast.values)) {
        return {
            insertValues: ast.values[0].value.map((e) => "value" in e && typeof e.value === "number" ? e.value: 0)
        }
    }

    throw Error("unsupported values expression");
}

export function parseUpdate(sql: string, args: ParserArgs): UpdateQuery {
    const parser = new Parser();
    let {ast} = parser.parse(sql);

    let where = new WhereCondition();
    if ("where" in ast && ast.where !== null) {
        where = parseWhere(ast.where, args);
    }

    let setExpressions = [];
    if ("set" in ast && ast.set !== null) {
        for (let i = 0; i < args.headerMap.size; i++) {
            let cond = ast.set.find((c) => args.headerMap.get(c.column) == i + 1);
            if (cond !== undefined) {
                if ("value" in cond) {
                    setExpressions.push([i + 1, cond.value.value]);
                } else {
                    throw Error("unsupported set value");
                }
            } else {
                setExpressions.push([0,0])
            }
        }
    }

    return {
        setExpressions: setExpressions,
        whereConditions: where.serialize(args.maxAND, args.maxOR)
    }
}

export function parseDelete(sql: string, args: ParserArgs): DeleteQuery {
    const parser = new Parser();
    let {ast} = parser.parse(sql);

    let where = new WhereCondition();
    if ("where" in ast && ast.where !== null) {
        where = parseWhere(ast.where, args);
    }

    return {
        whereConditions: where.serialize(args.maxAND, args.maxOR)
    }
}

function parseWhere(ast: any, args: ParserArgs): WhereCondition {
    let condition = parseCondition(ast, args);

    if (condition instanceof Condition) {
        return new WhereCondition(new ANDCondition(condition));
    } else if (condition instanceof ANDCondition) {
        return new WhereCondition(condition);
    }

    return condition;
}

function parseCondition(ast: {operator: string, left: any, right: any}, args: ParserArgs): WhereCondition | ANDCondition | Condition {
    switch (ast.operator) {
        case 'OR': {
            let condition = new WhereCondition();
            let leftCondition =  parseCondition(ast.left, args);
            let rightCondition =  parseCondition(ast.right, args);

            if (leftCondition instanceof Condition) {
                condition.conditions.push(new ANDCondition(leftCondition));
            } else if (leftCondition instanceof ANDCondition) {
                condition.conditions.push(leftCondition);
            } else if (leftCondition instanceof WhereCondition) {
                condition.conditions.push(...leftCondition.conditions);
            }

            if (rightCondition instanceof Condition) {
                condition.conditions.push(new ANDCondition(rightCondition));
            } else if (rightCondition instanceof ANDCondition) {
                condition.conditions.push(rightCondition);
            } else {
                throw Error("unsupported condition");
            }

            return condition;
        }
        case 'AND': {
            let condition = new ANDCondition();
            let leftCondition =  parseCondition(ast.left, args);
            let rightCondition =  parseCondition(ast.right, args);

            if (leftCondition instanceof Condition) {
                condition.conditions.push(leftCondition);
            } else if (leftCondition instanceof ANDCondition) {
                condition.conditions.push(...leftCondition.conditions);
            } else {
                throw Error("unsupported condition");
            }

            if (rightCondition instanceof Condition) {
                condition.conditions.push(rightCondition);
            } else {
                throw Error("unsupported condition");
            }

            return condition;
        }
        case '=': {
            let columnIdx = args.headerMap.get(ast.left.column);
            if (columnIdx === undefined) {
                throw Error("unknown column");
            }

            return new Condition(columnIdx, ast.right.value);
        }
    }

    throw Error("unsupported condition");
}
