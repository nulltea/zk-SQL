import {Controller} from "@tsed/di";
import {Post} from "@tsed/schema";
import {BodyParams} from "@tsed/platform-params";
import {execQuery, SqlRow, typeOfQuery} from "../../engine/engine";
import {db} from "../../engine/database";
import {ParserArgs} from "../../engine/parser";
import {getSqlOpcode, pendingRequests, provider, zkSqlContract} from "../../engine/chainListener";

type SqlRequest = {
  sql: string
  commit: string
}

export type SqlResponse = {
  data: SqlRow[] | string
  proof: any,
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
    const type = typeOfQuery(payload.sql);
    const argsCommit = BigInt(payload.commit);

    if (type != "select") {
      if (!pendingRequests.has(argsCommit)) {
        throw Error("unknown request, commit to on-chain");
      }
    }

    let res = await execQuery(db, payload.sql, argsCommit, parserArgs, true);

    if (type != "select") {
      await zkSqlContract.execRequest(getSqlOpcode(type), argsCommit, res.publicInputs![0], res.solidityProof!);
    }

    return {
      data: res.data ?? res.publicInputs![0].toString(),
      proof: res.proof!,
    }
  }
}
