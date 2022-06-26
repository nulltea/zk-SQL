import {ClientConfig} from "../../../server/src/client/client";

export const clientConfig: ClientConfig = {
  serverAddress: "http://0.0.0.0:8083",
  circuitParams: {
    maxAND: 5, maxOR: 2, maxRows: 10,
  },
  knownTables: new Map<string, string[]>([
    ["table1", ["f1", "f2", "f3", "f4", "f5"]],
  ]),
  circuitsPath: "../server/circuits/build"
}
