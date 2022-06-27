import type { NextApiRequest, NextApiResponse } from "next";
import {postSqlRequest} from "zk-sql/src/client/client";
import {clientConfig} from "../config";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {sql} = JSON.parse(req.body);
  try {
    res.json(await postSqlRequest(sql, clientConfig));
  } catch (error: any) {
    console.log("request error:", error);
    const { message } = JSON.parse(error.body).error
    const reason = message.substring(message.indexOf("'") + 1, message.lastIndexOf("'"))
    res.status(500).send(reason || "Unknown error!")
  }
}
