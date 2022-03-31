var { solidity } = require("ethereum-waffle");
var chai = require("chai");
chai.use(solidity);
const { ethers } = require("hardhat");
const expect = chai.expect;
const { addresses, private_keys } = require("../constants");
const hardhatConfig = require("../../hardhat.config");
const {
  sleep,
  signAnotherContractThenExcuteFunction,
  signAnotherContractThenExcuteFunctionWithValue,
} = require("../common_libs");

const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const path = require("path");
/*
  -TESTCASES:
    - Test admin can change operator
    - Test non admin can't change operator
    - Test change admin
    - Test non admin can't change admin
    - Test new admin can change operator
    - Test get Creator
    - Test get total supply
    - Test token is not exists
    - Test get non existed token URI
    - Test admin can't create token without operator role
    - Test set creator for admin then create new token
    - Test operator can create token with supply is zero
    - Test operator can create token
    - Test create token with overflow number
    - Test new operator create token
    - Test setCreator for invalid address
    - Test setCreator without existed token
    - Test setCreator by admin
    - Test set custom URI by creator
    - Test set custom URI by non creator
    - Test set URI by operator
    - Test mint by creator
    - Test non creator can't mint
    - Test mint after set new creator
    - Test batchMint by operator
    - Test batchMint by non operator
    - Test everyone can mint if token id is in whitelsit // not use whitelist
    - Test Non operator changes whitelist for TokenID // not use whitelist
    - Test mint list whitelist token ID // not use whitelist
    - Test create token with price and max token
    - Test user mint with value greater than token price
    - Test user mint with value smaller than token price
    - Test user mint greater than max supply
    - Test withdraw after user mint
    - Test mint with token greater than max supply

*/

