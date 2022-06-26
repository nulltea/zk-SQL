import {Controller} from "@tsed/di";
import {Get, Post} from "@tsed/schema";
import {BodyParams, PathParams} from "@tsed/platform-params";
import {execQuery, SqlRow, typeOfQuery} from "../../engine/engine";
import {db, initDB, writeDB} from "../../engine/database";
import {CircuitParams} from "../../engine/parser";
import {getSqlOpcode, pendingRequests, provider, tableCommitments, zkSqlContract} from "../../engine/chainListener";
import {backOff} from "exponential-backoff";
import {Mutex} from 'async-mutex';
import {requests, SqlResponse} from "./RequestController";


@Controller("/query")
export class QueryController {
    @Get("/:id")
    async updatePayload(@PathParams("id") id: string): Promise<SqlResponse> {
        const key = BigInt(id);
        const resp = requests.get(key);

        if (resp != null) {
            requests.delete(key);
            return resp;
        }

        return {
            ready: false
        }
    }
}


