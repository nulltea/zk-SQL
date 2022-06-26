import {assert} from "chai";

const wasm_tester = require("circom_tester").wasm;
const ff = require("ffjavascript");
const buildPoseidon = require("circomlibjs").buildPoseidon;
exports.p = ff.Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new ff.F1Field(exports.p);
import {CircuitParams} from "../src/engine/parser"
import {commitToQuery, execQuery} from "../src/engine/engine";
import {db, initDB} from "../src/engine/database";
import {tableCommitments} from "../src/engine/chainListener";

describe("zk-SQL - Circuits", () => {
    let selectCircuit: any;
    let insertCircuit: any;
    let updateCircuit: any;
    let deleteCircuit: any;

    const header = [1, 2, 3, 4, 5];
    const table = [
        [1, 4, 3, 4, 3],
        [2, 3, 4, 3, 8],
        [3, 4, 5, 8, 4],
        [4, 5, 6, 7, 2],
        [5, 4, 7, 8, 9],
    ];
    const circuitParams: CircuitParams = {
        maxAND: 5, maxOR: 2, maxRows: 10,
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

        await initDB(false, {
            name: "table1",
            columns: ["f1", "f2", "f3", "f4", "f5"],
            values: [
                [1, 4, 3, 4, 3],
                [2, 3, 4, 3, 8],
                [3, 4, 5, 8, 4],
                [4, 5, 6, 7, 2],
                [5, 4, 7, 8, 9],
            ]
        });

        tableCommitments.set("table1", 6192063684007625405622444875231245009508356906093894343979231563958794510376n);
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

    it("SELECT * FROM table1", async () => {
        const res = await execQuery(db, "SELECT * FROM table1", 0n, circuitParams, false);
        const witness = await selectCircuit.calculateWitness(res.inputs, true);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
    });

    it("INSERT INTO table1 VALUES (1, 2, 3, 4, 5)", async () => {
        const query = "INSERT INTO table1 VALUES (1, 2, 3, 4, 5)";
        const {commit} = await commitToQuery(query, knownTables, circuitParams);
        const res = await execQuery(db, query, commit, circuitParams, false);
        const witness = await insertCircuit.calculateWitness(res.inputs, true);

        const resultTable = table.concat([1, 2, 3, 4, 5]);
        const newTableHash = await hashTable(header, resultTable);

        tableCommitments.set("table1", newTableHash);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
        assert(Fr.eq(Fr.e(witness[1]),Fr.e(newTableHash)), "must produce same hash");
    });

    it("UPDATE table1 SET f1=8, f3=8, f4=8, f5=8 WHERE f2 = 4", async () => {
        const query = "UPDATE table1 SET f1=8, f3=8, f4=8, f5=8 WHERE f2 = 4";
        const {commit} = await commitToQuery(query, knownTables, circuitParams);
        const res = await execQuery(db, query, commit, circuitParams, false);
        const witness = await updateCircuit.calculateWitness(res.inputs, true);

        const results = [
            [8, 4, 8, 8, 8],
            [2, 3, 4, 3, 8],
            [8, 4, 8, 8, 8],
            [4, 5, 6, 7, 2],
            [8, 4, 8, 8, 8],
            [1, 2, 3, 4, 5],
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
            [2, 3, 4, 3, 8],
            [4, 5, 6, 7, 2],
            [1, 2, 3, 4, 5],
        ]
        let newTableHash = await hashTable(header, results);
        tableCommitments.set("table1", newTableHash);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
        assert(Fr.eq(Fr.e(witness[1]),Fr.e(newTableHash)), "must produce same hash");
    });
});

async function hashTable(header: number[], table: any) {
    const poseidon = await buildPoseidon();
    let flatTable = [].concat.apply(header, table);
    let preImage = flatTable.reduce((sum: number, x: number) => sum + x, 0);
    return poseidon.F.toObject(poseidon([preImage]));
}