describe("** NFTs ERC-1155 tradable", () => {
  let erc1155Tradable;
  let erc1155TradbleAddress;
  let adminContract = addresses[0]; // default for local
  let operatorContract = addresses[1];
  let newOperatorContract = addresses[2];
  let newAdmin = addresses[3];
  const overFlowNumber = 9999999999999999999999999999;
  const jsonFile = "./artifacts/contracts/utils/ERC1155Tradable.sol/ERC1155Tradable.json";
  const tokenId = 1;
  const tokenURI = "https://gateway.pinata.cloud/ipfs/QmWYZQzeTHDMGcsUMgdJ64hgLrXk8iZKDRmbxWha4xdbbH";
  const numberTokenCreate = 10;
  const dataCreateToken = [adminContract, tokenId, numberTokenCreate, tokenURI, "0x00", 0, 0];

  beforeEach(async function () {
    console.log("Hardhat network", hardhatConfig.defaultNetwork);
    let Erc1155TradableContract = await ethers.getContractFactory("ERC1155Tradable");
    erc1155Tradable = await Erc1155TradableContract.deploy("test", "test", { a: "b" }, adminContract, operatorContract);
    erc1155TradbleAddress = erc1155Tradable.address;
    console.log("erc1155Tradable deploy address", erc1155TradbleAddress);
    const admin = await erc1155Tradable.admin();
    const operator = await erc1155Tradable.operator();
    console.log("Admin: ", admin);
    console.log("Operator: ", operator);
  });

  context("* Change operator function", () => {
    it("- Test admin can change operator", async () => {
      await erc1155Tradable.changeOperator(newOperatorContract);
      const newOperator = await erc1155Tradable.operator();
      expect(newOperator.toLowerCase()).to.equal(newOperatorContract.toLowerCase());
    });

    it("- Test non admin can't change operator", async () => {
      const nonAdminPrivateKey = private_keys[1];
      const executeFunc = "changeOperator";
      const data = [newOperatorContract];
      // Sign contract with account is not admin then change operator
      try {
        await signAnotherContractThenExcuteFunction(
          jsonFile,
          erc1155TradbleAddress,
          operatorContract,
          executeFunc,
          data,
          nonAdminPrivateKey
        );
      } catch (error) {
        expect(error.toString()).to.include("ONLY_ADMIN");
      }
    });
  });
  context("* Change admin function", () => {
    it("- Test change admin", async () => {
      await erc1155Tradable.changeAdmin(newAdmin);
      const newAdminChanged = await erc1155Tradable.admin();
      expect(newAdminChanged.toLowerCase()).to.equal(newAdmin.toLowerCase());
    });

    it("- Test non admin can't change admin", async () => {
      const nonAdminPrivateKey = private_keys[1];
      const executeFunc = "changeAdmin";
      const data = [newAdmin];
      // Sign contract with account is not admin then change admin
      try {
        await signAnotherContractThenExcuteFunction(
          jsonFile,
          erc1155TradbleAddress,
          operatorContract,
          executeFunc,
          data,
          nonAdminPrivateKey
        );
      } catch (error) {
        expect(error.toString()).to.include("ONLY_ADMIN");
      }
    });

    it("- Test new admin can change operator", async () => {
      const changedAdminPrivateKey = private_keys[3];
      const executeFunc = "changeOperator";
      const data = [newOperatorContract];
      // Change to new admin
      await erc1155Tradable.changeAdmin(newAdmin);
      const newAdminChanged = await erc1155Tradable.admin();
      expect(newAdminChanged.toLowerCase()).to.equal(newAdmin.toLowerCase());
      // New admin sign contract then change operator
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        newAdmin,
        executeFunc,
        data,
        changedAdminPrivateKey
      );
      await sleep(3);
      // Check new operator is changed success
      const newOperator = await erc1155Tradable.operator();
      expect(newOperator.toLowerCase()).to.equal(newOperatorContract.toLowerCase());
    });
  });
  context("** Create token", () => {
    // Tests create token type by operator
    const newTokenURI = "https://gateway.pinata.cloud/ipfs/QmWYZQzeTHDMGcsUMgdJ64hgLrXk8iZKDRmbxWha4xdbbK";
    // data to create token
    it("- Test get Creator", async () => {
      const expectedResult = "0x0000000000000000000000000000000000000000";
      const creator = await erc1155Tradable.getCreator(tokenId);
      expect(creator).to.equal(expectedResult);
    });

    it("- Test get total supply", async () => {
      const totalSupply = await erc1155Tradable.totalSupply(tokenId);
      expect(totalSupply).to.equal(0);
    });

    it("- Test token is not exists", async () => {
      const isTokenExists = await erc1155Tradable.exists(tokenId);
      expect(isTokenExists).to.equal(false);
    });

    it("- Test get non existed token URI", async () => {
      try {
        await erc1155Tradable.uri(tokenId);
      } catch (error) {
        console.error(error);
        expect(error.toString()).to.include("NONEXISTENT_TOKEN");
      }
    });

    it("- Test admin can't create token without operator role", async () => {
      try {
        await erc1155Tradable.create(adminContract, tokenId, numberTokenCreate, tokenURI, "0x00", 0, 0);
      } catch (error) {
        console.error(error);

        expect(error.toString()).to.include("ONLY_OPERATOR");
      }
    });

    it("- Test set creator for admin then create new token", async () => {
      // admin set creator role for itself
      const executeFunc = "create";
      // Operator sign contract then create token
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc,
        dataCreateToken,
        private_keys[1]
      );
      // Verify token is create success and creator is the right address
      const isTokenExists = await erc1155Tradable.exists(tokenId);
      const tokenSupply = await erc1155Tradable.totalSupply(tokenId);
      const creator = await erc1155Tradable.getCreator(tokenId);
      console.log("Token supply: ", tokenSupply);
      console.log("Token creator: ", creator);
      expect(isTokenExists).to.equal(true);
      expect(tokenSupply).to.equal(numberTokenCreate);
      expect(creator).to.equal(operatorContract);

      // Set creator for admin then create new token
      const executeFunc1 = "setCreator";
      const data1 = [adminContract, [tokenId]];
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc1,
        data1,
        private_keys[1]
      );
      const newCreator = await erc1155Tradable.getCreator(tokenId);
      console.log("New creator: ", newCreator);
      // create new token by admin after set creator role
      const newTokenId = 2;
      const _numberTokenCreate = 1991;
      try {
        await erc1155Tradable.create(adminContract, newTokenId, _numberTokenCreate, tokenURI, "0x00", 0, 0);
      } catch (error) {
        expect(error.toString()).to.include("ONLY_OPERATOR");
      }
    });

    it("- Test operator can create token with supply is zero", async () => {
      const executeFunc = "create";
      const dataCreateZeroToken = [adminContract, tokenId, 0, tokenURI, operatorContract, 0, 0];
      // Operator sign contract then create token
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc,
        dataCreateZeroToken,
        private_keys[1]
      );
      const isTokenExists = await erc1155Tradable.exists(tokenId);
      const tokenSupply = await erc1155Tradable.totalSupply(tokenId);
      expect(isTokenExists).to.equal(true);
      expect(tokenSupply).to.equal(0);
    });

    it("- Test operator can create token", async () => {
      const executeFunc = "create";
      // Operator sign contract then create token
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc,
        dataCreateToken,
        private_keys[1]
      );
      // Verify token is create success and creator is the right address
      const isTokenExists = await erc1155Tradable.exists(tokenId);
      const tokenSupply = await erc1155Tradable.totalSupply(tokenId);
      const creator = await erc1155Tradable.getCreator(tokenId);
      console.log("Token supply: ", tokenSupply);
      console.log("Token creator: ", creator);
      expect(isTokenExists).to.equal(true);
      expect(tokenSupply).to.equal(numberTokenCreate);
      expect(creator).to.equal(operatorContract);

      // Change new creator for given token
      const executeFunc1 = "setCreator";
      const data1 = [newOperatorContract, [tokenId]];
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc1,
        data1,
        private_keys[1]
      );
      // Check after change creator for given token
      const newCreator = await erc1155Tradable.getCreator(tokenId);
      console.log("New creator: ", newCreator);
      expect(newCreator.toLowerCase()).to.equal(newOperatorContract.toLowerCase());
      // Check token URI after create token
      const uri = await erc1155Tradable.uri(tokenId);
      expect(uri).to.equal(tokenURI);
    });
    it("- Test create token with overflow number", async () => {
      const executeFunc = "create";
      const dataCreateToken = [adminContract, tokenId, overFlowNumber, tokenURI, operatorContract, 0, 0];
      // Operator sign contract then create token
      try {
        await signAnotherContractThenExcuteFunction(
          jsonFile,
          erc1155TradbleAddress,
          operatorContract,
          executeFunc,
          dataCreateToken,
          private_keys[1]
        );
      } catch (error) {
        expect(error.toString()).to.include("overflow");
      }
    });

    it("- Test new operator create token", async () => {
      const executeFunc = "create";
      // Change new creator
      await erc1155Tradable.changeOperator(newOperatorContract);
      const newOperator = await erc1155Tradable.operator();
      expect(newOperator.toLowerCase()).to.equal(newOperatorContract.toLowerCase());
      // Create token with new creator
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        newOperatorContract,
        executeFunc,
        dataCreateToken,
        private_keys[2]
      );
      // Verify token is create success and creator is the right address
      const isTokenExists = await erc1155Tradable.exists(tokenId);
      const tokenSupply = await erc1155Tradable.totalSupply(tokenId);
      const creator = await erc1155Tradable.getCreator(tokenId);
      expect(isTokenExists).to.equal(true);
      expect(tokenSupply).to.equal(numberTokenCreate);
      expect(creator.toLowerCase()).to.equal(newOperatorContract.toLowerCase());
    });

    it("- Test setCreator for invalid address", async () => {
      const executeFunc = "create";
      // Operator sign contract then create token
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc,
        dataCreateToken,
        private_keys[1]
      );
      const isTokenExists = await erc1155Tradable.exists(tokenId);
      expect(isTokenExists).to.equal(true);
      // Set New Create for given token with invalid address
      const executeFunc1 = "setCreator";
      const data1 = ["0x0000000000000000000000000000000000000000", [tokenId]];
      try {
        await signAnotherContractThenExcuteFunction(
          jsonFile,
          erc1155TradbleAddress,
          operatorContract,
          executeFunc1,
          data1,
          private_keys[1]
        );
      } catch (error) {
        expect(error.toString()).to.include("INVALID_ADDRESS");
      }
      // Verify creator is operator 1
      const creator = await erc1155Tradable.getCreator(tokenId);
      expect(creator).to.equal(operatorContract);
    });

    it("- Test setCreator without existed token", async () => {
      const isTokenExists = await erc1155Tradable.exists(tokenId);
      expect(isTokenExists).to.equal(false);
      // Set New Create for given token with invalid address
      const executeFunc1 = "setCreator";
      const data1 = [newOperatorContract, [tokenId]];
      try {
        await signAnotherContractThenExcuteFunction(
          jsonFile,
          erc1155TradbleAddress,
          operatorContract,
          executeFunc1,
          data1,
          private_keys[1]
        );
      } catch (error) {
        expect(error.toString()).to.include("ONLY_CREATOR");
      }
    });

    it("- Test setCreator by admin", async () => {
      const executeFunc = "create";
      // Operator sign contract then create token
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc,
        dataCreateToken,
        private_keys[1]
      );
      const isTokenExists = await erc1155Tradable.exists(tokenId);
      expect(isTokenExists).to.equal(true);
      // Set New Create for given token with invalid address
      const executeFunc1 = "setCreator";
      const data1 = [newOperatorContract, [tokenId]];
      try {
        await signAnotherContractThenExcuteFunction(
          jsonFile,
          erc1155TradbleAddress,
          adminContract,
          executeFunc1,
          data1,
          private_keys[0]
        );
      } catch (error) {
        expect(error.toString()).to.include("ONLY_OPERATOR");
      }
    });

    it("- Test set custom URI by creator", async () => {
      const executeFunc = "create";
      // Operator sign contract then create token
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc,
        dataCreateToken,
        private_keys[1]
      );
      const isTokenExists = await erc1155Tradable.exists(tokenId);
      expect(isTokenExists).to.equal(true);
      // Set custom URI by creator
      const executeFunc1 = "setCustomURI";
      const dataSetCustomURI = [tokenId, newTokenURI];

      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc1,
        dataSetCustomURI,
        private_keys[1]
      );
      const tokenURIChanged = await erc1155Tradable.uri(tokenId);
      expect(tokenURIChanged).to.equal(newTokenURI);
    });

    it("- Test set custom URI by non creator", async () => {
      const executeFunc = "create";
      // Operator sign contract then create token
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc,
        dataCreateToken,
        private_keys[1]
      );
      const isTokenExists = await erc1155Tradable.exists(tokenId);
      expect(isTokenExists).to.equal(true);
      // Set custom URI by creator
      const executeFunc1 = "setCustomURI";
      const dataSetCustomURI = [tokenId, newTokenURI];
      try {
        await signAnotherContractThenExcuteFunction(
          jsonFile,
          erc1155TradbleAddress,
          newOperatorContract,
          executeFunc1,
          dataSetCustomURI,
          private_keys[2]
        );
      } catch (error) {
        expect(error.toString()).to.include("ONLY_CREATOR");
      }
    });

    it("- Test set URI by operator", async () => {
      const executeFunc = "create";
      // Operator sign contract then create token
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc,
        dataCreateToken,
        private_keys[1]
      );
      // Verify token is create success
      const isTokenExists = await erc1155Tradable.exists(tokenId);
      expect(isTokenExists).to.equal(true);
      // set Uri by operator
      const executeFunc1 = "setURI";
      const dataSetURI = [newTokenURI];

      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc1,
        dataSetURI,
        private_keys[1]
      );
      const URIChanged = await erc1155Tradable.uri(tokenId);
      // expect(URIChanged).to.equal(newTokenURI);
    });
  });
  context("* Mint", () => {
    const executeFuncMint = "mint";
    const numberTokenMint = 9999;
    const dataMint = [adminContract, tokenId, numberTokenMint, private_keys[0]];

    it("- Test mint by creator", async () => {
      const executeFunc = "create";
      // Operator sign contract then create token
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc,
        dataCreateToken,
        private_keys[1]
      );
      // Verify token is create success
      const isTokenExists = await erc1155Tradable.exists(tokenId);
      const tokenSupplyBeforeMint = await erc1155Tradable.tokenSupply(tokenId);
      expect(isTokenExists).to.equal(true);

      // Mint by creator
      // Operator sign contract then create token
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFuncMint,
        dataMint,
        private_keys[1]
      );
      const tokenSupplyAfterMint = await erc1155Tradable.tokenSupply(tokenId);
      expect(parseFloat(tokenSupplyBeforeMint) + numberTokenMint).to.equal(tokenSupplyAfterMint);
    });

    it("- Test non creator can't mint", async () => {
      const executeFunc = "create";
      const changedAdminPrivateKey = private_keys[0];
      // Operator sign contract then create token
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc,
        dataCreateToken,
        private_keys[1]
      );
      // Verify token is create success and creator is the right address
      const isTokenExists = await erc1155Tradable.exists(tokenId);
      expect(isTokenExists).to.equal(true);
      // Change new creator for given token
      const executeFunc1 = "changeOperator";
      const data = [newOperatorContract];
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        adminContract,
        executeFunc1,
        data,
        changedAdminPrivateKey
      );
      // Mint after set New creator
      try {
        await signAnotherContractThenExcuteFunction(
          jsonFile,
          erc1155TradbleAddress,
          newOperatorContract,
          executeFuncMint,
          dataMint,
          private_keys[2]
        );
      } catch (error) {
        console.log(error);
        expect(error.toString()).to.include("ONLY_CREATOR");
      }
    });

    it("- Test mint after set new creator", async () => {
      const executeFunc = "create";
      // Operator sign contract then create token
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc,
        dataCreateToken,
        private_keys[1]
      );
      // Verify token is create success and creator is the right address
      const isTokenExists = await erc1155Tradable.exists(tokenId);
      const tokenSupplyBeforeMint = await erc1155Tradable.totalSupply(tokenId);
      expect(isTokenExists).to.equal(true);
      // Change new creator for given token
      const executeFunc1 = "setCreator";
      const data1 = [newOperatorContract, [tokenId]];
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc1,
        data1,
        private_keys[1]
      );
      // Mint after set New creator
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        newOperatorContract,
        executeFuncMint,
        dataMint,
        private_keys[2]
      );
      const tokenSupplyAfterMint = await erc1155Tradable.tokenSupply(tokenId);
      expect(parseFloat(tokenSupplyBeforeMint) + numberTokenMint).to.equal(tokenSupplyAfterMint);
    });
  });

  context("* BatchMint", () => {
    const executeFuncBatchMint = "batchMint";
    const numberTokenMint = 1;
    const dataBatchMint = [adminContract, [tokenId], [numberTokenMint], private_keys[0]];
    it("- Test batchMint by operator", async () => {
      const executeFunc = "create";
      // Operator sign contract then create token
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc,
        dataCreateToken,
        private_keys[1]
      );
      // Verify token is create success
      const isTokenExists = await erc1155Tradable.exists(tokenId);
      const tokenSupplyBeforeMint = await erc1155Tradable.tokenSupply(tokenId);
      expect(isTokenExists).to.equal(true);

      // Mint by creator
      // Operator sign contract then create token
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFuncBatchMint,
        dataBatchMint,
        private_keys[1]
      );
      const tokenSupplyAfterMint = await erc1155Tradable.tokenSupply(tokenId);
      expect(parseFloat(tokenSupplyBeforeMint) + numberTokenMint).to.equal(tokenSupplyAfterMint);
    });

    it("- Test batchMint by non operator", async () => {
      const executeFunc = "create";
      // Operator sign contract then create token
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc,
        dataCreateToken,
        private_keys[1]
      );
      // Verify token is create success
      const isTokenExists = await erc1155Tradable.exists(tokenId);
      const tokenSupplyBeforeMint = await erc1155Tradable.tokenSupply(tokenId);
      expect(isTokenExists).to.equal(true);
      // Mint by non operator
      try {
        await erc1155Tradable.batchMint(adminContract, [tokenId], [numberTokenMint], private_keys[0]);
      } catch (error) {
        expect(error.toString()).to.include("ONLY_OPERATOR");
      }
      const tokenSupplyAfterMint = await erc1155Tradable.tokenSupply(tokenId);
      expect(tokenSupplyBeforeMint).to.equal(tokenSupplyAfterMint);
    });
  });

  context.skip("* Whitelist token ID", () => {
    // Everyone can mint if toke id in white list
    // Only creator has MINT_ROLE can mint if token id is not in whitelist
    it("- Test everyone can mint if token id is in whitelsit", async () => {
      const executeFunc = "create";
      // Operator sign contract then create token
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc,
        dataCreateToken,
        private_keys[1]
      );
      // Verify token is create success and creator is the right address
      const isTokenExists = await erc1155Tradable.exists(tokenId);
      const tokenSupplyBeforeMint = await erc1155Tradable.totalSupply(tokenId);
      console.log("Before mint:", tokenSupplyBeforeMint);
      expect(isTokenExists).to.equal(true);
      // set whitelist for created token ID - 1
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        "changeWhiteListMintTokenIds",
        [[tokenId]],
        private_keys[1]
      );
      // mint after set whitelist
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        newOperatorContract, // not set operator role
        "mint",
        [adminContract, tokenId, 5, private_keys[0]],
        private_keys[2]
      );
      const tokenSupplyAfterMint = await erc1155Tradable.totalSupply(tokenId);
      console.log("After mint:", tokenSupplyAfterMint);
      expect(tokenSupplyAfterMint).to.equal(tokenSupplyBeforeMint.add(5));
    });

    it("- Test Non operator changes whitelist for TokenID", async () => {
      try {
        await erc1155Tradable.changeWhiteListMintTokenIds([tokenId]);
      } catch (error) {
        console.error(error);
        expect(error.toString()).to.include("ONLY_OPERATOR");
      }
    });

    it("- Test mint list whitelist token ID", async () => {
      const executeFunc = "create";
      const tokenId2 = 2;
      const tokenId3 = 3;

      const numberToken2Create = 15;
      const numberToken3Create = 15;

      // Operator sign contract then create token 1
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc,
        dataCreateToken,
        private_keys[1]
      );
      // Create token 2
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc,
        [adminContract, tokenId2, numberToken2Create, tokenURI, "0x00"],
        private_keys[1]
      );
      // Create token 3
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc,
        [adminContract, tokenId3, numberToken3Create, tokenURI, "0x00"],
        private_keys[1]
      );
      const isToken1Exists = await erc1155Tradable.exists(tokenId);
      const isToken2Exists = await erc1155Tradable.exists(tokenId2);
      expect(isToken1Exists).to.equal(true);
      expect(isToken2Exists).to.equal(true);
      const balanceOfToken1 = await erc1155Tradable.balanceOf(adminContract, tokenId);
      const balanceOfToken2 = await erc1155Tradable.balanceOf(adminContract, tokenId2);
      expect(balanceOfToken1).to.equal(numberTokenCreate);
      expect(balanceOfToken2).to.equal(numberToken2Create);

      // add 2 tokens to whitelist
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        "changeWhiteListMintTokenIds",
        [[tokenId, tokenId2]],
        private_keys[1]
      );

      // mint 2 token by non creator with mint role
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        newOperatorContract, // not set operator role
        "mint",
        [adminContract, tokenId, 5, private_keys[0]],
        private_keys[2]
      );
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        newOperatorContract, // not set operator role
        "mint",
        [adminContract, tokenId2, 5, private_keys[0]],
        private_keys[2]
      );
      // check balance after mint
      const balanceOfToken1AfterMint = await erc1155Tradable.balanceOf(adminContract, tokenId);
      const balanceOfToken2AfterMint = await erc1155Tradable.balanceOf(adminContract, tokenId2);
      expect(balanceOfToken1.add(5)).to.equal(balanceOfToken1AfterMint);
      expect(balanceOfToken2.add(5)).to.equal(balanceOfToken2AfterMint);
      // non creator without mint role mint token is not in whitelist
      try {
        await signAnotherContractThenExcuteFunction(
          jsonFile,
          erc1155TradbleAddress,
          newOperatorContract, // not set operator role
          "mint",
          [adminContract, tokenId3, 5, private_keys[0]],
          private_keys[2]
        );
      } catch (error) {
        expect(error.toString()).to.include("ONLY_CREATOR");
      }
    });
  });

  context("* Royalty", () => {
    const percentRecieve = 700; // percent reciever decimals 2
    const defaultpercentRecieve = 500; // default is 5%
    const overPercent = 10100; // 101%
    const salePriceRoyalty = 900;
    const receiver = "0xab5801a7d398351b8be11c439e05c5b3259aec9b";
    it("- Test set/get valid royalty", async () => {
      const executeFunc = "create";
      // Operator sign contract then create token
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc,
        dataCreateToken,
        private_keys[1]
      );

      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        "setTokenRoyalty",
        [tokenId, receiver, percentRecieve],
        private_keys[1]
      );
      const _royaltyInfo = await erc1155Tradable.royaltyInfo(tokenId, salePriceRoyalty);
      console.log("Royalty info: ", _royaltyInfo);
      expect(_royaltyInfo[1]).to.equal((salePriceRoyalty * percentRecieve) / 10000);
    });

    it("- Test get royalty without set", async () => {
      const executeFunc = "create";
      // Operator sign contract then create token
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc,
        dataCreateToken,
        private_keys[1]
      );
      const _royaltyInfo = await erc1155Tradable.royaltyInfo(tokenId, salePriceRoyalty);
      console.log("Royalty info: ", _royaltyInfo);
      expect(_royaltyInfo[1]).to.equal((salePriceRoyalty * defaultpercentRecieve) / 10000);
    });

    it("- Test set percent royalty over 100%", async () => {
      const executeFunc = "create";
      // Operator sign contract then create token
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc,
        dataCreateToken,
        private_keys[1]
      );
      try {
        await signAnotherContractThenExcuteFunction(
          jsonFile,
          erc1155TradbleAddress,
          operatorContract,
          "setTokenRoyalty",
          [tokenId, receiver, overPercent],
          private_keys[1]
        );
      } catch (error) {
        expect(error.toString()).to.include("TOO_HIGH");
      }
      const _royaltyInfo = await erc1155Tradable.royaltyInfo(tokenId, salePriceRoyalty);
      console.log("Royalty info: ", _royaltyInfo);
      expect(_royaltyInfo[1]).to.equal((salePriceRoyalty * defaultpercentRecieve) / 10000);
    });

    it("- Test non operator role set royalty", async () => {
      const executeFunc = "create";
      // Operator sign contract then create token
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc,
        dataCreateToken,
        private_keys[1]
      );
      try {
        await erc1155Tradable.setTokenRoyalty(tokenId, receiver, percentRecieve);
      } catch (error) {
        expect(error.toString()).to.include("ONLY_OPERATOR");
      }

      const _royaltyInfo = await erc1155Tradable.royaltyInfo(tokenId, salePriceRoyalty);
      console.log("Royalty info: ", _royaltyInfo);
      expect(_royaltyInfo[1]).to.equal((salePriceRoyalty * percentRecieve) / 10000);
    });
  });

  context("* Create with price and max token", () => {
    const tokenQuantity = 9;
    const userContract = addresses[3];
    const maxSupplyToken = 20;
    const tokenPrice = 10; // WEI
    const ethValue = 90; // WEI
    const dataNewCreateToken = [
      adminContract,
      tokenId,
      numberTokenCreate,
      tokenURI,
      "0x00",
      tokenPrice,
      maxSupplyToken,
    ];
    const web3 = createAlchemyWeb3(hardhatConfig.networks[hardhatConfig.defaultNetwork].url);

    it("- Test create token with price and max token", async () => {
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        "create",
        dataNewCreateToken,
        private_keys[1]
      );
      // check max supply and price of token
      const _maxSupplyToken = await erc1155Tradable.getMaxSupplyToken(tokenId);
      const _tokenPrice = await erc1155Tradable.getPriceToken(tokenId);
      console.log("Max supply token: ", _maxSupplyToken);
      console.log("Price of token: ", _tokenPrice);
      expect(_maxSupplyToken).to.equal(maxSupplyToken);
      expect(_tokenPrice).to.equal(tokenPrice);
      // none operator can't change price token
      const newTokenPrice = 5;
      try {
        await erc1155Tradable.changePriceToken(tokenId, newTokenPrice);
      } catch (error) {
        expect(error.toString()).to.include("ONLY_OPERATOR");
      }
      // Operator change token price
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        "changePriceToken",
        [tokenId, newTokenPrice],
        private_keys[1]
      );
      const _newTokenPrice = await erc1155Tradable.getPriceToken(tokenId);
      console.log("New price of token after changed: ", _newTokenPrice);
      expect(_newTokenPrice).to.equal(newTokenPrice);
    });

    it("- Test user mint with value greater than token price", async () => {
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        "create",
        dataNewCreateToken,
        private_keys[1]
      );
      // check max supply and price of token
      const _maxSupplyToken = await erc1155Tradable.getMaxSupplyToken(tokenId);
      const _tokenPrice = await erc1155Tradable.getPriceToken(tokenId);
      console.log("Max supply token: ", _maxSupplyToken);
      console.log("Price of token: ", _tokenPrice);
      expect(_maxSupplyToken).to.equal(maxSupplyToken);
      expect(_tokenPrice).to.equal(tokenPrice);
      const tokenSupplyBeforeMint = await erc1155Tradable.tokenSupply(tokenId);
      console.log("tokenSupplyBeforeMint: ", tokenSupplyBeforeMint);

      //user mint
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        erc1155TradbleAddress,
        userContract,
        ethValue,
        "userMint",
        [userContract, tokenId, tokenQuantity, "0x00"],
        private_keys[3]
      );
      const tokenSupplyAfterMint = await erc1155Tradable.tokenSupply(tokenId);
      console.log("tokenSupplyAfterMint: ", tokenSupplyAfterMint);
      expect(tokenSupplyAfterMint).to.equal(tokenSupplyBeforeMint.add(9));
      // check balance ETH after user mint
      const balanceEth = await web3.eth.getBalance(erc1155TradbleAddress);
      console.log("balance ETH after mint: ", balanceEth);
      expect(balanceEth).to.equal(ethValue.toString());
    });

    it("- Test user mint with value smaller than token price", async () => {
      const userContract = addresses[3];
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        "create",
        dataNewCreateToken,
        private_keys[1]
      );
      // check max supply and price of token
      const _maxSupplyToken = await erc1155Tradable.getMaxSupplyToken(tokenId);
      const _tokenPrice = await erc1155Tradable.getPriceToken(tokenId);
      console.log("Max supply token: ", _maxSupplyToken);
      console.log("Price of token: ", _tokenPrice);
      expect(_maxSupplyToken).to.equal(maxSupplyToken);
      expect(_tokenPrice).to.equal(tokenPrice);
      const tokenSupplyBeforeMint = await erc1155Tradable.tokenSupply(tokenId);
      console.log("tokenSupplyBeforeMint: ", tokenSupplyBeforeMint);

      //user mint
      try {
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          erc1155TradbleAddress,
          userContract,
          89, // 2 ETH
          "userMint",
          [userContract, tokenId, tokenQuantity, "0x00"],
          private_keys[3]
        );
      } catch (error) {
        expect(error.toString()).to.include("MISS_PRICE");
      }
    });

    it("- Test user mint greater than max supply", async () => {
      const userContract = addresses[3];
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        "create",
        dataNewCreateToken,
        private_keys[1]
      );
      // check max supply and price of token
      const _maxSupplyToken = await erc1155Tradable.getMaxSupplyToken(tokenId);
      const _tokenPrice = await erc1155Tradable.getPriceToken(tokenId);
      console.log("Max supply token: ", _maxSupplyToken);
      console.log("Price of token: ", _tokenPrice);
      expect(_maxSupplyToken).to.equal(maxSupplyToken);
      expect(_tokenPrice).to.equal(tokenPrice);
      const tokenSupplyBeforeMint = await erc1155Tradable.tokenSupply(tokenId);
      console.log("tokenSupplyBeforeMint: ", tokenSupplyBeforeMint);

      // check balance eth before mint
      const balanceEthBeforMint = await web3.eth.getBalance(erc1155TradbleAddress);
      console.log("balance ETH before mint: ", balanceEthBeforMint);
      expect(balanceEthBeforMint).to.equal("0");
      try {
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          erc1155TradbleAddress,
          userContract,
          ethValue, // 0.0002 ETH
          "userMint",
          [userContract, tokenId, 20, "0x00"],
          private_keys[3]
        );
      } catch (error) {
        expect(error.toString()).to.include("REACH_MAX");
      }
    });

    it("- Test token price is 0", async () => {
      const userContract = addresses[3];
      const dataNewCreateTokenPriceOne = [
        adminContract,
        tokenId,
        numberTokenCreate,
        tokenURI,
        "0x00",
        0, // tokenPrice
        maxSupplyToken,
      ];
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        "create",
        dataNewCreateTokenPriceOne,
        private_keys[1]
      );
      // check max supply and price of token
      const _maxSupplyToken = await erc1155Tradable.getMaxSupplyToken(tokenId);
      const _tokenPrice = await erc1155Tradable.getPriceToken(tokenId);
      console.log("Max supply token: ", _maxSupplyToken);
      console.log("Price of token: ", _tokenPrice);
      expect(_maxSupplyToken).to.equal(maxSupplyToken);
      expect(_tokenPrice).to.equal(0);
      const tokenSupplyBeforeMint = await erc1155Tradable.tokenSupply(tokenId);
      console.log("tokenSupplyBeforeMint: ", tokenSupplyBeforeMint);

      //user mint
      try {
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          erc1155TradbleAddress,
          userContract,
          89, // 2 ETH
          "userMint",
          [userContract, tokenId, 2, "0x00"], // mint 2 token when price is 0
          private_keys[3]
        );
      } catch (error) {
        expect(error.toString()).to.include("MAX_QUANTITY");
      }

      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        erc1155TradbleAddress,
        userContract,
        89, // 2 ETH
        "userMint",
        [userContract, tokenId, 1, "0x00"],
        private_keys[3]
      );
      const tokenSupplyafterMint = await erc1155Tradable.tokenSupply(tokenId);
      console.log("tokenSupplyafterMint: ", tokenSupplyafterMint);
    });

    it("- Test withdraw after user mint", async () => {
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        "create",
        dataNewCreateToken,
        private_keys[1]
      );
      // check max supply and price of token
      const _maxSupplyToken = await erc1155Tradable.getMaxSupplyToken(tokenId);
      const _tokenPrice = await erc1155Tradable.getPriceToken(tokenId);
      console.log("Max supply token: ", _maxSupplyToken);
      console.log("Price of token: ", _tokenPrice);
      expect(_maxSupplyToken).to.equal(maxSupplyToken);
      expect(_tokenPrice).to.equal(tokenPrice);
      const tokenSupplyBeforeMint = await erc1155Tradable.tokenSupply(tokenId);
      console.log("tokenSupplyBeforeMint: ", tokenSupplyBeforeMint);

      //user mint
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        erc1155TradbleAddress,
        userContract,
        ethValue,
        "userMint",
        [userContract, tokenId, tokenQuantity, "0x00"],
        private_keys[3]
      );
      const tokenSupplyAfterMint = await erc1155Tradable.tokenSupply(tokenId);
      console.log("tokenSupplyAfterMint: ", tokenSupplyAfterMint);
      expect(tokenSupplyAfterMint).to.equal(tokenSupplyBeforeMint.add(9));
      // check balance ETH after user mint
      const balanceEth = await web3.eth.getBalance(erc1155TradbleAddress);
      console.log("balance ETH after user mint: ", balanceEth);
      expect(balanceEth).to.equal(ethValue.toString());

      // process withdraw
      const receiver = "0xab5801a7d398351b8be11c439e05c5b3259aec9b";
      const receiverEthBalance = await web3.eth.getBalance(receiver);
      console.log("Receiver Eth Balance before withdraw: ", receiverEthBalance);
      // check balance eth of receiver before withdraw
      // expect(receiverEthBalance).to.equal("10000000000000000000000");
      // withdraw;
      await erc1155Tradable.withdraw(receiver);
      const receiverEthBalanceAfterWithdraw = await web3.eth.getBalance(receiver);
      console.log("Receiver Eth Balance after withdraw: ", receiverEthBalanceAfterWithdraw);
      expect(parseInt(receiverEthBalanceAfterWithdraw)).to.equal(parseInt(receiverEthBalance) + ethValue);
      // continue withdraw
      try {
        await erc1155Tradable.withdraw(receiver);
      } catch (error) {
        expect(error.toString()).to.include("NOT_ENOUGH");
      }
    });

    it("- Test withdraw by non admin after user mint", async () => {
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        "create",
        dataNewCreateToken,
        private_keys[1]
      );
      // check max supply and price of token
      const _maxSupplyToken = await erc1155Tradable.getMaxSupplyToken(tokenId);
      const _tokenPrice = await erc1155Tradable.getPriceToken(tokenId);
      console.log("Max supply token: ", _maxSupplyToken);
      console.log("Price of token: ", _tokenPrice);
      expect(_maxSupplyToken).to.equal(maxSupplyToken);
      expect(_tokenPrice).to.equal(tokenPrice);
      const tokenSupplyBeforeMint = await erc1155Tradable.tokenSupply(tokenId);
      console.log("tokenSupplyBeforeMint: ", tokenSupplyBeforeMint);

      //user mint
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        erc1155TradbleAddress,
        userContract,
        ethValue,
        "userMint",
        [userContract, tokenId, tokenQuantity, "0x00"],
        private_keys[3]
      );
      const tokenSupplyAfterMint = await erc1155Tradable.tokenSupply(tokenId);
      console.log("tokenSupplyAfterMint: ", tokenSupplyAfterMint);
      expect(tokenSupplyAfterMint).to.equal(tokenSupplyBeforeMint.add(9));
      // check balance ETH after user mint
      const balanceEth = await web3.eth.getBalance(erc1155TradbleAddress);
      console.log("balance ETH after user mint: ", balanceEth);
      expect(balanceEth).to.equal(ethValue.toString());

      // process withdraw
      const receiver = "0xab5801a7d398351b8be11c439e05c5b3259aec9b";
      const receiverEthBalance = await web3.eth.getBalance(receiver);
      console.log("Receiver Eth Balance before withdraw: ", receiverEthBalance);
      // check balance eth of receiver before withdraw
      // expect(receiverEthBalance).to.equal("10000000000000000000000");
      // withdraw;
      try {
        await signAnotherContractThenExcuteFunction(
          jsonFile,
          erc1155TradbleAddress,
          operatorContract,
          "withdraw",
          [receiver],
          private_keys[1]
        );
      } catch (error) {
        expect(error.toString()).to.include("ONLY_ADMIN");
      }

      const receiverEthBalanceAfterWithdraw = await web3.eth.getBalance(receiver);
      console.log("Receiver Eth Balance after withdraw: ", receiverEthBalanceAfterWithdraw);
      expect(receiverEthBalanceAfterWithdraw).to.equal(receiverEthBalance);
    });

    it("- Test withdraw by new admin after user mint", async () => {
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        "create",
        dataNewCreateToken,
        private_keys[1]
      );
      // check max supply and price of token
      const _maxSupplyToken = await erc1155Tradable.getMaxSupplyToken(tokenId);
      const _tokenPrice = await erc1155Tradable.getPriceToken(tokenId);
      console.log("Max supply token: ", _maxSupplyToken);
      console.log("Price of token: ", _tokenPrice);
      expect(_maxSupplyToken).to.equal(maxSupplyToken);
      expect(_tokenPrice).to.equal(tokenPrice);
      const tokenSupplyBeforeMint = await erc1155Tradable.tokenSupply(tokenId);
      console.log("tokenSupplyBeforeMint: ", tokenSupplyBeforeMint);

      //user mint
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        erc1155TradbleAddress,
        userContract,
        ethValue,
        "userMint",
        [userContract, tokenId, tokenQuantity, "0x00"],
        private_keys[3]
      );
      const tokenSupplyAfterMint = await erc1155Tradable.tokenSupply(tokenId);
      console.log("tokenSupplyAfterMint: ", tokenSupplyAfterMint);
      expect(tokenSupplyAfterMint).to.equal(tokenSupplyBeforeMint.add(9));
      // check balance ETH after user mint
      const balanceEth = await web3.eth.getBalance(erc1155TradbleAddress);
      console.log("balance ETH after user mint: ", balanceEth);
      expect(balanceEth).to.equal(ethValue.toString());

      // process withdraw
      const receiver = "0xab5801a7d398351b8be11c439e05c5b3259aec9b";
      const receiverEthBalance = await web3.eth.getBalance(receiver);
      console.log("Receiver Eth Balance before withdraw: ", receiverEthBalance);
      // check balance eth of receiver before withdraw
      // expect(receiverEthBalance).to.equal("10000000000000000000000");
      // change admin
      await erc1155Tradable.changeAdmin(newAdmin);
      // withdraw by new admin;
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        newAdmin,
        "withdraw",
        [receiver],
        private_keys[3]
      );
      const receiverEthBalanceAfterWithdraw = await web3.eth.getBalance(receiver);
      console.log("Receiver Eth Balance after withdraw: ", receiverEthBalanceAfterWithdraw);
      expect(parseInt(receiverEthBalanceAfterWithdraw)).to.equal(parseInt(receiverEthBalance) + ethValue);
    });
    it("- Test mint with token greater than max supply", async () => {
      // call craete token
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        "create",
        dataNewCreateToken,
        private_keys[1]
      );
      // mint
      try {
        await signAnotherContractThenExcuteFunction(
          jsonFile,
          erc1155TradbleAddress,
          operatorContract,
          "mint",
          [userContract, tokenId, 100, "0x00"],
          private_keys[1]
        );
      } catch (error) {
        expect(error.toString()).to.include("REACH_MAX");
      }
    });
  });
});
