var { solidity } = require("ethereum-waffle");
var chai = require("chai");
chai.use(solidity);
const { ethers } = require("hardhat");
const expect = chai.expect;
const { addresses, private_keys } = require("../constants");
const hardhatConfig = require("../../hardhat.config");
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const path = require("path");

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
  data, // argument of excuteFunc type array[]
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

describe("** NFTs ERC-1155 tradable", () => {
  let erc1155Tradable;
  let erc1155TradbleAddress;
  let adminContract = addresses[0]; // default for local
  let operatorContract = addresses[1];
  let newOperatorContract = addresses[2];
  let newAdmin = addresses[3];
  const jsonFile =
    "./artifacts/contracts/utils/ERC1155Tradable.sol/ERC1155Tradable.json";

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
    // Tests create token type only created by operator
    let tokenId =
      "115792089237316195423570985008687907853269984665640564039457584007913129639935";
    let tokenURI =
      "https://gateway.pinata.cloud/ipfs/QmWYZQzeTHDMGcsUMgdJ64hgLrXk8iZKDRmbxWha4xdbbH";

    it("- Test token is not exists", async () => {
      const isTokenExists = await erc1155Tradable.exists(tokenId);
      expect(isTokenExists).to.equal(false);
    });
    it("- Test admin can't create token", async () => {
      try {
        await erc1155Tradable.create(
          adminContract,
          tokenId,
          95678,
          tokenURI,
          operatorContract
        );
      } catch (error) {
        expect(error.toString()).to.include(
          "ERC1155Tradable#ownersOnly: ONLY_OPERATOR_ALLOWED"
        );
      }
    });

    it("- Test operator can create token", async () => {
      const executeFunc = "create";
      const numberTokenCreate = 9876543210;
      const data = [
        adminContract,
        tokenId,
        numberTokenCreate,
        tokenURI,
        operatorContract,
      ];
      // Operator sign contract then create token
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        erc1155TradbleAddress,
        operatorContract,
        executeFunc,
        data,
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
      const newCreator = await erc1155Tradable.getCreator(tokenId);
      console.log("New creator: ", newCreator);
      expect(newCreator.toLowerCase()).to.equal(
        newOperatorContract.toLowerCase()
      );
    });
  });
});
