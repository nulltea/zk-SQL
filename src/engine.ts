import {ParserArgs, parseSelect} from "./parser";
import {Parser} from "node-sql-parser/build/mysql";
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

const tableCommitments = new Map<string, bigint>([
    ["table1", 6192063684007625405622444875231245009508356906093894343979231563958794510376n]
])

export async function execSqlQuery(db: Database, query: string, args: ParserArgs): Promise<SelectCircuitInputs | any> {
    const parser = new Parser();
    let {ast} = parser.parse(query)

    if (!("type" in ast)) {
        throw Error("bad query");
    }

    const tableName = "from" in ast && ast.from !== null ? ast!.from[0].table : null;
    if (tableName == null) {
        throw Error("bad query: unknown table");
    }

    const tableState = db.exec(`SELECT ${Array.from(args.headerMap.keys()).join(",")} FROM ${tableName}`)[0];
    const tableHeader = tableState.columns.map((c) => args.headerMap.get(c));

    switch (ast.type) {
        case "select":
            const parsed = parseSelect(query, args);
            if (Array.isArray(ast.columns)) {
                ast.columns.unshift({expr: {type: "column_ref", table: null, column: "id"}, as: 'id'});
            }
            const selected = db.exec(parser.sqlify(ast))[0];
            const formattedView = formatTable(selected.columns, selected.values, args);

            return {
                header: tableHeader,
                table: tableState.values,
                tableCommit: tableCommitments.get(tableName),
                fields: parsed.fields,
                whereConditions: parsed.whereConditions,
                results: formattedView
            }
    }
}

function formatTable(columns: string[], values: SqlValue[][], args: ParserArgs): number[][] {
    let formatted = [];
    const emptyRow = [...Array(args.headerMap.size)].map(_ => 0);
    const columnMap = Array.from(args.headerMap.keys())
        .map((column) => columns.indexOf(column));

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
