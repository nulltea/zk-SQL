import {ClientConfig} from "zk-sql/client/client";

export const clientConfig: ClientConfig = {
  serverAddress: process.env.SERVER_ADDRESS!,
  circuitParams: {
    maxAND: Number(process.env.MAX_AND!),
    maxOR: Number(process.env.MAX_OR!),
    maxRows: Number(process.env.MAX_ROWS!),
    maxCols: Number(process.env.MAX_COLUMNS!)
  },
  knownTables: new Map<string, string[]>(),
  circuitsPath: "../server/circuits/build"
}

export async function getClientConfig(): Promise<ClientConfig> {
  clientConfig.knownTables = await getKnownTables()
  return clientConfig;
}

export async function getKnownTables(): Promise<Map<string, string[]>> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 2000);
  const resp = await fetch(`${clientConfig.serverAddress}/api/tables`, {
    signal: controller.signal
  });

  if (!resp.ok) {
    throw Error(resp.statusText);
  }

  clearTimeout(id);
  return new Map<string, string[]>(Object.entries(await resp.json()));
}
