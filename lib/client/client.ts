import ZkSQL from "../artifacts/contracts/zkSQL.sol/ZkSQL.json";
import {Contract, providers} from "ethers";
import {ZkSQL as IZkSQL} from "../types/typechain";
import {CircuitParams} from "../engine/parser";
import {commitToQuery, SqlRow} from "../engine/engine";
import {genPublicSignals} from "../engine/verify";
const buildPoseidon = require("circomlibjs").buildPoseidon;

export type ClientConfig = {
    serverAddress: string
    knownTables: Map<string, string[]>,
    circuitParams: CircuitParams,
    circuitsPath?: string
}

export type SqlQueryResult = {
    ready: boolean
    selected?: {
        columns: string[],
        values: SqlRow[]
    },
    changeCommit?: string
    proof?: any,
    error?: string
    publicSignals?: bigint[]
}

export type SqlRequestResponse = {
    error?: string,
    token?: string,
}

export async function postSqlRequest(sql: string, cfg: ClientConfig): Promise<SqlRequestResponse> {
    const {commit} = await commitToQuery(sql, cfg.knownTables, cfg.circuitParams);

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
        return {
            error: res.statusText
        }
    }

    return res.json();
}


export async function getSqlRequest(sql: string, token: string, cfg: ClientConfig): Promise<SqlQueryResult> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);

    let res;
    try {
        res = await fetch(`${cfg.serverAddress}/api/query/${token}`, {
            signal: controller.signal
        });
    } catch (e) {
        return {
            ready: false,
        }
    }


    clearTimeout(id);

    if (!res.ok) {
        return {
            ready: true,
            error: res.statusText
        }
    }

    let result: SqlQueryResult = await res.json();

    if (!result.ready) {
        return {
            ready: false,
        }
    }

    const {commit, table, type} = await commitToQuery(sql, cfg.knownTables, cfg.circuitParams);

    const tableColumns = cfg.knownTables.get(table);
    if (tableColumns === undefined) {
        throw Error("unknown table");
    }

    const provider = new providers.JsonRpcProvider(process.env.CHAIN_RPC)
    const contract = new Contract(process.env.ZK_SQL_CONTRACT!, ZkSQL.abi)
    const contractOwner = contract.connect(provider) as unknown as IZkSQL;

    const tableHeader = new Map<string, number>(tableColumns.map((c) => [c, tableColumns.indexOf(c)+1]));
    const tableCommit = (await contractOwner.tableCommitments(table)).toBigInt();

    result.publicSignals = genPublicSignals(
        sql,
        commit,
        tableHeader,
        cfg.circuitParams,
        tableCommit,
        type == "select" ? result.selected!.values : result.changeCommit
    );

    return result;
}


export async function commitToTable(columns: string[]): Promise<bigint> {
    let columnCodes = columns.map((c) => BigInt(columns.indexOf(c)+1))
    let poseidon = await buildPoseidon();
    let preimage = columnCodes.reduce((sum, x) => sum + x, 0n);
    return poseidon.F.toObject(poseidon([preimage]));
}
