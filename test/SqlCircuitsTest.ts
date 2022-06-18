import {assert} from "chai";

const wasm_tester = require("circom_tester").wasm;
const ff = require("ffjavascript");
const buildPoseidon = require("circomlibjs").buildPoseidon;
exports.p = ff.Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new ff.F1Field(exports.p);

import {ParserArgs, parseSelect, parseDelete} from "../utils/parser"

describe("zk-SQL", () => {
    let selectCircuit: any;
    let insertCircuit: any;
    let updateCircuit: any;
    let deleteCircuit: any;
    // List of valid words to assert during circuit compile, must be agreed before game.
    const header = [1, 2, 3, 4, 5];
    const table = [
        [1, 4, 3, 4, 3],
        [2, 3, 4, 3, 8],
        [3, 4, 5, 8, 4],
        [4, 5, 6, 7, 2],
        [5, 4, 7, 8, 9],
    ];
    const parserArgs: ParserArgs = {
        maxAND: 5, maxOR: 2,
        headerMap: new Map<string, number>([
            ["f1", 1], ["f2", 2], ["f3", 3], ["f4", 4], ["f5", 5],
        ])
    }
    const tableHash: bigint = 6192063684007625405622444875231245009508356906093894343979231563958794510376n;

    before(async () => {
        selectCircuit = await wasm_tester("circuits/select.circom");
        await selectCircuit.loadConstraints();

        insertCircuit = await wasm_tester("circuits/insert.circom");
        await insertCircuit.loadConstraints();

        updateCircuit = await wasm_tester("circuits/update.circom");
        await updateCircuit.loadConstraints();

        deleteCircuit = await wasm_tester("circuits/delete.circom")
        await deleteCircuit.loadConstraints();
    });

    it("SELECT * FROM table1 WHERE f2 = 4", async () => {
        const results = [
            [1, 4, 3, 4, 3],
            [0, 0, 0, 0, 0],
            [3, 4, 5, 8, 4],
            [0, 0, 0, 0, 0],
            [5, 4, 7, 8, 9],
        ]

        const parsed = parseSelect("SELECT * FROM table1 WHERE f2 = 4", parserArgs);

        const INPUT = {
            header: header,
            table: table,
            tableCommit: tableHash,
            fields: parsed.fields,
            whereConditions: parsed.whereConditions,
            results: results,
        };

        const witness = await selectCircuit.calculateWitness(INPUT, true);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
    });

    it("SELECT f2, f3, f4 FROM table1 WHERE f2 = 4 AND f4 = 8", async () => {
        const results = [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 4, 5, 8, 0],
            [0, 0, 0, 0, 0],
            [0, 4, 7, 8, 0],
        ]

        const parsed = parseSelect("SELECT f2, f3, f4 FROM table1 WHERE f2 = 4 AND f4 = 8", parserArgs);

        const INPUT = {
            header: header,
            table: table,
            tableCommit: tableHash,
            fields: parsed.fields,
            whereConditions: parsed.whereConditions,
            results: results,
        };

        const witness = await selectCircuit.calculateWitness(INPUT, true);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
    });

    it("SELECT * FROM table1 WHERE (f2 = 4 AND f4 = 8) OR (f4 = 4)", async () => {
        const results = [
            [1, 4, 3, 4, 3],
            [0, 0, 0, 0, 0],
            [3, 4, 5, 8, 4],
            [0, 0, 0, 0, 0],
            [5, 4, 7, 8, 9],
        ];

        const parsed = parseSelect("SELECT * FROM table1 WHERE (f2 = 4 AND f4 = 8) OR (f4 = 4)", parserArgs);

        const INPUT = {
            header: header,
            table: table,
            tableCommit: tableHash,
            fields: parsed.fields,
            whereConditions: parsed.whereConditions,
            results: results,
        };

        const witness = await selectCircuit.calculateWitness(INPUT, true);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
    });

    it("SELECT * FROM table1", async () => {
        const results = [
            [1, 4, 3, 4, 3],
            [2, 3, 4, 3, 8],
            [3, 4, 5, 8, 4],
            [4, 5, 6, 7, 2],
            [5, 4, 7, 8, 9],
        ];

        const parsed = parseSelect("SELECT * FROM table1", parserArgs);

        const INPUT = {
            header: header,
            table: table,
            tableCommit: tableHash,
            fields: parsed.fields,
            whereConditions: parsed.whereConditions,
            results: results,
        };

        const witness = await selectCircuit.calculateWitness(INPUT, true);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
    });

    it("INSERT INTO table1 VALUES (...)", async () => {
        const INPUT = {
            header: header,
            table: table,
            tableCommit: tableHash,
            insertRow: [1, 2, 3, 4, 5],
        };
        const witness = await insertCircuit.calculateWitness(INPUT, true);

        const resultTable = table.concat([INPUT.insertRow]);
        const newTableHash = await hashTable(header, resultTable);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
        assert(Fr.eq(Fr.e(witness[1]),Fr.e(newTableHash)), "must produce same hash");
    });

    it("UPDATE table1 SET (...) WHERE '2' = 4", async () => {
        const INPUT = {
            header: header,
            table: table,
            tableCommit: tableHash,
            whereColumn: [0, 2, 0, 0, 0],
            whereValues: [0, 4, 0, 0, 0],
            setFields: [1, 0, 3, 4, 5],
            setValues: [8, 0, 8, 8, 8],
        };

        const witness = await updateCircuit.calculateWitness(INPUT, true);

        const results = [
            [8, 4, 8, 8, 8],
            [2, 3, 4, 3, 8],
            [8, 4, 8, 8, 8],
            [4, 5, 6, 7, 2],
            [8, 4, 8, 8, 8],
        ]
        let newTableHash = await hashTable(header, results);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
        assert(Fr.eq(Fr.e(witness[1]),Fr.e(newTableHash)), "must produce same hash");
    });

    it("DELETE FROM table1 WHERE f2 = 4", async () => {
        const parsed = parseDelete("DELETE FROM table1 WHERE f2 = 4", parserArgs);

        const INPUT = {
            header: header,
            table: table,
            tableCommit: tableHash,
            whereConditions: parsed.whereConditions
        };

        const witness = await deleteCircuit.calculateWitness(INPUT, true);

        const results = [
            [2, 3, 4, 3, 8],
            [4, 5, 6, 7, 2],
        ]
        let newTableHash = await hashTable(header, results);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
        assert(Fr.eq(Fr.e(witness[1]),Fr.e(newTableHash)), "must produce same hash");
    });
});

async function hashTable(header: number[], table: any) {
    const poseidon = await buildPoseidon();
    let flatTable = [].concat.apply(header, table);
    let preImage = flatTable.reduce((sum, x) => sum + x, 0);
    return poseidon.F.toObject(poseidon([preImage]));
}
