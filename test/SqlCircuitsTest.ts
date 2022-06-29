import {assert} from "chai";

const wasm_tester = require("circom_tester").wasm;
const ff = require("ffjavascript");
exports.p = ff.Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new ff.F1Field(exports.p);
import {CircuitParams} from "zk-sql/engine/parser"
import {commitToQuery, execQuery} from "zk-sql/engine/engine";
import {db, initDB, Table} from "zk-sql/engine/database";
import {tableCommitments} from "zk-sql/engine/chainListener";
import {hashTable} from "../lib/engine/hasher";

describe("zk-SQL - Circuits", () => {
    let selectCircuit: any;
    let insertCircuit: any;
    let updateCircuit: any;
    let deleteCircuit: any;

    const table: Table = {
        name: "table1",
        columns: [
            {name: "f1", type: "int"},
            {name: "f2", type: "int"},
            {name: "f3", type: "int"},
            {name: "f4", type: "int"},
            {name: "f5", type: "string"},
        ],
        values: [
            [1, 4, 3, 4, "hello world"],
            [2, 3, 4, 3, "JS is fine"],
            [3, 4, 5, 8, "Rust is cool"],
            [4, 5, 6, 7, "test1"],
            [5, 4, 7, 8, "test2"],
        ]
    };
    const header = table.columns.map(c => c.name);
    const circuitParams: CircuitParams = {
        maxAND: 5, maxOR: 2, maxRows: 10, maxCols: 5,
        artifactsPath: "./lib/artifacts/circuits"
    }
    const knownTables = new Map<string, string[]>([
        ["table1", ["f1", "f2", "f3", "f4", "f5"]],
    ]);

    before(async () => {
        selectCircuit = await wasm_tester("circuits/select.circom");
        await selectCircuit.loadConstraints();

        insertCircuit = await wasm_tester("circuits/insert.circom");
        await insertCircuit.loadConstraints();

        updateCircuit = await wasm_tester("circuits/update.circom");
        await updateCircuit.loadConstraints();

        deleteCircuit = await wasm_tester("circuits/delete.circom")
        await deleteCircuit.loadConstraints();

        await initDB(false, table);
        tableCommitments.set("table1", await hashTable(header, table.values));
    });

    it("SELECT * FROM table1 WHERE f2 = 4", async () => {
        const res = await execQuery(db, "SELECT * FROM table1 WHERE f2 = 4", 0n, circuitParams, false);
        const witness = await selectCircuit.calculateWitness(res.inputs, true);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
    });

    it("SELECT f2, f3, f4 FROM table1 WHERE f2 = 4 AND f4 = 8", async () => {
        const res = await execQuery(db, "SELECT f2, f3, f4 FROM table1 WHERE f2 = 4 AND f4 = 8", 0n, circuitParams, false);
        const witness = await selectCircuit.calculateWitness(res.inputs, true);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
    });

    it("SELECT * FROM table1 WHERE (f2 = 4 AND f4 = 8) OR (f4 = 4)", async () => {
        const res = await execQuery(db, "SELECT * FROM table1 WHERE (f2 = 4 AND f4 = 8) OR (f4 = 4)", 0n, circuitParams, false);
        const witness = await selectCircuit.calculateWitness(res.inputs, true);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
    });

    it("SELECT * FROM table1 WHERE f2 != 4", async () => {
        const res = await execQuery(db, "SELECT * FROM table1 WHERE f2 != 4", 0n, circuitParams, false);
        const witness = await selectCircuit.calculateWitness(res.inputs, true);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
    });

    it("SELECT * FROM table1 WHERE f2 < 4", async () => {
        const res = await execQuery(db, "SELECT * FROM table1 WHERE f2 < 4", 0n, circuitParams, false);
        const witness = await selectCircuit.calculateWitness(res.inputs, true);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
    });

    it("SELECT * FROM table1 WHERE f2 > 3", async () => {
        const res = await execQuery(db, "SELECT * FROM table1 WHERE f2 > 3", 0n, circuitParams, false);
        const witness = await selectCircuit.calculateWitness(res.inputs, true);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
    });

    it("SELECT * FROM table1 WHERE f2 <= 3", async () => {
        const res = await execQuery(db, "SELECT * FROM table1 WHERE f2 <= 4", 0n, circuitParams, false);
        const witness = await selectCircuit.calculateWitness(res.inputs, true);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
    });

    it("SELECT * FROM table1 WHERE f2 >= 5", async () => {
        const res = await execQuery(db, "SELECT * FROM table1 WHERE f2 >= 5", 0n, circuitParams, false);
        const witness = await selectCircuit.calculateWitness(res.inputs, true);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
    });

    it("SELECT * FROM table1", async () => {
        const res = await execQuery(db, "SELECT * FROM table1", 0n, circuitParams, false);
        const witness = await selectCircuit.calculateWitness(res.inputs, true);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
    });

    it("INSERT INTO table1 VALUES (1, 2, 3, 4, 'new value')", async () => {
        const query = "INSERT INTO table1 VALUES (1, 2, 3, 4, 'new value')";
        const {commit} = await commitToQuery(query, knownTables, circuitParams);
        const res = await execQuery(db, query, commit, circuitParams, false);
        const witness = await insertCircuit.calculateWitness(res.inputs, true);

        table.values.push([1, 2, 3, 4, "new value"]);
        const newTableHash = await hashTable(header, table.values);

        tableCommitments.set("table1", newTableHash);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
        assert(Fr.eq(Fr.e(witness[1]),Fr.e(newTableHash)), "must produce same hash");
    });

    it("UPDATE table1 SET f1=8, f3=8, f4=8, f5='cooler value' WHERE f2 = 4", async () => {
        const query = "UPDATE table1 SET f1=8, f3=8, f4=8, f5='cooler value' WHERE f2 = 4";
        const {commit} = await commitToQuery(query, knownTables, circuitParams);
        const res = await execQuery(db, query, commit, circuitParams, false);
        const witness = await updateCircuit.calculateWitness(res.inputs, true);

        const results = [
            [8, 4, 8, 8, "cooler value"],
            [2, 3, 4, 3, "JS is fine"],
            [8, 4, 8, 8, "cooler value"],
            [4, 5, 6, 7, "test1"],
            [8, 4, 8, 8, "cooler value"],
            [1, 2, 3, 4, "new value"],
        ]
        let newTableHash = await hashTable(header, results);
        tableCommitments.set("table1", newTableHash);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
        assert(Fr.eq(Fr.e(witness[1]),Fr.e(newTableHash)), "must produce same hash");
    });

    it("DELETE FROM table1 WHERE f2 = 4", async () => {
        const query = "DELETE FROM table1 WHERE f2 = 4";
        const {commit} = await commitToQuery(query, knownTables, circuitParams);
        const res = await execQuery(db, query, commit, circuitParams, false);
        const witness = await deleteCircuit.calculateWitness(res.inputs, true);

        const results = [
            [2, 3, 4, 3, "JS is fine"],
            [4, 5, 6, 7, "test1"],
            [1, 2, 3, 4, "new value"],
        ]
        let newTableHash = await hashTable(header, results);
        tableCommitments.set("table1", newTableHash);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
        assert(Fr.eq(Fr.e(witness[1]),Fr.e(newTableHash)), "must produce same hash");
    });
});



