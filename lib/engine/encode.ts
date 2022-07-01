import * as bigintConversion from 'bigint-conversion'
import {SqlValue} from "sql.js";

export function encodeSqlValue(val: SqlValue): bigint {
    switch (typeof val) {
        case "number":
            return BigInt(val);
        case "string":
            return bigintConversion.textToBigint(val);
        case "object":
            return bigintConversion.bufToBigint(val!.buffer);
        default:
            return 0n;
    }
}
