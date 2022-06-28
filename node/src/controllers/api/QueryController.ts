import {Controller} from "@tsed/di";
import {Get} from "@tsed/schema";
import {PathParams} from "@tsed/platform-params";
import {requests, SqlResponse} from "./RequestController";


@Controller("/query")
export class QueryController {
    @Get("/:id")
    async updatePayload(@PathParams("id") requestToken: string): Promise<SqlResponse> {
        const resp = requests.get(requestToken);

        if (resp != null) {
            requests.delete(requestToken);
            return resp;
        }

        return {
            ready: false
        }
    }
}


