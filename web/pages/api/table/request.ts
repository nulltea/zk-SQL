import type { NextApiRequest, NextApiResponse } from "next";
import {ClientConfig, postSqlRequest} from "../../../../server/src/client/client";
import {clientConfig} from "../config";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {sql} = JSON.parse(req.body);
  try {
    const token = await postSqlRequest(sql, clientConfig);

    res.json({
      token: token.toString()
    })
  } catch (error: any) {
    console.log(error);
    const { message } = JSON.parse(error.body).error
    const reason = message.substring(message.indexOf("'") + 1, message.lastIndexOf("'"))
    res.status(500).send(reason || "Unknown error!")
  }
}
