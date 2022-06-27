import {Controller} from "@tsed/di";
import {Post} from "@tsed/schema";
import {BodyParams} from "@tsed/platform-params";
import {execQuery, SqlRow, typeOfQuery} from "../../engine/engine";
import {db, initDB, writeDB} from "../../engine/database";
import {CircuitParams} from "../../engine/parser";
import {getSqlOpcode, pendingRequests, provider, tableCommitments, zkSqlContract} from "../../engine/chainListener";
import {backOff} from "exponential-backoff";
import {Mutex} from 'async-mutex';
import {circuitParams} from "./config";

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

const mutex = new Mutex();

export const requests = new Map<string, SqlResponse>();


@Controller("/request")
export class RequestController {
  @Post()
  async updatePayload(@BodyParams() payload: SqlRequest): Promise<{ error?: string, token?: string }> {
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

      const token = (Math.random() + 1).toString(36).substring(7);

      (async () => {
        try {
          return {res: await execQuery(db, payload.sql, argsCommit, circuitParams, true)};
        } catch (e) {
          return {err: e};
        }
      })().then(async ({res, err}) => {
        if (err != null || res == null) {
          requests.set(token, {
            ready: true,
            error: err.toString()
          });

          console.log("request is failed");
          return
        }

        if (type != "select") {
          const newCommitment = res.publicInputs![0];
          await zkSqlContract.execRequest(getSqlOpcode(type), argsCommit, newCommitment, res.solidityProof!)
          tableCommitments.set(res.tableName, argsCommit);
          // await delay(1000);
          writeDB();
        }

        requests.set(token, {
          ready: true,
          selected: res.selected,
          changeCommit: type != "select" ? res.publicInputs![0].toString() : undefined,
          proof: res.proof!,
        });

        console.log("request is ready");
      });

      return {
        token
      }
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
