import type { NextApiRequest, NextApiResponse } from "next";
import {commitToQuery} from "../../../../server/src/engine/engine";
import {clientConfig} from "../config";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {sql} = JSON.parse(req.body);
  try {
    const {commit, table, type} = await commitToQuery(sql, clientConfig.knownTables, clientConfig.circuitParams);
    if (type === 'select') {
      res.json({
        commitExpected: false
      })
    } else {
      res.json({
        commitExpected: true,
        table,
        commit: commit.toString()
      })
    }
  } catch (error: any) {
    const { message } = JSON.parse(error.body).error
    const reason = message.substring(message.indexOf("'") + 1, message.lastIndexOf("'"))
    res.status(500).send(reason || "Unknown error!")
  }
}
