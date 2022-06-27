import type { NextApiRequest, NextApiResponse } from "next";
import {Contract, providers, utils} from "ethers";
import {Provider} from "@ethersproject/abstract-provider";
import ZkSQL from "../../../server/artifacts/contracts/zkSQL.sol/ZkSQL.json";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const provider = new providers.JsonRpcProvider(process.env.CHAIN_RPC);
    let tables = await requestAllTables(provider);
    res.json(tables);
  } catch (error: any) {
    console.log(error);
    res.json(["table1"]);
  }
}

export async function requestAllTables(provider: Provider): Promise<string[]> {
  const contract = new Contract(process.env.ZK_SQL_CONTRACT!, ZkSQL.abi);
  let filter = contract.filters.TableCreated();
  let eventIFace = new utils.Interface(["event TableCreated(string table, uint256 commitment)"]);
  let tables = await provider.getLogs({
    address: filter.address,
    fromBlock: Number(process.env.DEPLOYMENT_BLOCK!),
    toBlock: "latest",
    topics: filter.topics
  }).then((logs) => logs.map((log) => eventIFace.parseLog(log).args.table));

  return ["table1"].concat(tables);
}
