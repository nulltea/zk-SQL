import {ClientConfig} from "zk-sql/src/client/client";

export const clientConfig: ClientConfig = {
  serverAddress: process.env.SERVER_ADDRESS!,
  circuitParams: {
    maxAND: 5, maxOR: 2, maxRows: 10, maxCols: 5
  },
  knownTables: new Map<string, string[]>([
    ["table1", ["f1", "f2", "f3", "f4", "f5"]],
    ["table2", ["f1", "f2", "f3"]],
    ["employees", ["FirstName", "LastName", "Salary"]],
    ["books", ["Name", "Year", "Pages"]],
    ["papers", ["Title", "Author", "PublishDate", "Area"]]
  ]),
  circuitsPath: "../server/circuits/build"
}
