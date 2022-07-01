import {ClientConfig} from "zk-sql/client/client";
import {backOff} from "exponential-backoff";

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
  const resp = await fetch(`${clientConfig.serverAddress}/api/tables`, {
    signal: controller.signal
  });

  if (!resp.ok) {
    throw Error(resp.statusText);
  }

  clearTimeout(id);
  return new Map<string, string[]>(Object.entries(await resp.json()));
}
