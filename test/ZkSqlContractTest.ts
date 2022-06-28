import {assert} from "chai";
// @ts-ignore
import {ethers} from "hardhat";
import {CircuitParams} from "zk-sql/engine/parser"
import {execQuery, commitToQuery} from "zk-sql/engine/engine";
import {ZkSQL,} from "zk-sql/types/typechain";
import {PlonkVerifier as InsertVerifier} from "zk-sql/types/typechain/insertVerifier.sol";
import {PlonkVerifier as UpdateVerifier} from "zk-sql/types/typechain/updateVerifier.sol";
import {PlonkVerifier as DeleteVerifier} from "zk-sql/types/typechain/deleteVerifier.sol";
import {db, initDB, Table} from "zk-sql/engine/database";
import {tableCommitments} from "zk-sql/engine/chainListener";
import {hashTable} from "../lib/engine/hasher";

describe("zk-SQL - Contracts", () => {
    let insertVerifier: InsertVerifier;
    let updateVerifier: UpdateVerifier;
    let deleteVerifier: DeleteVerifier;
    let zkSQL: ZkSQL;

    const circuitParams: CircuitParams = {
        maxAND: 5, maxOR: 2, maxRows: 10, maxCols: 5,
        artifactsPath: "./lib/circuits"
    }
    const knownTables = new Map<string, string[]>([
        ["table1", ["f1", "f2", "f3", "f4", "f5"]],
    ]);

    before(async () => {
        let insertFactory = await ethers.getContractFactory("contracts/insertVerifier.sol:PlonkVerifier");
        insertVerifier = await insertFactory.deploy() as InsertVerifier;
        await insertVerifier.deployed();

        let updateFactory = await ethers.getContractFactory("contracts/updateVerifier.sol:PlonkVerifier");
        updateVerifier = await updateFactory.deploy() as UpdateVerifier;
        await updateVerifier.deployed();

        let deleteFactory = await ethers.getContractFactory("contracts/deleteVerifier.sol:PlonkVerifier");
        deleteVerifier = await deleteFactory.deploy() as DeleteVerifier;
        await deleteVerifier.deployed();

        let zkSqlFactory = await ethers.getContractFactory("contracts/zkSQL.sol:ZkSQL");
        zkSQL = await zkSqlFactory.deploy(insertVerifier.address, updateVerifier.address, deleteVerifier.address) as ZkSQL;
        await zkSQL.deployed();

        const table = {
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

        const tableHash = await hashTable(header, table.values);
        await zkSQL.createTable(table.name, tableHash)
        await initDB(false, table);
        tableCommitments.set("table1", tableHash);
    });

    it("INSERT INTO table1 VALUES (1, 2, 3, 4, 'new value')", async () => {
        const query = "INSERT INTO table1 VALUES (1, 2, 3, 4, 'new value')";
        const {commit} = await commitToQuery(query, knownTables, circuitParams);
        await zkSQL.request("table1", commit);

        const res = await execQuery(db, query, commit, circuitParams, true);
        const newTableCommit = res.publicInputs![0];

        await zkSQL.execRequest(0, commit, newTableCommit, res.solidityProof!);
        assert((await zkSQL.tableCommitments("table1")).toBigInt() == newTableCommit, "Should update table commitment");
        tableCommitments.set("table1", newTableCommit);
    });

    it("UPDATE table1 SET f1=8, f3=8, f4=8, f5='cooler value' WHERE f2 = 4", async () => {
        const query = "UPDATE table1 SET f1=8, f3=8, f4=8, f5='cooler value' WHERE f2 = 4";
        const {commit} = await commitToQuery(query, knownTables, circuitParams);
        await zkSQL.request("table1", commit);

        const res = await execQuery(db, query, commit, circuitParams, true);
        const newTableCommit = res.publicInputs![0];

        await zkSQL.execRequest(1, commit, newTableCommit, res.solidityProof!);
        assert((await zkSQL.tableCommitments("table1")).toBigInt() == newTableCommit, "Should update table commitment");
        tableCommitments.set("table1", newTableCommit);
    });

    it("DELETE FROM table1 WHERE f2 = 4", async () => {
        const query = "DELETE FROM table1 WHERE f2 = 4";
        const {commit} = await commitToQuery(query, knownTables, circuitParams);
        await zkSQL.request("table1", commit);

        const res = await execQuery(db, query, commit, circuitParams, true);
        const newTableCommit = res.publicInputs![0];

        await zkSQL.execRequest(2, commit, newTableCommit, res.solidityProof!);
        assert((await zkSQL.tableCommitments("table1")).toBigInt() == newTableCommit, "Should update table commitment");
        tableCommitments.set("table1", newTableCommit);
    });
});
