import {ClientConfig, makeSqlRequest} from "../src/client/client";

describe("zk-SQL - API", () => {
    const clientConfig: ClientConfig = {
        serverAddress: "http://0.0.0.0:8083",
        circuitParams: {
            maxAND: 5, maxOR: 2, maxRows: 10,
        },
        knownTables: new Map<string, string[]>([
            ["table1", ["f1", "f2", "f3", "f4", "f5"]],
        ])
    }

    before(async () => {
    });

    it("SELECT * FROM table1 WHERE f2 = 4", async () => {
        const query = "SELECT * FROM table1 WHERE f2 = 4";
        await makeSqlRequest(query, clientConfig);
    });

    it("INSERT INTO table1 VALUES (1, 2, 3, 4, 5)", async () => {
        const query = "INSERT INTO table1 VALUES (1, 4, 3, 4, 5)";
        await makeSqlRequest(query, clientConfig);
    });

    it("UPDATE table1 SET f1=8, f3=8, f4=8, f5=8 WHERE f2 = 4", async () => {
        const query = "UPDATE table1 SET f1=8, f3=8, f4=8, f5=8 WHERE f2 = 4";
        await makeSqlRequest(query, clientConfig);
    });
});
