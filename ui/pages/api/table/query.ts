import type { NextApiRequest, NextApiResponse } from "next";
import {getSqlRequest} from "zk-sql/client/client";
import {clientConfig, getClientConfig} from "../config";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {sql, tableCommit, token} = JSON.parse(req.body);

  try {
    await getClientConfig()
  } catch (e) {
    res.json({
      ready: false,
    });

    return;
  }

  try {
    const {ready, type, selected, changeCommit, proof, error, publicSignals} = await getSqlRequest(sql, tableCommit, token, clientConfig);

    if (!ready) {
      res.json({
        ready: false,
      });

      return;
    }

    if (error != null) {
      res.json({
        ready: true,
        error: error.split('\n')[0]
      })

      return;
    }

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
        ready: true,
        type,
        selected: {
          columns,
          values,
        },
        changeCommit,
        proof,
        publicSignals: formatPublicSignals(publicSignals),
      });
    } else {
      res.json({
        ready: true,
        type,
        changeCommit,
        proof,
        publicSignals: formatPublicSignals(publicSignals),
      });
    }
  } catch (error: any) {
    console.log("query error:", error);
    res.status(500).json({
      error: error.toString().split('\n')[0],
    })
  }
}

function formatPublicSignals(sigs: bigint[]): string[] {
  return sigs.map((s) => String(s))
}
