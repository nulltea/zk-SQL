import type { NextApiRequest, NextApiResponse } from "next";
import {commitToQuery} from "zk-sql/engine/engine";
import {clientConfig, getKnownTables} from "../config";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {sql} = JSON.parse(req.body);
  try {
    const knownTables = await getKnownTables();
    const {commit, table, type} = await commitToQuery(sql, knownTables, clientConfig.circuitParams);
    if (type === 'select') {
      res.json({
        commitExpected: false,
        columns: knownTables.get(table),
      })
    } else {
      res.json({
        commitExpected: true,
        table,
        commit: commit.toString(),
        columns: knownTables.get(table),
      })
    }
  } catch (error: any) {
    console.log("prepare error:", error);
    const { message } = JSON.parse(error.body).error
    const reason = message.substring(message.indexOf("'") + 1, message.lastIndexOf("'"))
    res.status(500).send(reason || "Unknown error!")
  }
}
