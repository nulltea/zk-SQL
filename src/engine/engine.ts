import {parseDelete, parseInsert, ParserArgs, parseSelect, parseUpdate} from "./parser";
import {AST, Parser} from "node-sql-parser/build/mysql";
import {Database, SqlValue} from "sql.js";
import {ethers} from "ethers";
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

// this should be replaced by on-chain request
export const tableCommitments = new Map<string, bigint>()

export type SqlRow = {
    idx: number,
    values: SqlValue[]
}

type ExecResult = {
    data?: SqlRow[]
    proof?: any,
    solidityProof?: Uint8Array,
    publicInputs?: bigint[],
    inputs: SelectCircuitInputs | InsertCircuitInputs | UpdateCircuitInputs | DeleteCircuitInputs
}

export async function execQuery(db: Database, query: string, argsCommit: bigint, args: ParserArgs, prove: boolean): Promise<ExecResult>
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
    const formattedTable = formatForCircuit(tableState.columns, formatSqlValues(tableState.values), args);

    switch (ast.type) {
        case "select": {
            const parsed = parseSelect(ast, args);
            if (Array.isArray(ast.columns)) {
                ast.columns.unshift({expr: {type: "column_ref", table: null, column: "id"}, as: 'id'});
            }
            const selected = db.exec(parser.sqlify(ast))[0];
            selected.columns.shift();
            let formattedView = formatSqlValues(selected.values);
            const results = formatForCircuit(selected.columns, formattedView, args);

            const result: ExecResult = {
                data: formattedView,
                inputs: {
                    header: tableHeader,
                    table: formattedTable,
                    tableCommit: tableCommitments.get(tableName)!,
                    fields: parsed.fields,
                    whereConditions: parsed.whereConditions,
                    results
                }
            };

            if (prove) {
                const {proof, solidityProof, newTableCommit} = await unpackProof(plonk.fullProve(
                    result.inputs,
                    "circuits/build/select/select_js/select.wasm",
                    "circuits/build/select/circuit_final.zkey"
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
                inputs: {
                    header: tableHeader,
                    table: formattedTable,
                    tableCommit: tableCommitments.get(tableName)!,
                    insertValues: parsed.insertValues,
                    argsCommit: argsCommit,
                }
            };

            if (prove) {
                const {proof, solidityProof, newTableCommit} = await unpackProof(plonk.fullProve(
                    result.inputs,
                    "circuits/build/insert/insert_js/insert.wasm",
                    "circuits/build/insert/circuit_final.zkey"
                ));

                result.proof = proof;
                result.solidityProof = solidityProof;
                result.publicInputs = [newTableCommit, tableCommitments.get(tableName)!, argsCommit];
            }

            if (ast.columns === null) {
                ast.columns = Array.from(args.headerMap.keys());
            }
            db.run(parser.sqlify(ast));

            return result;
        }
        case "update": {
            const parsed = parseUpdate(ast, args);

            const result: ExecResult = {
                inputs: {
                    header: tableHeader,
                    table: formattedTable,
                    tableCommit: tableCommitments.get(tableName)!,
                    whereConditions: parsed.whereConditions,
                    setExpressions: parsed.setExpressions,
                    argsCommit: argsCommit,
                }
            };

            if (prove) {
                const {proof, solidityProof, newTableCommit} = await unpackProof(plonk.fullProve(
                    result.inputs,
                    "circuits/build/update/update_js/update.wasm",
                    "circuits/build/update/circuit_final.zkey"
                ));

                result.proof = proof;
                result.solidityProof = solidityProof;
                result.publicInputs = [newTableCommit, tableCommitments.get(tableName)!, argsCommit];
            }

            db.run(query);

            return result;
        }
        case "delete": {
            const parsed = parseDelete(ast, args);

            const result: ExecResult = {
                inputs: {
                    header: tableHeader,
                    table: formattedTable,
                    tableCommit: tableCommitments.get(tableName)!,
                    whereConditions: parsed.whereConditions,
                    argsCommit: argsCommit,
                }
            };

            if (prove) {
                const {proof, solidityProof, newTableCommit} = await unpackProof(plonk.fullProve(
                    result.inputs,
                    "circuits/build/delete/delete_js/delete.wasm",
                    "circuits/build/delete/circuit_final.zkey"
                ));

                result.proof = proof;
                result.solidityProof = solidityProof;
                result.publicInputs = [newTableCommit, tableCommitments.get(tableName)!, argsCommit];
            }

            db.run(query);

            return result;
        }
    }

    throw Error("unsupported query");
}

export async function commitToQuery(query: string, args: ParserArgs): Promise<{commit: bigint, table: string, type: string}>
{
    const parser = new Parser();
    let {ast} = parser.parse(query)

    if (!("type" in ast)) {
        throw Error("bad query");
    }

    const type = ast.type;

    const table = parseTableName(ast);
    if (table == null) {
        throw Error("bad query: unknown table");
    }

    const commit = await genArgsCommitment(ast, args);

    return {commit, table, type};
}

export async function genArgsCommitment(ast: AST, args: ParserArgs): Promise<bigint>
{
    if (!("type" in ast)) {
        throw Error("bad query");
    }

    const poseidon = await buildPoseidon();

    switch (ast.type) {
        case "select":
            return 0n;
        case "insert":
            const insertParsed = parseInsert(ast, args);
            return poseidon.F.toObject(poseidon(insertParsed.insertValues));
        case "update":
            const updParsed = parseUpdate(ast, args);
            let flatExpressions = updParsed.setExpressions.flat();
            flatExpressions = flatExpressions.concat(...updParsed.whereConditions.flat());
            let updPreImage = flatExpressions.reduce((sum, x) => sum + x, 0n);
            return poseidon.F.toObject(poseidon([updPreImage]));
        case "delete":
            const delParsed = parseDelete(ast, args);
            let delPreImage = delParsed.whereConditions.flat(2).reduce((sum, x) => sum + x, 0n);

            return poseidon.F.toObject(poseidon([delPreImage]));
    }

    throw Error("unsupported query");
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

export function formatForCircuit(columns: string[], values: SqlRow[], args: ParserArgs): bigint[][] {
    let formatted = [];
    const emptyRow = [...Array(args.headerMap.size)].map(_ => 0n);
    const columnMap = Array.from(args.headerMap.keys())
        .map((column) => columns.indexOf(column));

    for (let i = 0; i < args.maxRows; i++) {
        let row = values.find((row) => row.idx == i + 1);
        if (row !== undefined) {
            let fRow = [];
            for (let j = 0; j < args.headerMap.size; j++) {
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
