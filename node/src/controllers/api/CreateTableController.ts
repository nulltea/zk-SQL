import {Controller} from "@tsed/di";
import {Get, Post} from "@tsed/schema";
import {BodyParams} from "@tsed/platform-params";
import {createTable, Table, writeDB} from "../../../../lib/engine/database";
import {
    pendingTablesToCreate,
} from "../../../../lib/engine/chainListener";
import {backOff} from "exponential-backoff";


export type CreateTableRequest = {
    commit: string,
    table: Table,
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
        writeDB();

        return {
            ok: true
        };
    }
}
