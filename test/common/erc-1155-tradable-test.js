var { solidity } = require("ethereum-waffle");
var chai = require("chai");
chai.use(solidity);
const { ethers } = require("hardhat");
const expect = chai.expect;
const { addresses, private_keys } = require("../constants");
const hardhatConfig = require("../../hardhat.config");
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
    - Test admin can't create token
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
*/

function sleep(second) {
  return new Promise(resolve => {
    setTimeout(resolve, second * 1000);
  });
}

async function signAnotherContractThenExcuteFunction(
  jsonFile,
  erc1155TradbleAddress,
  contractToChange,
  executeFunc,
  data, // argument of excuteFunc type: array[]
  contractToChangePrivateKey
) {
  let contract = require(path.resolve(jsonFile));
  const web3 = createAlchemyWeb3(
    hardhatConfig.networks[hardhatConfig.defaultNetwork].url
  );
  const erc1155_1 = new web3.eth.Contract(contract.abi, erc1155TradbleAddress);
  const nonce = await web3.eth.getTransactionCount(contractToChange, "latest"); //get latest nonce
  const tx = {
    from: contractToChange,
    to: erc1155TradbleAddress,
    nonce: nonce,
    gas: 500000,
    data: erc1155_1.methods[executeFunc](...data).encodeABI(),
  };
  const signedTx = await web3.eth.accounts.signTransaction(
    tx,
    contractToChangePrivateKey
  );
  if (signedTx.rawTransaction != null) {
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
  }
}

describe.only("** NFTs ERC-1155 tradable", () => {
  let erc1155Tradable;
  let erc1155TradbleAddress;
  let adminContract = addresses[0]; // default for local
  let operatorContract = addresses[1];
  let newOperatorContract = addresses[2];
  let newAdmin = addresses[3];
  const overFlowNumber = 9999999999999999999999999999;
  const jsonFile =
    "./artifacts/contracts/utils/ERC1155Tradable.sol/ERC1155Tradable.json";
  const tokenId = 1;
  const tokenURI =
    "https://gateway.pinata.cloud/ipfs/QmWYZQzeTHDMGcsUMgdJ64hgLrXk8iZKDRmbxWha4xdbbH";
  const numberTokenCreate = 9876543210;
  const dataCreateToken = [
    adminContract,
    tokenId,
    numberTokenCreate,
    tokenURI,
    operatorContract,
  ];

  beforeEach(async function () {
    console.log("Hardhat network", hardhatConfig.defaultNetwork);
    let Erc1155TradableContract = await ethers.getContractFactory(
      "ERC1155Tradable"
    );
    erc1155Tradable = await Erc1155TradableContract.deploy(
      "test",
      "test",
      { a: "b" },
      adminContract,
      operatorContract
    );
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
      expect(newOperator.toLowerCase()).to.equal(
        newOperatorContract.toLowerCase()
      );
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
        expect(error.toString()).to.include(
          "ERC1155Tradable#ownersOnly: ONLY_ADMIN_ALLOWED"
        );
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
      // Sign contracty with account is not admin then change admin
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
        expect(error.toString()).to.include(
          "ERC1155Tradable#ownersOnly: ONLY_ADMIN_ALLOWED"
        );
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
      expect(newOperator.toLowerCase()).to.equal(
        newOperatorContract.toLowerCase()
      );
    });
  });
  context("** Create token", () => {
    // Tests create token type by operator
    const newTokenURI =
      "https://gateway.pinata.cloud/ipfs/QmWYZQzeTHDMGcsUMgdJ64hgLrXk8iZKDRmbxWha4xdbbK";
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
        expect(error.toString()).to.include(
          "ERC1155Tradable#uri: NONEXISTENT_TOKEN"
        );
      }
    });

    it("- Test admin can't create token", async () => {
      try {
        await erc1155Tradable.create(
          adminContract,
          tokenId,
          numberTokenCreate,
          tokenURI,
          operatorContract
        );
      } catch (error) {
        expect(error.toString()).to.include(
          "ERC1155Tradable#ownersOnly: ONLY_OPERATOR_ALLOWED"
        );
      }
    });

    it("- Test operator can create token with supply is zero", async () => {
      const executeFunc = "create";
      const dataCreateZeroToken = [
        adminContract,
        tokenId,
        0,
        tokenURI,
        operatorContract,
      ];
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
      expect(newCreator.toLowerCase()).to.equal(
        newOperatorContract.toLowerCase()
      );
      // Check token URI after create token
      const uri = await erc1155Tradable.uri(tokenId);
      expect(uri).to.equal(tokenURI);
    });

    it("- Test create token with overflow number", async () => {
      const executeFunc = "create";
      const dataCreateToken = [
        adminContract,
        tokenId,
        overFlowNumber,
        tokenURI,
        operatorContract,
      ];
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
      expect(newOperator.toLowerCase()).to.equal(
        newOperatorContract.toLowerCase()
      );
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
        expect(error.toString()).to.include(
          "ERC1155Tradable#setCreator: INVALID_ADDRESS"
        );
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
        expect(error.toString()).to.include(
          "ERC1155Tradable#creatorOnly: ONLY_CREATOR_ALLOWED"
        );
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
        expect(error.toString()).to.include(
          "ERC1155Tradable#ownersOnly: ONLY_OPERATOR_ALLOWED"
        );
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
        expect(error.toString()).to.include(
          "ERC1155Tradable#creatorOnly: ONLY_CREATOR_ALLOWED"
        );
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
      expect(parseFloat(tokenSupplyBeforeMint) + numberTokenMint).to.equal(
        tokenSupplyAfterMint
      );
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
        expect(error.toString()).to.include(
          "ERC1155Tradable#creatorOnly: ONLY_CREATOR_ALLOWED"
        );
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
      expect(parseFloat(tokenSupplyBeforeMint) + numberTokenMint).to.equal(
        tokenSupplyAfterMint
      );
    });
  });
  context("* BatchMint", () => {
    const executeFuncBatchMint = "batchMint";
    const numberTokenMint = 1;
    const dataBatchMint = [
      adminContract,
      [tokenId],
      [numberTokenMint],
      private_keys[0],
    ];
    it("- Test batchMint by creator", async () => {
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
      expect(parseFloat(tokenSupplyBeforeMint) + numberTokenMint).to.equal(
        tokenSupplyAfterMint
      );
    });
  });
});
