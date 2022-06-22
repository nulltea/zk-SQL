import {assert} from "chai";
// @ts-ignore
import { ethers } from "hardhat";
const {plonk} = require("snarkjs");
import {ParserArgs} from "../src/engine/parser"
import initSqlJs, {Database} from "sql.js";
import {genArgsCommitment, execQuery, tableCommitments, commitToQuery} from "../src/engine/engine";
import {ZkSQL, } from "../typechain-types/zkSQL.sol";
import {PlonkVerifier as InsertVerifier} from "../typechain-types/insertVerifier.sol";
import {PlonkVerifier as UpdateVerifier} from "../typechain-types/updateVerifier.sol";
import {PlonkVerifier as DeleteVerifier} from "../typechain-types/deleteVerifier.sol";
import {db, initDB} from "../src/engine/database";

describe("zk-SQL - Contracts", () => {
    let insertVerifier: InsertVerifier;
    let updateVerifier: UpdateVerifier;
    let deleteVerifier: DeleteVerifier;
    let zkSQL: ZkSQL;

    const parserArgs: ParserArgs = {
        maxAND: 5, maxOR: 2, maxRows: 5,
        headerMap: new Map<string, number>([
            ["f1", 1], ["f2", 2], ["f3", 3], ["f4", 4], ["f5", 5],
        ])
    }

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

        await initDB({
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

    it("INSERT INTO table1 VALUES (1, 2, 3, 4, 5)", async () => {
        const query = "INSERT INTO table1 VALUES (1, 2, 3, 4, 5)";
        const {commit} = await commitToQuery(query, parserArgs);
        await zkSQL.request("table1", commit);

        const res = await execQuery(db, query, commit, parserArgs, true);
        const newTableCommit = res.publicInputs![0];

        await zkSQL.execRequest(0, commit, newTableCommit, res.proof!);
        assert((await zkSQL.tableCommitments("table1")).toBigInt() == newTableCommit, "Should update table commitment");
        tableCommitments.set("table1", newTableCommit);
        parserArgs.maxRows = 6;
    });

    it("UPDATE table1 SET f1=8, f3=8, f4=8, f5=8 WHERE f2 = 4", async () => {
        const query = "UPDATE table1 SET f1=8, f3=8, f4=8, f5=8 WHERE f2 = 4";
        const {commit} = await commitToQuery(query, parserArgs);
        await zkSQL.request("table1", commit);

        const res = await execQuery(db, query, commit, parserArgs, true);
        const newTableCommit = res.publicInputs![0];

        await zkSQL.execRequest(1, commit, newTableCommit, res.proof!);
        assert((await zkSQL.tableCommitments("table1")).toBigInt() == newTableCommit, "Should update table commitment");
        tableCommitments.set("table1", newTableCommit);
    });

    it("DELETE FROM table1 WHERE f2 = 4", async () => {
        const query = "DELETE FROM table1 WHERE f2 = 4";
        const {commit} = await commitToQuery(query, parserArgs);
        await zkSQL.request("table1", commit);

        const res = await execQuery(db, query, commit, parserArgs, true);
        const newTableCommit = res.publicInputs![0];

        await zkSQL.execRequest(2, commit, newTableCommit, res.proof!);
        assert((await zkSQL.tableCommitments("table1")).toBigInt() == newTableCommit, "Should update table commitment");
        tableCommitments.set("table1", newTableCommit);
    });
});
