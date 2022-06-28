import {parseDelete, parseInsert, CircuitParams, parseSelect, parseUpdate} from "./parser";
import {AST, Parser} from "node-sql-parser/build/mysql";
import {Database, SqlValue} from "sql.js";
import {ethers} from "ethers";
import {tableCommitments} from "./chainListener";
import {commitToTable} from "../client/client";
const {plonk} = require("snarkjs");
const buildPoseidon = require("circomlibjs").buildPoseidon;

type SelectCircuitInputs = {
    header: number[],
    table: bigint[][],
    tableCommit: bigint,
    fields: bigint[],
    whereConditions: bigint[][][],
    results: bigint[][],
}

type InsertCircuitInputs = {
    header: number[],
    table: bigint[][],
    tableCommit: bigint,
    insertValues: bigint[],
    argsCommit: bigint,
}

type UpdateCircuitInputs = {
    header: number[],
    table: bigint[][],
    tableCommit: bigint,
    whereConditions: bigint[][][],
    setExpressions: bigint[][],
    argsCommit: bigint,
}

type DeleteCircuitInputs = {
    header: number[],
    table: bigint[][],
    tableCommit: bigint,
    whereConditions: bigint[][][],
    argsCommit: bigint,
}

export type SqlRow = {
    idx: number,
    values: SqlValue[]
}

type ExecResult = {
    tableName: string,
    selected?: {
        columns: string[],
        values: SqlRow[]
    }
    proof?: any,
    solidityProof?: Uint8Array,
    publicInputs?: bigint[],
    inputs: SelectCircuitInputs | InsertCircuitInputs | UpdateCircuitInputs | DeleteCircuitInputs
}

