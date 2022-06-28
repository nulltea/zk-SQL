import {encodeSqlValue} from "../lib/engine/encode";


describe("just test", () => {
    before(async () => {
    });

    it("t1", async () => {
        console.log(encodeSqlValue(8));
        console.log(encodeSqlValue("Hello world"));
        console.log(encodeSqlValue(new Uint8Array([8, 88, 2])));
    });
});
