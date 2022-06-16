import {AST, Parser} from 'node-sql-parser/build/mysql'

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
}

export function parseSelect(sql: string, nAND: number, nOR: number): any {
    const parser = new Parser();
    let {ast} = parser.parse(sql);
    let whereConditions: [][][2];
    console.log(ast);
    if ("where" in ast) {
        let condition = parseWhere(ast.where);
        console.log(condition);
    }

    return []
}

function parseWhere(ast: any): WhereCondition {
    let condition = parseCondition(ast);

    if (condition instanceof Condition) {
        return new WhereCondition(new ANDCondition(condition));
    } else if (condition instanceof ANDCondition) {
        return new WhereCondition(condition);
    }

    return condition;
}

function parseCondition(ast: {operator: string, left: any, right: any}): WhereCondition | ANDCondition | Condition {
    console.log(ast);
    switch (ast.operator) {
        case 'OR': {
            let condition = new WhereCondition();
            let leftCondition =  parseCondition(ast.left);
            let rightCondition =  parseCondition(ast.right);

            if (leftCondition instanceof Condition) {
                condition.conditions.push(new ANDCondition(leftCondition));
            } else if (leftCondition instanceof ANDCondition) {
                condition.conditions.push(leftCondition);
            } else if (leftCondition instanceof WhereCondition) {
                condition.conditions.push(...leftCondition.conditions);
            }

            if (rightCondition instanceof Condition) {
                condition.conditions[condition.conditions.length - 1].conditions.push(rightCondition);
            } else if (rightCondition instanceof ANDCondition) {
                condition.conditions.push(rightCondition);
            } else {
                throw Error("unsupported condition");
            }

            return condition;

            break;
        }
        case 'AND': {
            // WHERE x = 1 AND y = 2
            let condition = new ANDCondition();
            let leftCondition =  parseCondition(ast.left);
            let rightCondition =  parseCondition(ast.right);

            console.log(leftCondition, rightCondition);

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
            return new Condition(1, 2);
        }
    }

    throw Error("unsupported condition");
}
