import {BigNumber, Contract, providers, utils} from "ethers";
import ZkSQL from "artifacts/contracts/zkSQL.sol/ZkSQL.json";

let provider: any;
let zkSqlContract: any;
export const pendingRequests = new Map<bigint, string>;

export async function listenToChain(address: string) {
    provider = new providers.JsonRpcProvider("http://localhost:8545");
    zkSqlContract = new Contract(address, ZkSQL.abi);

    const contractOwner = zkSqlContract.connect(provider.getSigner());

    contractOwner.on("RequestPosted", (address: any, argsCommitment: BigNumber) => {
        pendingRequests.set(argsCommitment.toBigInt(), "");
        console.log("new pending request", argsCommitment.toBigInt());
    });

    console.log("started listening...");
}
