import { task } from "hardhat/config";
import '@typechain/hardhat'
import '@nomiclabs/hardhat-ethers'
import "@nomiclabs/hardhat-waffle";

const dotenv = require("dotenv");
dotenv.config({path: __dirname + '/.env'});

const {HARMONY_PRIVATE_KEY} = process.env;

console.log("HARMONY_PRIVATE_KEY=",HARMONY_PRIVATE_KEY);

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.4",
  networks: {
    hardhat: {
      gas: 100000000,
      blockGasLimit: 0x1fffffffffffff
    },
    testnet: {
      url: "https://api.s0.b.hmny.io",
      chainId: 1666700000,
      accounts: [`${HARMONY_PRIVATE_KEY}`]
    },
    devnet: {
      url: "https://api.s0.ps.hmny.io",
      chainId: 1666900000,
      accounts: [`${HARMONY_PRIVATE_KEY}`]
    },
    mainnet: {
      url: "https://api.s0.t.hmny.io",
      chainId: 1666600000,
      accounts: [`${HARMONY_PRIVATE_KEY}`]
    },
  },
  mocha: {
    timeout: 100000000
  },
};
