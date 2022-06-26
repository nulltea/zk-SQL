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
  ready: boolean
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

export const requests = new Map<bigint, SqlResponse>();


@Controller("/request")
export class RequestController {
  @Post()
  async updatePayload(@BodyParams() payload: SqlRequest): Promise<{ error?: string }> {
    try {
      const type = typeOfQuery(payload.sql);
      const argsCommit = BigInt(payload.commit);

      if (type != "select") {
        await backOff(async () => {
          if (!pendingRequests.has(argsCommit)) {
            throw Error("unknown request, commit to on-chain");
          }
        })
      }

      execQuery(db, payload.sql, argsCommit, circuitParams, true).then(async (res) => {
        if (type != "select") {
          const newCommitment = res.publicInputs![0];
          await zkSqlContract.execRequest(getSqlOpcode(type), argsCommit, newCommitment, res.solidityProof!)
          tableCommitments.set(res.tableName, argsCommit);
          // await delay(1000);
          writeDB();
        }

        requests.set(argsCommit, {
          ready: true,
          selected: res.selected,
          changeCommit: type != "select" ? res.publicInputs![0].toString() : undefined,
          proof: res.proof!,
        });

        console.log("request is ready");
      });

      return { }
    } catch (e: any) {
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
