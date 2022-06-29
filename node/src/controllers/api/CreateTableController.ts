import {Controller} from "@tsed/di";
import {Get, Post} from "@tsed/schema";
import {BodyParams} from "@tsed/platform-params";
import {createTable, Table, writeDB} from "zk-sql/engine/database";
import {
    pendingTablesToCreate,
} from "zk-sql/engine/chainListener";
import {backOff} from "exponential-backoff";
import {commitToTable} from "zk-sql/client/client";


export type CreateTableRequest = {
    table: Table,
}


@Controller("/create")
export class CreateTableController {
    @Post()
    async updatePayload(@BodyParams() payload: CreateTableRequest): Promise<{}> {
        const commit = await commitToTable(payload.table.columns.map(c => c.name));
        console.log(payload.table.columns.map(c => c.name), commit);
        await backOff(async () => {
            if (!pendingTablesToCreate.has(commit)) {
                throw Error("unknown request, commit to on-chain");
            }
        });

        createTable(payload.table);
        writeDB();

        return {
            ok: true
        };
    }
}
