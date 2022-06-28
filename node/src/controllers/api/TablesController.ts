import {Controller} from "@tsed/di";
import {Get} from "@tsed/schema";
import {PathParams} from "@tsed/platform-params";
import {knownTables} from "zk-sql/engine/database";


@Controller("/tables")
export class TablesController {
    @Get("/")
    async updatePayload(@PathParams("id") requestToken: string): Promise<Map<string, string[]>> {
        return knownTables;
    }
}


