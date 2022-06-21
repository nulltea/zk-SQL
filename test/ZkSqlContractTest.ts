import {assert} from "chai";
import { ethers } from "hardhat";
const {plonk} = require("snarkjs");
import {ParserArgs, parseSelect, parseInsert, parseUpdate, parseDelete} from "../src/parser"
import initSqlJs, {Database, SqlJsStatic} from "sql.js";
import {commitToQuery, execSqlQuery, tableCommitments} from "../src/engine";
import {ZkSQL, } from "../typechain-types/zkSQL.sol";
import {PlonkVerifier as InsertVerifier} from "../typechain-types/insertVerifier.sol";
import {PlonkVerifier as UpdateVerifier} from "../typechain-types/updateVerifier.sol";
import {PlonkVerifier as DeleteVerifier} from "../typechain-types/deleteVerifier.sol";


describe("zk-SQL - Contracts", () => {
    let insertVerifier: InsertVerifier;
    let updateVerifier: UpdateVerifier;
    let deleteVerifier: DeleteVerifier;
    let zkSQL: ZkSQL;
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

        let SQL = await initSqlJs({
            locateFile: _ => `./node_modules/sql.js/dist/sql-wasm.wasm`
        });

        db = new SQL.Database();
        db.run("CREATE TABLE table1 (id INTEGER PRIMARY KEY AUTOINCREMENT, f1 int, f2 int, f3 int, f4 int, f5 int)");
        table.forEach((row) => {
            db.run(`INSERT INTO table1 (f1, f2, f3, f4, f5) VALUES (${row.join(", ")})`);
        });
    });

    it("INSERT INTO table1 VALUES (1, 2, 3, 4, 5)", async () => {
        const query = "INSERT INTO table1 (f1, f2, f3, f4, f5) VALUES (1, 2, 3, 4, 5)";
        const argsCommit = await commitToQuery(query, parserArgs);
        await zkSQL.request("table1", argsCommit);

        const INPUT = await execSqlQuery(db, query, parserArgs);
        const { proof, newTableCommit } = await unpackProof(plonk.fullProve(
            INPUT,
            "circuits/build/insert/insert_js/insert.wasm",
            "circuits/build/insert/circuit_final.zkey"
        ));

        await zkSQL.execRequest(0, argsCommit, newTableCommit, proof);
        assert((await zkSQL.tableCommitments("table1")).toBigInt() == newTableCommit, "Should update table commitment");
        tableCommitments.set("table1", newTableCommit);
        parserArgs.maxRows = 6;
    });

    it("UPDATE table1 SET f1=8, f3=8, f4=8, f5=8 WHERE f2 = 4", async () => {
        const query = "UPDATE table1 SET f1=8, f3=8, f4=8, f5=8 WHERE f2 = 4";
        const argsCommit = await commitToQuery(query, parserArgs);
        await zkSQL.request("table1", argsCommit);

        const INPUT = await execSqlQuery(db, query, parserArgs);
        const { proof, newTableCommit } = await unpackProof(plonk.fullProve(
            INPUT,
            "circuits/build/update/update_js/update.wasm",
            "circuits/build/update/circuit_final.zkey"
        ));

        await zkSQL.execRequest(1, argsCommit, newTableCommit, proof);
        assert((await zkSQL.tableCommitments("table1")).toBigInt() == newTableCommit, "Should update table commitment");
        tableCommitments.set("table1", newTableCommit);
    });

    it("DELETE FROM table1 WHERE f2 = 4", async () => {
        const query = "DELETE FROM table1 WHERE f2 = 4";
        const argsCommit = await commitToQuery(query, parserArgs);
        await zkSQL.request("table1", argsCommit);

        const INPUT = await execSqlQuery(db, query, parserArgs);
        const { proof, newTableCommit } = await unpackProof(plonk.fullProve(
            INPUT,
            "circuits/build/delete/delete_js/delete.wasm",
            "circuits/build/delete/circuit_final.zkey"
        ));

        await zkSQL.execRequest(2, argsCommit, newTableCommit, proof);
        assert((await zkSQL.tableCommitments("table1")).toBigInt() == newTableCommit, "Should update table commitment");
        tableCommitments.set("table1", newTableCommit);
    });
});

async function unpackProof(raw: Promise<any>): Promise<{proof: Uint8Array, newTableCommit: bigint}> {
    let { proof, publicSignals } = await raw;

    const editedPublicSignals = unstringifyBigInts(publicSignals);
    const editedProof = unstringifyBigInts(proof);
    const calldata = await plonk.exportSolidityCallData(editedProof, editedPublicSignals);
    const argv = calldata.replace(/["[\]\s]/g, "").split(',').map((x: string) => BigInt(x));

    proof = ethers.utils.arrayify(ethers.utils.hexlify(argv[0]));
    let newTableCommit: bigint = argv[1];

    return {proof, newTableCommit}
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

