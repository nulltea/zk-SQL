import type { NextApiRequest, NextApiResponse } from "next";
import {ClientConfig, makeSqlRequest} from "../../../../server/src/client/client";
import {clientConfig} from "../config";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
const {sql} = JSON.parse(req.body);
  try {
    const {selected, changeCommit, proof} = await makeSqlRequest(sql, clientConfig);

    if (selected != null) {
      const columns = selected.columns.map((col) => {
        return {
          Header: col,
          accessor: col,
          isNumeric: true,
        };
      });

      const values = selected.values.map((row) => {
        return Object.fromEntries(Array.from(
            row.values.entries(),
          ([index, v]) => [selected.columns.at(index), v])
        )});

      res.json({
        selected: {
          columns,
          values,
        },
        proof,
      });
    } else {
      res.json({
        changeCommit,
        proof,
      });
    }
  } catch (error: any) {
    console.log(error);
    const { message } = JSON.parse(error.body).error
    const reason = message.substring(message.indexOf("'") + 1, message.lastIndexOf("'"))
    res.status(500).send(reason || "Unknown error!")
  }
}
