import type { NextApiRequest, NextApiResponse } from "next";
import {clientConfig} from "../config";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await fetch(`${clientConfig.serverAddress}/api/create`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: req.body,
    });

    res.json({});
  } catch (error: any) {
    console.log("create error", error);
    res.status(500).send( "Unknown error!")
  }
}
