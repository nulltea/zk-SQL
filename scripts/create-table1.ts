import {ethers} from "hardhat";
import ZkSQL from "../node/artifacts/contracts/zkSQL.sol/ZkSQL.json";
import {ZkSQL as IZkSQL} from "../node/typechain-types";

async function main() {
    const contract = (await ethers.getContractAtFromArtifact(ZkSQL, process.env.ZK_SQL_CONTRACT!)) as IZkSQL;
    await contract.createTable("table2", 6192063684007625405622444875231245009508356906093894343979231563958794510376n);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
