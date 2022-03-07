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

describe("** NFTs ERC-1155 tradable", () => {
  let parameterControl;
  let parameterControlAddress;
  let adminContract = addresses[0]; // default for local
  let operatorContract = addresses[1];
  let newOperatorContract = addresses[2];
  let newAdmin = addresses[3];

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
      const changedAdminPrivateKey = private_keys[1];
      let contract = require(path.resolve(
        "./artifacts/contracts/utils/ERC1155Tradable.sol/ERC1155Tradable.json"
      ));
      const web3 = createAlchemyWeb3(
        hardhatConfig.networks[hardhatConfig.defaultNetwork].url
      );
      const parameterControl1 = new web3.eth.Contract(
        contract.abi,
        parameterControlAddress
      );
      const nonce = await web3.eth.getTransactionCount(
        operatorContract,
        "latest"
      ); //get latest nonce
      const tx = {
        from: operatorContract,
        to: parameterControlAddress,
        nonce: nonce,
        gas: 500000,
        data: parameterControl1.methods
          .changeOperator(newOperatorContract)
          .encodeABI(),
      };

      const signedTx = await web3.eth.accounts.signTransaction(
        tx,
        changedAdminPrivateKey
      );
      try {
        if (signedTx.rawTransaction != null) {
          await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        }
      } catch (error) {
        expect(error.toString()).to.include(
          "ERC1155Tradable#ownersOnly: ONLY_ADMIN_ALLOWED"
        );
      }
    });

    context("* Change admin function", () => {
      it("- Test change admin", async () => {
        await parameterControl.changeAdmin(newAdmin);
        const newAdminChanged = await parameterControl.admin();
        expect(newAdminChanged.toLowerCase()).to.equal(newAdmin.toLowerCase());
      });

      it("- Test non admin can't change admin", async () => {
        const changedAdminPrivateKey = private_keys[1];
        let contract = require(path.resolve(
          "./artifacts/contracts/utils/ERC1155Tradable.sol/ERC1155Tradable.json"
        ));
        const web3 = createAlchemyWeb3(
          hardhatConfig.networks[hardhatConfig.defaultNetwork].url
        );
        const parameterControl1 = new web3.eth.Contract(
          contract.abi,
          parameterControlAddress
        );
        const nonce = await web3.eth.getTransactionCount(
          operatorContract,
          "latest"
        ); //get latest nonce
        const tx = {
          from: operatorContract,
          to: parameterControlAddress,
          nonce: nonce,
          gas: 500000,
          data: parameterControl1.methods.changeAdmin(newAdmin).encodeABI(),
        };
        const signedTx = await web3.eth.accounts.signTransaction(
          tx,
          changedAdminPrivateKey
        );
        try {
          if (signedTx.rawTransaction != null) {
            await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
          }
        } catch (error) {
          expect(error.toString()).to.include(
            "ERC1155Tradable#ownersOnly: ONLY_ADMIN_ALLOWED"
          );
        }
      });

      it.only("- Test new admin can change operator", async () => {
        const changedAdminPrivateKey = private_keys[3];

        await parameterControl.changeAdmin(newAdmin);
        const newAdminChanged = await parameterControl.admin();
        expect(newAdminChanged.toLowerCase()).to.equal(newAdmin.toLowerCase());

        let contract = require(path.resolve(
          "./artifacts/contracts/utils/ERC1155Tradable.sol/ERC1155Tradable.json"
        ));
        const web3 = createAlchemyWeb3(
          hardhatConfig.networks[hardhatConfig.defaultNetwork].url
        );
        const parameterControl1 = new web3.eth.Contract(
          contract.abi,
          parameterControlAddress
        );
        const nonce = await web3.eth.getTransactionCount(newAdmin, "latest"); //get latest nonce
        const tx = {
          from: newAdmin,
          to: parameterControlAddress,
          nonce: nonce,
          gas: 500000,
          data: parameterControl1.methods
            .changeOperator(newOperatorContract)
            .encodeABI(),
        };
        const signedTx = await web3.eth.accounts.signTransaction(
          tx,
          changedAdminPrivateKey
        );
        if (signedTx.rawTransaction != null) {
          await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        }
        const newOperator = await parameterControl.operator();
        expect(newOperator.toLowerCase()).to.equal(
          newOperatorContract.toLowerCase()
        );
      });
    });
  });
});
