import {encodeSqlValue} from "../lib/engine/encode";


describe("zk-SQL - Scratch", () => {
    it("value encoding", async () => {
        console.log(encodeSqlValue(8));
        console.log(encodeSqlValue("Hello world"));
        console.log(encodeSqlValue(new Uint8Array([8, 88, 2])));
    });
});
