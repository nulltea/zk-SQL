import {CircuitParams, parseSelect} from "./parser";
import {Parser} from "node-sql-parser/build/mysql";
import {formatForCircuit, parseTableName, tableCommitments} from "./engine";
import * as fs from "fs";

const {plonk} = require("snarkjs");

export function verifyProof(type: string, publicInputs: bigint[], proof: Uint8Array): Promise<any> {
    const vKey = JSON.parse(fs.readFileSync(`circuits/build/${type}/verification_key.json`).toString());
    return plonk.verify(vKey, publicInputs, proof);
}

export function genPublicSignals(query: string, argsCommit: bigint, header: Map<string, number>, args: CircuitParams, tableCommit: bigint, ...inputs: any[]): bigint[]
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

    switch (ast.type) {
        case "select": {
            const parsed = parseSelect(ast, header, args);
            const data = formatForCircuit(parsed.columns, inputs[0], header, args);
            return [tableCommit].concat(parsed.fields).concat(parsed.whereConditions.flat(3)).concat(data.flat(2));
        }
        case "insert":
        case "update":
        case "delete":
            return [BigInt(inputs[0]), tableCommit, argsCommit];
    }

    throw Error("unsupported query");
}
