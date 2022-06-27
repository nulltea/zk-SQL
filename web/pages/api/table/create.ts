import type { NextApiRequest, NextApiResponse } from "next";
import {clientConfig} from "../config";
import {Table} from "zk-sql/src/engine/database";

type CreateTableRequest = {
  commit: string,
  table: Table,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const body: CreateTableRequest = JSON.parse(req.body);

  try {
    await fetch(`${clientConfig.serverAddress}/api/create`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: req.body,
    });

    clientConfig.knownTables.set(body.table.name, body.table.columns);

    res.json({});
  } catch (error: any) {
    console.log("error", error);
    res.status(500).send( "Unknown error!")
  }
}
