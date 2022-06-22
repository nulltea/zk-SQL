import {Controller} from "@tsed/di";
import {Post} from "@tsed/schema";
import {BodyParams} from "@tsed/platform-params";
import {SqlValue} from "sql.js";
import {genArgsCommitment, execQuery, SqlRow} from "../../engine/engine";
import {db} from "../../engine/database";
import {ParserArgs} from "../../engine/parser";
import {pendingRequests} from "../../engine/chainListener";

type SqlRequest = {
  sql: string
  commit: string
}

export type SqlResponse = {
  data?: SqlRow[]
  proof?: Uint8Array,
  publicInputs?: bigint[],
}

const parserArgs: ParserArgs = {
  maxAND: 5, maxOR: 2, maxRows: 5,
  headerMap: new Map<string, number>([
    ["f1", 1], ["f2", 2], ["f3", 3], ["f4", 4], ["f5", 5],
  ])
}

@Controller("/query")
export class QueryController {
  @Post()
  async updatePayload(@BodyParams() payload: SqlRequest): Promise<SqlResponse> {
    const argsCommit = BigInt(payload.commit);
    console.log(argsCommit);
    if (!pendingRequests.has(argsCommit)) {
      throw Error("unknown request, commit to on-chain");
    }

    let res = await execQuery(db, payload.sql, argsCommit, parserArgs, true);

    return {
      data: res.data,
      proof: res.proof,
      publicInputs: res.publicInputs
    }
  }
}
