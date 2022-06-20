import {parseDelete, parseInsert, ParserArgs, parseSelect, parseUpdate} from "./parser";
import {AST, Parser} from "node-sql-parser/build/mysql";
import {Database, SqlValue} from "sql.js";
const buildPoseidon = require("circomlibjs").buildPoseidon;

type SelectCircuitInputs = {
    header: number[],
    table: number[][],
    tableCommit: bigint,
    fields: number[],
    whereConditions: number[][][],
    results: number[][],
}

type InsertCircuitInputs = {
    header: number[],
    table: number[][],
    tableCommit: bigint,
    insertValues: number[],
}

type UpdateCircuitInputs = {
    header: number[],
    table: number[][],
    tableCommit: bigint,
    whereConditions: number[][][],
    setExpressions: number[][],
}

type DeleteCircuitInputs = {
    header: number[],
    table: number[][],
    tableCommit: bigint,
    whereConditions: number[][][],
}

// this should be replaced by on-chain request
const tableCommitments = new Map<string, bigint>([
    ["table1", 6192063684007625405622444875231245009508356906093894343979231563958794510376n]
])

export async function execSqlQuery(db: Database, query: string, args: ParserArgs): Promise<
    SelectCircuitInputs | InsertCircuitInputs | UpdateCircuitInputs | DeleteCircuitInputs>
{
    const parser = new Parser();
    let {ast} = parser.parse(query)

    if (!("type" in ast)) {
        throw Error("bad query");
    }


    const tableName = parseTableName(ast);
    if (tableName == null) {
        throw Error("bad query: unknown table");
    }

    const tableState = db.exec(`SELECT * FROM ${tableName}`)[0];
    tableState.columns.shift();
    const tableHeader = tableState.columns.map((c) => args.headerMap.get(c)!);

    switch (ast.type) {
        case "select":
            const selectParsed = parseSelect(query, args);
            if (Array.isArray(ast.columns)) {
                ast.columns.unshift({expr: {type: "column_ref", table: null, column: "id"}, as: 'id'});
            }
            const selected = db.exec(parser.sqlify(ast))[0];
            selected.columns.shift();
            const formattedView = formatTable(selected.columns, selected.values, args);

            return {
                header: tableHeader,
                table: formatTable(tableState.columns, tableState.values, args),
                tableCommit: tableCommitments.get(tableName)!,
                fields: selectParsed.fields,
                whereConditions: selectParsed.whereConditions,
                results: formattedView
            }
        case "insert":
            const insertParsed = parseInsert(query, args);

            return {
                header: tableHeader,
                table: formatTable(tableState.columns, tableState.values, args),
                tableCommit: tableCommitments.get(tableName)!,
                insertValues: insertParsed.insertValues
            }
        case "update":
            const updParsed = parseUpdate(query, args);

            return {
                header: tableHeader,
                table: formatTable(tableState.columns, tableState.values, args),
                tableCommit: tableCommitments.get(tableName)!,
                whereConditions: updParsed.whereConditions,
                setExpressions: updParsed.setExpressions,
            }
        case "delete":
            const delParsed = parseDelete(query, args);

            return {
                header: tableHeader,
                table: formatTable(tableState.columns, tableState.values, args),
                tableCommit: tableCommitments.get(tableName)!,
                whereConditions: delParsed.whereConditions,
            }
    }

    throw Error("unsupported query");
}

function parseTableName(ast: AST) {
    switch (ast.type) {
        case "select":
        case "delete":
            return "from" in ast && ast.from !== null ? ast!.from[0].table : null;
        case "insert":
        case "update":
            return "table" in ast && ast.table !== null ? ast!.table[0].table : null;
    }
    throw Error("unsupported query");
}

function formatTable(columns: string[], values: SqlValue[][], args: ParserArgs): number[][] {
    let formatted = [];
    const emptyRow = [...Array(args.headerMap.size)].map(_ => 0);
    const columnMap = Array.from(args.headerMap.keys())
        .map((column) => columns.indexOf(column) + 1);

    for (let i = 0; i < args.maxRows; i++) {
        let row = values.find((row) => row[0] == i + 1);
        if (row !== undefined) {
            let fRow = [];
            for (let j = 0; j < args.headerMap.size; j++) {
                fRow.push(columnMap[j] > 0 ? row[columnMap[j]] as number : 0);
            }
            formatted.push(fRow);
        } else {
            formatted.push(emptyRow)
        }
    }

    return formatted;
}

async function hashTable(header: number[], table: any) {
    const poseidon = await buildPoseidon();
    let flatTable = [].concat.apply(header, table);
    let preImage = flatTable.reduce((sum, x) => sum + x, 0);
    return poseidon.F.toObject(poseidon([preImage]));
}
