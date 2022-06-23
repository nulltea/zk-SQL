import {BigNumber, Contract, providers, utils} from "ethers";
import ZkSQL from "artifacts/contracts/zkSQL.sol/ZkSQL.json";
import {ZkSQL as IZkSQL} from "../../typechain-types";


export let provider: any;
export let zkSqlContract: IZkSQL;
export const pendingRequests = new Map<bigint, string>;

export async function listenToChain(address: string) {
    provider = new providers.JsonRpcProvider("http://localhost:8545");
    const contract = new Contract(address, ZkSQL.abi);

    zkSqlContract = contract.connect(provider.getSigner()) as IZkSQL;

    zkSqlContract.on("RequestPosted", (address: any, argsCommitment: BigNumber) => {
        pendingRequests.set(argsCommitment.toBigInt(), "");
        console.log("new pending request", argsCommitment.toBigInt());
    });

    console.log("started listening...");
}

export function getSqlOpcode(type: string): number {
    switch (type) {
        case "insert":
            return 0;
        case "update":
            return 1;
        case "delete":
            return 2;
    }

    throw Error("unknown operation");
}
