import ZkSQL from "../../artifacts/contracts/zkSQL.sol/ZkSQL.json";
import {Contract, providers} from "ethers";
import {ZkSQL as IZkSQL} from "../../typechain-types";
import {CircuitParams} from "../engine/parser";
import {commitToQuery} from "../engine/engine";
import {SqlResponse} from "../controllers/api";
import {genPublicSignals, verifyProof} from "../engine/verify";


export type ClientConfig = {
    serverAddress: string
    knownTables: Map<string, string[]>,
    circuitParams: CircuitParams,
    circuitsPath?: string
}

export async function postSqlRequest(sql: string, cfg: ClientConfig): Promise<bigint> {
    const provider = new providers.JsonRpcProvider(process.env.CHAIN_RPC)
    const contract = new Contract(process.env.ZK_SQL_CONTRACT!, ZkSQL.abi)
    const contractOwner = contract.connect(provider) as IZkSQL;
    const {commit, table, type} = await commitToQuery(sql, cfg.knownTables, cfg.circuitParams);
    const tableCommit = (await contractOwner.tableCommitments(table)).toBigInt();
    // if (type != "select") {
    //     await contractOwner.request(table, commit);
    // }

    const tableColumns = cfg.knownTables.get(table);
    if (tableColumns === undefined) {
        throw Error("unknown table");
    }
    const tableHeader = new Map<string, number>(tableColumns.map((c) => [c, tableColumns.indexOf(c)+1]));

    const res = await fetch(`${cfg.serverAddress}/api/request`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sql: sql,
            commit: commit,
        }, (_, v) => typeof v === 'bigint' ? v.toString() : v),
    });

    if (!res.ok) {
        throw Error(res.statusText);
    }

    // let publicSignals = genPublicSignals(
    //     sql,
    //     commit,
    //     tableHeader,
    //     cfg.circuitParams,
    //     tableCommit,
    //     respBody.selected != null ? respBody.selected.values : respBody.changeCommit
    // );

    return commit;
}


export async function getSqlRequest(token: bigint, cfg: ClientConfig): Promise<SqlResponse | null> {
    const res = await fetch(`${cfg.serverAddress}/api/query/${token}`);

    if (!res.ok) {
        throw Error(res.statusText);
    }

    let respBody: SqlResponse = await res.json();

    if (respBody.error != null) {
        throw Error(respBody.error);
    }

    return respBody;
}
