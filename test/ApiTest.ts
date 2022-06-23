import {assert} from "chai";
import {ParserArgs} from "../src/engine/parser";
import {initDB} from "../src/engine/database";
import {ClientConfig, makeSqlRequest} from "../src/client/client";
import {tableCommitments} from "../src/engine/engine";

describe("zk-SQL - API", () => {
    const clientConfig: ClientConfig = {
        serverAddress: "http://0.0.0.0:8083"
    }

    const parserArgs: ParserArgs = {
        maxAND: 5, maxOR: 2, maxRows: 5,
        headerMap: new Map<string, number>([
            ["f1", 1], ["f2", 2], ["f3", 3], ["f4", 4], ["f5", 5],
        ])
    }

    before(async () => {
        await initDB({
            name: "table1",
            columns: ["f1", "f2", "f3", "f4", "f5"],
            values: [
                [1, 4, 3, 4, 3],
                [2, 3, 4, 3, 8],
                [3, 4, 5, 8, 4],
                [4, 5, 6, 7, 2],
                [5, 4, 7, 8, 9],
            ]
        });

        tableCommitments.set("table1", 6192063684007625405622444875231245009508356906093894343979231563958794510376n);
    });

    it("SELECT * FROM table1 WHERE f2 = 4", async () => {
        const query = "SELECT * FROM table1 WHERE f2 = 4";
        await makeSqlRequest(query, clientConfig);
    });

    it("INSERT INTO table1 VALUES (1, 2, 3, 4, 5)", async () => {
        const query = "INSERT INTO table1 VALUES (1, 2, 3, 4, 5)";
        await makeSqlRequest(query, clientConfig);
    });

});
