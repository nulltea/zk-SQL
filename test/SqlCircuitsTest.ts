import {assert} from "chai";

const wasm_tester = require("circom_tester").wasm;
const ff = require("ffjavascript");
const buildPoseidon = require("circomlibjs").buildPoseidon;
exports.p = ff.Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new ff.F1Field(exports.p);
const {plonk} = require("snarkjs");
import {ParserArgs, parseSelect, parseInsert, parseUpdate, parseDelete} from "../src/parser"
import initSqlJs, {Database, SqlJsStatic} from "sql.js";
import {execSqlQuery} from "../src/engine";

describe("zk-SQL - Circuits", () => {
    let selectCircuit: any;
    let insertCircuit: any;
    let updateCircuit: any;
    let deleteCircuit: any;
    let db: Database;
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
        maxAND: 5, maxOR: 2, maxRows: 5,
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

        let SQL = await initSqlJs({
            locateFile: _ => `./node_modules/sql.js/dist/sql-wasm.wasm`
        });

        db = new SQL.Database();
        db.run("CREATE TABLE table1 (id INTEGER PRIMARY KEY AUTOINCREMENT, f1 int, f2 int, f3 int, f4 int, f5 int)");
        table.forEach((row) => {
            db.run(`INSERT INTO table1 (f1, f2, f3, f4, f5) VALUES (${row.join(", ")})`);
        });
    });

    it("SELECT * FROM table1 WHERE f2 = 4", async () => {
        const INPUT = await execSqlQuery(db, "SELECT * FROM table1 WHERE f2 = 4", parserArgs);
        const witness = await selectCircuit.calculateWitness(INPUT, true);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
    });

    it("SELECT f2, f3, f4 FROM table1 WHERE f2 = 4 AND f4 = 8", async () => {
        const INPUT = await execSqlQuery(db, "SELECT f2, f3, f4 FROM table1 WHERE f2 = 4 AND f4 = 8", parserArgs);
        const witness = await selectCircuit.calculateWitness(INPUT, true);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
    });

    it("SELECT * FROM table1 WHERE (f2 = 4 AND f4 = 8) OR (f4 = 4)", async () => {
        const INPUT = await execSqlQuery(db, "SELECT * FROM table1 WHERE (f2 = 4 AND f4 = 8) OR (f4 = 4)", parserArgs);
        const witness = await selectCircuit.calculateWitness(INPUT, true);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
    });

    it("SELECT * FROM table1", async () => {
        const INPUT = await execSqlQuery(db, "SELECT * FROM table1", parserArgs);
        const witness = await selectCircuit.calculateWitness(INPUT, true);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
    });

    it("INSERT INTO table1 VALUES (1, 2, 3, 4, 5)", async () => {
        const INPUT = await execSqlQuery(db, "INSERT INTO table1 VALUES (1, 2, 3, 4, 5)", parserArgs);
        const witness = await insertCircuit.calculateWitness(INPUT, true);

        const resultTable = table.concat([1, 2, 3, 4, 5]);
        const newTableHash = await hashTable(header, resultTable);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
        assert(Fr.eq(Fr.e(witness[1]),Fr.e(newTableHash)), "must produce same hash");
    });

    it("UPDATE table1 SET f1=8, f3=8, f4=8, f5=8 WHERE f2 = 4", async () => {
        const INPUT = await execSqlQuery(db, "UPDATE table1 SET f1=8, f3=8, f4=8, f5=8 WHERE f2 = 4", parserArgs);
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
        const INPUT = await execSqlQuery(db, "DELETE FROM table1 WHERE f2 = 4", parserArgs);
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


