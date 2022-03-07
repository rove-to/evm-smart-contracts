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
  parameterControlAddress,
  contractToChange,
  executeFunc,
  data,
  contractToChangePrivateKey
) {
  let contract = require(path.resolve(jsonFile));
  const web3 = createAlchemyWeb3(
    hardhatConfig.networks[hardhatConfig.defaultNetwork].url
  );
  const parameterControl1 = new web3.eth.Contract(
    contract.abi,
    parameterControlAddress
  );
  const nonce = await web3.eth.getTransactionCount(contractToChange, "latest"); //get latest nonce
  const tx = {
    from: contractToChange,
    to: parameterControlAddress,
    nonce: nonce,
    gas: 500000,
    data: parameterControl1.methods[executeFunc](data).encodeABI(),
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
  let parameterControl;
  let parameterControlAddress;
  let adminContract = addresses[0]; // default for local
  let operatorContract = addresses[1];
  let newOperatorContract = addresses[2];
  let newAdmin = addresses[3];
  const jsonFile =
    "./artifacts/contracts/utils/ERC1155Tradable.sol/ERC1155Tradable.json";

  beforeEach(async function () {
    console.log("Hardhat network", hardhatConfig.defaultNetwork);
    let ParameterControlContract = await ethers.getContractFactory(
      "ERC1155Tradable"
    );
    parameterControl = await ParameterControlContract.deploy(
      "test",
      "test",
      { a: "b" },
      adminContract,
      operatorContract
    );
    parameterControlAddress = parameterControl.address;
    console.log("ParameterControl deploy address", parameterControlAddress);
    const admin = await parameterControl.admin();
    const operator = await parameterControl.operator();
    console.log("Admin: ", admin);
    console.log("Operator: ", operator);
  });

  context("* Change operator function", () => {
    it("- Test admin can change operator", async () => {
      await parameterControl.changeOperator(newOperatorContract);
      const newOperator = await parameterControl.operator();
      expect(newOperator.toLowerCase()).to.equal(
        newOperatorContract.toLowerCase()
      );
    });

    it("- Test non admin can't change operator", async () => {
      const nonAdminPrivateKey = private_keys[1];
      const executeFunc = "changeOperator";
      // Sign contract with account is not admin then change operator
      try {
        await signAnotherContractThenExcuteFunction(
          jsonFile,
          parameterControlAddress,
          operatorContract,
          executeFunc,
          newOperatorContract,
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
      await parameterControl.changeAdmin(newAdmin);
      const newAdminChanged = await parameterControl.admin();
      expect(newAdminChanged.toLowerCase()).to.equal(newAdmin.toLowerCase());
    });

    it("- Test non admin can't change admin", async () => {
      const nonAdminPrivateKey = private_keys[1];
      const executeFunc = "changeAdmin";
      // Sign contracty with account is not admin then change admin
      try {
        await signAnotherContractThenExcuteFunction(
          jsonFile,
          parameterControlAddress,
          operatorContract,
          executeFunc,
          newAdmin,
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
      // Change to new admin
      await parameterControl.changeAdmin(newAdmin);
      const newAdminChanged = await parameterControl.admin();
      expect(newAdminChanged.toLowerCase()).to.equal(newAdmin.toLowerCase());
      // New admin sign contract then change operator
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        parameterControlAddress,
        newAdmin,
        executeFunc,
        newOperatorContract,
        changedAdminPrivateKey
      );
      await sleep(3);
      // Check new operator is changed success
      const newOperator = await parameterControl.operator();
      expect(newOperator.toLowerCase()).to.equal(
        newOperatorContract.toLowerCase()
      );
    });
  });
});
