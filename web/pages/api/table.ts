import type { NextApiRequest, NextApiResponse } from "next";
import {ClientConfig, makeSqlRequest} from "../../../server/src/client/client";

const clientConfig: ClientConfig = {
  serverAddress: "http://0.0.0.0:8083",
  circuitParams: {
    maxAND: 5, maxOR: 2, maxRows: 10,
  },
  knownTables: new Map<string, string[]>([
    ["table1", ["f1", "f2", "f3", "f4", "f5"]],
  ]),
  circuitsPath: "../server/circuits/build"
}

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
        columns,
        values,
      });
    }


  } catch (error: any) {
    const { message } = JSON.parse(error.body).error
    const reason = message.substring(message.indexOf("'") + 1, message.lastIndexOf("'"))

    res.status(500).send(reason || "Unknown error!")
  }
}