export async function execQuery(db: Database, query: string, argsCommit: bigint, args: CircuitParams, prove: boolean): Promise<ExecResult>
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

    const {headerMap, tableValues} = getTable(db, tableName, args);
    const tableColumns = Array.from(headerMap.keys());
    const tableColumnsCodes = Array.from(headerMap.values());

    [...Array(args.maxCols-tableColumnsCodes.length)].map(_ => tableColumnsCodes.push(0));

    const tableCommit = tableCommitments.get(tableName)!;

    console.log(tableCommit, await commitToTable(tableColumns));

    switch (ast.type) {
        case "select": {
            const parsed = parseSelect(ast, headerMap, args);
            if (Array.isArray(ast.columns)) {
                ast.columns.unshift({expr: {type: "column_ref", table: null, column: "id"}, as: 'id'});
            }
            const selected = db.exec(parser.sqlify(ast))[0] ?? {
                columns: ["id"].concat(tableColumns),
                values: []
            }
            selected.columns.shift();
            let formattedView = formatSqlValues(selected.values);
            const results = formatForCircuit(selected.columns, formattedView, headerMap, args);

            const result: ExecResult = {
                tableName,
                selected: {
                    columns: selected.columns,
                    values: formattedView,
                },
                inputs: {
                    header: tableColumnsCodes,
                    table: tableValues,
                    tableCommit,
                    fields: parsed.fields,
                    whereConditions: parsed.whereConditions,
                    results
                }
            };

            if (prove) {
                console.log(result.inputs);
                const {proof, solidityProof, newTableCommit} = await unpackProof(plonk.fullProve(
                    result.inputs,
                    "../lib/circuits/select/select_js/select.wasm",
                    "../lib/circuits/select/circuit_final.zkey"
                ));

                result.proof = proof;
                result.solidityProof = solidityProof;
                result.publicInputs = [newTableCommit];
            }



            return result;
        }
        case "insert": {
            const parsed = parseInsert(ast, args);

            const result: ExecResult = {
                tableName,
                inputs: {
                    header: tableColumnsCodes,
                    table: tableValues,
                    tableCommit,
                    insertValues: parsed.insertValues,
                    argsCommit: argsCommit,
                }
            };

            if (prove) {
                const {proof, solidityProof, newTableCommit} = await unpackProof(plonk.fullProve(
                    result.inputs,
                    "../lib/circuits/insert/insert_js/insert.wasm",
                    "../lib/circuits/insert/circuit_final.zkey"
                ));

                result.proof = proof;
                result.solidityProof = solidityProof;
                result.publicInputs = [newTableCommit, tableCommitments.get(tableName)!, argsCommit];
            }

            if (ast.columns === null) {
                ast.columns = Array.from(headerMap.keys());
            }

            db.run(parser.sqlify(ast));

            result.selected = selectTable(db, tableName);

            return result;
        }
        case "update": {
            const parsed = parseUpdate(ast, headerMap, args);

            const result: ExecResult = {
                tableName,
                inputs: {
                    header: tableColumnsCodes,
                    table: tableValues,
                    tableCommit,
                    whereConditions: parsed.whereConditions,
                    setExpressions: parsed.setExpressions,
                    argsCommit: argsCommit,
                }
            };

            if (prove) {
                const {proof, solidityProof, newTableCommit} = await unpackProof(plonk.fullProve(
                    result.inputs,
                    "../lib/circuits/update/update_js/update.wasm",
                    "../lib/circuits/update/circuit_final.zkey"
                ));

                result.proof = proof;
                result.solidityProof = solidityProof;
                result.publicInputs = [newTableCommit, tableCommitments.get(tableName)!, argsCommit];
            }

            db.run(query);

            result.selected = selectTable(db, tableName);

            return result;
        }
        case "delete": {
            const parsed = parseDelete(ast, headerMap, args);

            const result: ExecResult = {
                tableName,
                inputs: {
                    header: tableColumnsCodes,
                    table: tableValues,
                    tableCommit,
                    whereConditions: parsed.whereConditions,
                    argsCommit: argsCommit,
                }
            };

            if (prove) {
                const {proof, solidityProof, newTableCommit} = await unpackProof(plonk.fullProve(
                    result.inputs,
                    "../lib/circuits/delete/delete_js/delete.wasm",
                    "../lib/circuits/delete/circuit_final.zkey"
                ));

                result.proof = proof;
                result.solidityProof = solidityProof;
                result.publicInputs = [newTableCommit, tableCommitments.get(tableName)!, argsCommit];
            }

            db.run(query);

            result.selected = selectTable(db, tableName);

            return result;
        }
    }

    throw Error("unsupported query");
}

export async function commitToQuery(query: string, knownTables: Map<string, string[]>, args: CircuitParams): Promise<{commit: bigint, table: string, type: string}>
{
    const parser = new Parser();
    let {ast} = parser.parse(query)

    if (!("type" in ast)) {
        throw Error("bad query");
    }

    const type = ast.type;

    const tableName = parseTableName(ast);
    if (tableName == null) {
        throw Error("bad query: unknown table");
    }

    const tableColumns = knownTables.get(tableName);
    if (tableColumns === undefined) {
        throw Error("unknown table");
    }

    const header = new Map<string, number>(tableColumns.map((c) => [c, tableColumns.indexOf(c)+1]));
    const commit = await genArgsCommitment(ast, header, args);

    return {commit, table: tableName, type};
}

export async function genArgsCommitment(ast: AST, header: Map<string, number>, args: CircuitParams): Promise<bigint>
{
    if (!("type" in ast)) {
        throw Error("bad query");
    }

    const poseidon = await buildPoseidon();

    switch (ast.type) {
        case "select":
            return BigInt(0);
        case "insert":
            const insertParsed = parseInsert(ast, args);
            return poseidon.F.toObject(poseidon(insertParsed.insertValues));
        case "update":
            const updParsed = parseUpdate(ast, header, args);
            let flatExpressions = updParsed.setExpressions.flat();
            flatExpressions = flatExpressions.concat(...updParsed.whereConditions.flat());
            let updPreImage = flatExpressions.reduce((sum, x) => sum + x, 0n);
            return poseidon.F.toObject(poseidon([updPreImage]));
        case "delete":
            const delParsed = parseDelete(ast, header, args);
            let delPreImage = delParsed.whereConditions.flat(2).reduce((sum, x) => sum + x, 0n);

            return poseidon.F.toObject(poseidon([delPreImage]));
    }

    throw Error("unsupported query");
}

