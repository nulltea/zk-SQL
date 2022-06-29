import {ClientConfig} from "zk-sql/client/client";

export const clientConfig: ClientConfig = {
  serverAddress: process.env.SERVER_ADDRESS!,
  circuitParams: {
    maxAND: 5, maxOR: 2, maxRows: 10, maxCols: 5
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
  const res = await fetch(`${clientConfig.serverAddress}/api/tables`, {
    signal: controller.signal
  });

  if (!res.ok) {
    throw Error(res.statusText);
  }

  clearTimeout(id);

  return new Map<string, string[]>(Object.entries(await res.json()));
}
