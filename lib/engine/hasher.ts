import {encodeSqlValue} from "./encode";

const buildPoseidon = require("circomlibjs").buildPoseidon;

export async function hashTable(header: string[], table: any[][]) {
    const poseidon = await buildPoseidon();
    let encodedTable = table.map(r => r.map(c => encodeSqlValue(c)))
    let headerCodes = header.map(c => encodeSqlValue(c));
    let flatTable: bigint[] = [].concat.apply(headerCodes, encodedTable);
    let preImage = flatTable.reduce((sum, x) => sum + x, 0n);
    return poseidon.F.toObject(poseidon([preImage]));
}
