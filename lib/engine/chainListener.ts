import {BigNumber, Contract, providers, utils, Wallet} from "ethers";
import ZkSQL from "../artifacts/contracts/zkSQL.sol/ZkSQL.json";
import {ZkSQL as IZkSQL} from "../types/typechain";
import {Provider} from "@ethersproject/providers";
import {db, discoverTables, knownTables} from "./database";

export let provider: any;
export let zkSqlContract: IZkSQL;
export const pendingRequests = new Map<bigint, string>();
export const pendingTablesToCreate = new Map<bigint, string>();
export let tableCommitments = new Map<string, bigint>();

export async function listenToChain(address: string) {
    provider = new providers.JsonRpcProvider(process.env.CHAIN_RPC);
    const wallet = new Wallet(process.env.HARMONY_PRIVATE_KEY!, provider);
    const contract = new Contract(address, ZkSQL.abi);

    zkSqlContract = contract.connect(provider.getSigner()) as IZkSQL;

    tableCommitments = await requestAllTables(provider);
    discoverTables(db, Array.from(tableCommitments.keys()));

    console.log("tableCommitments:", tableCommitments);
    console.log("knownTables:", knownTables);

    zkSqlContract.on("RequestPosted", (address: any, argsCommitment: BigNumber) => {
        pendingRequests.set(argsCommitment.toBigInt(), "");
        console.log("new pending request", argsCommitment.toBigInt());
    });

    zkSqlContract.on("TableUpdated", (table: string, newCommitment: BigNumber) => {
        tableCommitments.set(table, newCommitment.toBigInt());
        console.log(table, "table updated", newCommitment.toBigInt());
    });

    zkSqlContract.on("TableCreated", (table: string, commitment: BigNumber) => {
        pendingTablesToCreate.set(commitment.toBigInt(), table);
        console.log(table, "table created", commitment.toBigInt());
    });

    console.log("started listening...");
}

export function getSqlOpcode(type: string): number {
    switch (type) {
        case "insert":
            return 0;
        case "update":
            return 1;
        case "delete":
            return 2;
    }

    throw Error("unknown operation");
}

export async function requestAllTables(provider: Provider): Promise<Map<string, bigint>> {
    let tablesMap = new Map<string, bigint>();
    const contract = new Contract(process.env.ZK_SQL_CONTRACT!, ZkSQL.abi);
    let filter = contract.filters.TableCreated();
    let eventIFace = new utils.Interface(["event TableCreated(string table, uint256 commitment)"]);
    let tables = await provider.getLogs({
        address: filter.address,
        fromBlock: Number(process.env.DEPLOYMENT_BLOCK!),
        toBlock: "latest",
        topics: filter.topics
    }).then((logs) => logs.map((log) => {
        let args = eventIFace.parseLog(log).args;
        return args.table;
    }));

    for (let table of tables) {
        const commitNumber = await zkSqlContract.tableCommitments(table);
        tablesMap.set(table, commitNumber.toBigInt());
    }

    return tablesMap;
}
