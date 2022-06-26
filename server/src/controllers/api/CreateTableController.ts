import {Controller} from "@tsed/di";
import {Get, Post} from "@tsed/schema";
import {BodyParams} from "@tsed/platform-params";
import {createTable, db, Table, writeDB} from "../../engine/database";
import {CircuitParams} from "../../engine/parser";
import {
    getSqlOpcode,
    pendingRequests,
    pendingTablesToCreate,
    provider,
    zkSqlContract
} from "../../engine/chainListener";
import {backOff} from "exponential-backoff";
import {Mutex} from 'async-mutex';
import ZkSQL from "../../../artifacts/contracts/zkSQL.sol/ZkSQL.json";
import {ZkSQL as IZkSQL} from "../../../typechain-types";
import {Contract, providers} from "ethers";


export type CreateTableRequest = {
    commit: string,
    table: Table,
}

const circuitParams: CircuitParams = {
    maxAND: 5, maxOR: 2, maxRows: 10,
}


@Controller("/create")
export class CreateTableController {
    @Post()
    async updatePayload(@BodyParams() payload: CreateTableRequest): Promise<{}> {
        const commit = BigInt(payload.commit);
        await backOff(async () => {
            if (!pendingTablesToCreate.has(commit)) {
                throw Error("unknown request, commit to on-chain");
            }
        });

        createTable(payload.table);

        return {
            ok: true
        };
    }
}
