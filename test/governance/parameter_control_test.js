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

async function setAfterChangedAdmin(
  parameterControlAddress,
  newAccount,
  setFunc,
  data,
  privateKey
) {
  let contract = require(path.resolve(
    "./artifacts/contracts/governance/ParameterControl.sol/ParameterControl.json"
  ));
  const web3 = createAlchemyWeb3(
    hardhatConfig.networks[hardhatConfig.defaultNetwork].url
  );
  const parameterControl1 = new web3.eth.Contract(
    contract.abi,
    parameterControlAddress
  );
  const nonce = await web3.eth.getTransactionCount(newAccount, "latest"); //get latest nonce
  const tx = {
    from: newAccount,
    to: parameterControlAddress,
    nonce: nonce,
    gas: 500000,
    data: parameterControl1.methods[setFunc](data.key, data.value).encodeABI(),
  };
  const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
  if (signedTx.rawTransaction != null) {
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
  }
}

describe("** NFTs erc-1155 contract", function () {
  let parameterControl;
  let parameterControlAddress;
  let admin_contract = addresses[0]; // default for local

  beforeEach(async function () {
    console.log("Hardhat network", hardhatConfig.defaultNetwork);
    let ParameterControlContract = await ethers.getContractFactory(
      "ParameterControl"
    );
    parameterControl = await ParameterControlContract.deploy(admin_contract);
    // parameterControl = await ParameterControlContract.deploy('0x4Add2445E9C643Dd7C8044cC44B3a7a3479AE4D9'); // test multi sig rinkeby
    parameterControlAddress = parameterControl.address;
    console.log("ParameterControl deploy address", parameterControlAddress);
  });

  describe("* Check admin ", function () {
    it("- Check admin", async function () {
      let admin = await parameterControl.admin();
      console.log("expect admin: ", admin_contract);
      console.log("contract admin: ", admin);
      expect(admin.toLowerCase()).to.equal(admin_contract.toLowerCase());
    });

    it("- Change admin", async function () {
      const changedAdmin = process.env.PUBLIC_KEY;
      let tx = await parameterControl.updateAdmin(changedAdmin);
      await tx.wait();
      console.log("expect admin: ", changedAdmin);
      let admin = await parameterControl.admin();
      console.log("contract admin: ", admin);
      expect(admin).to.equal(changedAdmin);
    });

    it("- Change multi sig admin", async function () {
      const changedAdmin = "0x4Add2445E9C643Dd7C8044cC44B3a7a3479AE4D9";
      let tx = await parameterControl.updateAdmin(changedAdmin);
      await tx.wait();
      console.log("expect admin: ", changedAdmin);
      let admin = await parameterControl.admin();
      console.log("contract admin: ", admin);
      expect(admin).to.equal(changedAdmin);
    });
  });

  describe("* Get/Set with admin ", function () {
    it("- Test Set with value is number ", async function () {
      const temp = {
        key: "NFT_MINTER_PERCENT_PROFIT",
        value: 10,
      };
      await parameterControl.set(temp.key, temp.value);
      await sleep(3);
      const value = await parameterControl.get(temp.key);
      expect(value).to.equal("");
    });

    it("- Get/Set with old admin ", async function () {
      const temp = {
        key: "NFT_MINTER_PERCENT_PROFIT",
        value: "10",
      };
      let tx = await parameterControl.set(temp.key, temp.value);
      await tx.wait();
      const value = await parameterControl.get(temp.key);
      expect(value).to.equal(temp.value);
    });
    it("- Get/Set with new admin ", async function () {
      const changedAdmin = addresses[1];
      const changedAdminPrivateKey = private_keys[1];
      await parameterControl.updateAdmin(changedAdmin);
      await sleep(3);
      console.log("expect admin: ", changedAdmin);
      let admin = await parameterControl.admin();
      console.log("contract admin: ", admin);
      expect(admin).to.equal(changedAdmin);

      // set
      const temp = {
        key: "NFT_MINTER_PERCENT_PROFIT",
        value: "10",
      };
      let contract = require(path.resolve(
        "./artifacts/contracts/governance/ParameterControl.sol/ParameterControl.json"
      ));
      const web3 = createAlchemyWeb3(
        hardhatConfig.networks[hardhatConfig.defaultNetwork].url
      );
      const parameterControl1 = new web3.eth.Contract(
        contract.abi,
        parameterControlAddress
      );
      const nonce = await web3.eth.getTransactionCount(changedAdmin, "latest"); //get latest nonce
      const tx = {
        from: changedAdmin,
        to: parameterControlAddress,
        nonce: nonce,
        gas: 500000,
        data: parameterControl1.methods.set(temp.key, temp.value).encodeABI(),
      };
      const signedTx = await web3.eth.accounts.signTransaction(
        tx,
        changedAdminPrivateKey
      );
      if (signedTx.rawTransaction != null) {
        await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      }
      await sleep(3);

      // get
      let value = await parameterControl.get(temp.key);
      expect(value).to.equal(temp.value);
    });

    it("- Test Get/Set with non admin role", async () => {
      const changedAdmin = addresses[1];
      const changedAdminPrivateKey = private_keys[1];
      const funcName = "set";
      // set
      const data = {
        key: "NFT_MINTER_PERCENT_PROFIT",
        value: "10",
      };
      try {
        await setAfterChangedAdmin(
          parameterControlAddress,
          changedAdmin,
          funcName,
          data,
          changedAdminPrivateKey
        );
      } catch (error) {
        expect(error.toString()).to.include("Sender is not admin");
      }
      // get
      let value = await parameterControl.get(data.key);
      expect(value).to.equal("");
    });
  });

  describe("* GetInt/SetInt", () => {
    it("- Test SetInt with invalid value", async () => {
      const temp = {
        key: "NFT_MINTER_PERCENT_PROFIT",
        // value: ethers.utils.parseEther("1231232312312323"),
        value: "test-string",
      };
      try {
        await parameterControl.setInt(temp.key, temp.value);
      } catch (error) {
        expect(error.reason).to.equal("invalid BigNumber string");
      }
      await sleep(3);
      const value = await parameterControl.getInt(temp.key);
      expect(value).to.equal(0);
    });

    context("- SetInt with valid value", () => {
      const datas = [
        {
          key: "NFT_MINTER_PERCENT_PROFIT",
          value: ethers.utils.parseEther("2147483647"),
          // value: BigInt(9007199254740991),
        },
        {
          key: "NFT_MINTER_PERCENT_PROFIT",
          value: ethers.utils.parseEther("90071992547409919999999"),
        },
        {
          key: "NFT_MINTER_PERCENT_PROFIT",
          value: ethers.utils.parseEther("0"),
        },
      ];
      datas.forEach(data => {
        it("Test vsetInt/getInt with valid value", async () => {
          await parameterControl.setInt(data.key, data.value);
          await sleep(3);
          const value = await parameterControl.getInt(data.key);
          expect(value).to.equal(data.value);
        });
      });
    });

    it("- Test setInt/GetInt with new admin", async () => {
      const changedAdmin = addresses[1];
      const changedAdminPrivateKey = private_keys[1];
      const funcName = "setInt";
      await parameterControl.updateAdmin(changedAdmin);
      await sleep(3);
      console.log("expect admin: ", changedAdmin);
      let admin = await parameterControl.admin();
      console.log("contract admin: ", admin);
      expect(admin).to.equal(changedAdmin);

      // set
      const data = {
        key: "NFT_MINTER_PERCENT_PROFIT",
        value: ethers.utils.parseEther("2147483647"),
      };

      await setAfterChangedAdmin(
        parameterControlAddress,
        changedAdmin,
        funcName,
        data,
        changedAdminPrivateKey
      );
      await sleep(3);

      // get
      let value = await parameterControl.getInt(data.key);
      expect(value).to.equal(data.value);
    });

    it("- Test setInt/GetInt with non admin role", async () => {
      const changedAdmin = addresses[1];
      const changedAdminPrivateKey = private_keys[1];
      const funcName = "setInt";
      // set
      const data = {
        key: "NFT_MINTER_PERCENT_PROFIT",
        value: ethers.utils.parseEther("2147483647"),
      };
      try {
        await setAfterChangedAdmin(
          parameterControlAddress,
          changedAdmin,
          funcName,
          data,
          changedAdminPrivateKey
        );
      } catch (error) {
        expect(error.toString()).to.include("Sender is not admin");
      }
      await sleep(3);

      // get
      let value = await parameterControl.getInt(data.key);
      expect(value).to.equal(0);
    });
  });
});
