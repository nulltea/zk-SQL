import selectVKey from "zk-sql/circuits/build/select/verification_key.json";
import insertVKey from "zk-sql/circuits/build/insert/verification_key.json";
import updateVKey from "zk-sql/circuits/build/update/verification_key.json";
import deleteVKey from "zk-sql/circuits/build/delete/verification_key.json";

const {plonk} = require("snarkjs");

export function verifyProof(type: string, publicInputs: any[], proof: any): Promise<any> {
  let vKey = ((type) => {
    switch (type) {
      case "select":
        return selectVKey;
      case "insert":
        return insertVKey;
      case "update":
        return updateVKey;
      case "delete":
        return deleteVKey;
      default:
        throw Error("unknown SQL operation");
    }
  })(type);
  return plonk.verify(vKey, publicInputs.map(v => BigInt(v)), proof);
}
