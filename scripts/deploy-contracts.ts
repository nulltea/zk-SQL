import {ethers} from "hardhat";


async function main() {
    let insertFactory = await ethers.getContractFactory("contracts/insertVerifier.sol:PlonkVerifier");
    let insertVerifier = await insertFactory.deploy();
    await insertVerifier.deployed();
    console.log("insertVerifier deployed to:", insertVerifier.address);


    let updateFactory = await ethers.getContractFactory("contracts/updateVerifier.sol:PlonkVerifier");
    let updateVerifier = await updateFactory.deploy();
    await updateVerifier.deployed();
    console.log("updateVerifier deployed to:", updateVerifier.address);


    let deleteFactory = await ethers.getContractFactory("contracts/deleteVerifier.sol:PlonkVerifier");
    let deleteVerifier = await deleteFactory.deploy();
    await deleteVerifier.deployed();
    console.log("deleteVerifier deployed to:", deleteVerifier.address);

    let zkSqlFactory = await ethers.getContractFactory("contracts/zkSQL.sol:ZkSQL");
    let zkSQL = await zkSqlFactory.deploy(insertVerifier.address, updateVerifier.address, deleteVerifier.address);
    await zkSQL.deployed();
    console.log("zkSQL deployed to:", zkSQL.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
