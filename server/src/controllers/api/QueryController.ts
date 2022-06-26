import {Controller} from "@tsed/di";
import {Post} from "@tsed/schema";
import {BodyParams} from "@tsed/platform-params";
import {execQuery, SqlRow, typeOfQuery} from "../../engine/engine";
import {db, initDB, writeDB} from "../../engine/database";
import {CircuitParams} from "../../engine/parser";
import {getSqlOpcode, pendingRequests, provider, tableCommitments, zkSqlContract} from "../../engine/chainListener";
import {backOff} from "exponential-backoff";
import {Mutex} from 'async-mutex';

type SqlRequest = {
  sql: string
  commit: string
}

export type SqlResponse = {
  selected?: {
    columns: string[],
    values: SqlRow[]
  },
  changeCommit?: string
  proof?: any,
  error?: string
}

const circuitParams: CircuitParams = {
  maxAND: 5, maxOR: 2, maxRows: 10,
}

const mutex = new Mutex();


@Controller("/query")
export class QueryController {
  @Post()
  async updatePayload(@BodyParams() payload: SqlRequest): Promise<SqlResponse> {
    try {
      const release = await mutex.acquire();
      const type = typeOfQuery(payload.sql);
      const argsCommit = BigInt(payload.commit);

      if (type != "select") {
        await backOff(async () => {
          if (!pendingRequests.has(argsCommit)) {
            throw Error("unknown request, commit to on-chain");
          }
        })
      }

      let res = await execQuery(db, payload.sql, argsCommit, circuitParams, true);

      if (type != "select") {
        const newCommitment = res.publicInputs![0];
        await zkSqlContract.execRequest(getSqlOpcode(type), argsCommit, newCommitment, res.solidityProof!)
        tableCommitments.set(res.tableName, argsCommit);
        await delay(1000);
        writeDB();
      }

      release();

      return {
        selected: res.selected,
        changeCommit: type != "select" ? res.publicInputs![0].toString() : undefined,
        proof: res.proof!,
      }
    } catch (e) {
      await initDB(true);
      return {
        error: e.toString()
      }
    }
  }
}

function delay(time: number) {
  return new Promise(resolve => setTimeout(resolve, time));
}
