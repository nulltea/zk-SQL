// import selectVkey from "../../server/circuits/build/select/verification_key.json";
// import insertVkey from "../../server/circuits/build/insert/verification_key.json";
// import updateVkey from "../../server/circuits/build/update/verification_key.json";
// import deleteVkey from "../../server/circuits/build/delete/verification_key.json";
//
// const {plonk} = require("snarkjs");
//
// const vKeys = new Map<string, any>([
//   ['select', selectVkey]
// ]);
//
// export function verifyProof(type: string, publicInputs: bigint[], proof: any): Promise<any> {
//   let vKey = vKeys.get(type);
//   if (vKey === undefined) {
//     throw Error("unknown operation");
//   }
//   console.log(vKey, publicInputs, proof);
// }