function selectTable(db: Database, tableName: string): {
    columns: string[],
    values: SqlRow[]
} {
    const selected = db.exec(`SELECT * FROM ${tableName}`)[0];
    selected.columns.shift();
    let formattedView = formatSqlValues(selected.values);

    return  {
        columns: selected.columns,
        values: formattedView,
    }
}

function getTable(db: Database, tableName: string, args: CircuitParams): {
    tableValues: bigint[][],
    headerMap: Map<string, number>
} {
    const columns = db.exec(`PRAGMA table_info(${tableName})`)[0].values.map((cref) => cref[1] as string);
    columns.shift();
    const tableState = db.exec(`SELECT * FROM ${tableName}`)[0];
    const headerMap = new Map<string, number>(columns.map((c) => [c, columns.indexOf(c)+1]));
    const tableValues = formatForCircuit(columns, formatSqlValues(tableState?.values ?? []), headerMap, args);
    return {
        tableValues,
        headerMap
    }
}

export function typeOfQuery(query: string): string {
    const parser = new Parser();
    let {ast} = parser.parse(query)

    if (!("type" in ast)) {
        throw Error("bad query");
    }

   return ast.type;
}

export function parseTableName(ast: AST): string {
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

export function formatForCircuit(columns: string[], values: SqlRow[], header: Map<string, number>, args: CircuitParams): bigint[][] {
    let formatted = [];
    const emptyRow = [...Array(args.maxCols)].map(_ => 0n);
    const columnMap = Array.from(header.keys())
        .map((column) => columns.indexOf(column));

    for (let i = 0; i < args.maxRows; i++) {
        let row = values.find((row) => row.idx == i + 1);
        if (row !== undefined) {
            let fRow = [];
            for (let j = 0; j < args.maxCols; j++) {
                fRow.push(columnMap[j] > -1 ? encodeSqlValue(row.values[columnMap[j]]) : 0n);
            }
            formatted.push(fRow);
        } else {
            formatted.push(emptyRow)
        }
    }

    return formatted;
}

function formatSqlValues(values: SqlValue[][]): SqlRow[] {
    let formatted = [];

    for (let row of values) {
        const idx = row[0] as number;
        formatted.push({idx, values: row.slice(1)});
    }

    return formatted;
}

function encodeSqlValue(v: SqlValue): bigint {
    return BigInt(v as number);
}

async function unpackProof(raw: Promise<any>): Promise<{proof: any, solidityProof: Uint8Array, newTableCommit: bigint}> {
    let { proof, publicSignals } = await raw;

    const editedPublicSignals = unstringifyBigInts(publicSignals);
    const editedProof = unstringifyBigInts(proof);
    const calldata = await plonk.exportSolidityCallData(editedProof, editedPublicSignals);
    const argv = calldata.replace(/["[\]\s]/g, "").split(',').map((x: string) => BigInt(x));

    const solidityProof = ethers.utils.arrayify(ethers.utils.hexlify(argv[0]));
    let newTableCommit: bigint = argv[1];

    return {proof, solidityProof, newTableCommit}
}

function unstringifyBigInts(o: any): any {
    if ((typeof(o) == "string") && (/^[0-9]+$/.test(o) ))  {
        return BigInt(o);
    } else if ((typeof(o) == "string") && (/^0x[0-9a-fA-F]+$/.test(o) ))  {
        return BigInt(o);
    } else if (Array.isArray(o)) {
        return o.map(unstringifyBigInts);
    } else if (typeof o == "object") {
        if (o===null) return null;
        let res: any = {};
        const keys = Object.keys(o);
        keys.forEach( (k) => {
            res[k] = unstringifyBigInts(o[k]);
        });
        return res;
    } else {
        return o;
    }
}
