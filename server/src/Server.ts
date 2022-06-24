import {join} from "path";
import {Configuration, Inject} from "@tsed/di";
import {BeforeInit, PlatformApplication} from "@tsed/common";
import "@tsed/platform-express"; // /!\ keep this import
import bodyParser from "body-parser";
import compress from "compression";
import cookieParser from "cookie-parser";
import methodOverride from "method-override";
import cors from "cors";
import "@tsed/ajv";
import "@tsed/swagger";
import {config} from "./config";
import * as rest from "./controllers/api";
import {initDB} from "./engine/database";
import {tableCommitments} from "./engine/engine";
import {listenToChain} from "./engine/chainListener";
import {ethers} from "hardhat";
import {PlonkVerifier as InsertVerifier} from "../typechain-types/insertVerifier.sol";
import {PlonkVerifier as UpdateVerifier} from "../typechain-types/updateVerifier.sol";
import {PlonkVerifier as DeleteVerifier, ZkSQL} from "../typechain-types";

@Configuration({
  ...config,
  acceptMimes: ["application/json"],
  httpPort: process.env.PORT || 8083,
  httpsPort: false, // CHANGE
  componentsScan: false,
  mount: {
    "/api": [
      ...Object.values(rest)
    ],
  },
  swagger: [
    {
      path: "/doc",
      specVersion: "3.0.1"
    }
  ],
  middlewares: [
    cors(),
    cookieParser(),
    compress({}),
    methodOverride(),
    bodyParser.json(),
    bodyParser.urlencoded({
      extended: true
    })
  ],
  exclude: [
    "**/*.spec.ts"
  ]
})
export class Server implements BeforeInit {
  @Inject()
  protected app: PlatformApplication;

  @Configuration()
  protected settings: Configuration;

  async $beforeInit(): Promise<any> {
    await initDB(true, {
      name: "table1",
      columns: ["f1", "f2", "f3", "f4", "f5"],
      values: [
        [1, 4, 3, 4, 3],
        [2, 3, 4, 3, 8],
        [3, 4, 5, 8, 4],
        [4, 5, 6, 7, 2],
        [5, 4, 7, 8, 9],
      ]
    });
    tableCommitments.set("table1", 6192063684007625405622444875231245009508356906093894343979231563958794510376n);
    await listenToChain("0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");
  }
}

