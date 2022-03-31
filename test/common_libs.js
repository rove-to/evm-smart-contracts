const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const path = require("path");
const { ethers } = require("hardhat");
const hardhatConfig = require("../hardhat.config");
const web3 = createAlchemyWeb3(hardhatConfig.networks[hardhatConfig.defaultNetwork].url);

let sleep = second => {
  return new Promise(resolve => {
    setTimeout(resolve, second * 1000);
  });
};

let signAnotherContractThenExcuteFunction = async (
  jsonFile, // json file of contract
  deployedContractAddress,
  instantSignContract, // instant sign contract
  executeFunc,
  data, // argument of excuteFunc type: array[]
  instantSignContractPrivateKey
) => {
  let contract = require(path.resolve(jsonFile));
  const web3 = createAlchemyWeb3(hardhatConfig.networks[hardhatConfig.defaultNetwork].url);
  const newInstant = new web3.eth.Contract(contract.abi, deployedContractAddress);
  const nonce = await web3.eth.getTransactionCount(instantSignContract, "latest"); //get latest nonce
  const tx = {
    from: instantSignContract,
    to: deployedContractAddress,
    nonce: nonce,
    gas: 500000,
    data: newInstant.methods[executeFunc](...data).encodeABI(),
  };
  const signedTx = await web3.eth.accounts.signTransaction(tx, instantSignContractPrivateKey);
  if (signedTx.rawTransaction != null) {
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
  }
};

let signAnotherContractThenExcuteFunctionWithValue = async (
  jsonFile, // json file of contract
  deployedContractAddress,
  instantSignContract, // instant sign contract
  value, // ETH
  executeFunc,
  data, // argument of excuteFunc type: array[]
  instantSignContractPrivateKey
) => {
  let contract = require(path.resolve(jsonFile));
  const web3 = createAlchemyWeb3(hardhatConfig.networks[hardhatConfig.defaultNetwork].url);
  const newInstant = new web3.eth.Contract(contract.abi, deployedContractAddress);
  const nonce = await web3.eth.getTransactionCount(instantSignContract, "latest"); //get latest nonce
  const tx = {
    from: instantSignContract,
    to: deployedContractAddress,
    nonce: nonce,
    gas: 500000,
    value: value,
    data: newInstant.methods[executeFunc](...data).encodeABI(),
  };
  const signedTx = await web3.eth.accounts.signTransaction(tx, instantSignContractPrivateKey);
  if (signedTx.rawTransaction != null) {
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
  }
};

let getEthBalance = async address => {
  let balance = await web3.eth.getBalance(address);
  return balance;
};

let convertWeiToEth = wei => {
  let _eth = web3.utils.fromWei(wei.toString(), "ether");
  return _eth;
};

// generate ETH
let ETH = eth => {
  let _eth = ethers.utils.parseEther(eth);
  return _eth;
};

module.exports = {
  sleep,
  getEthBalance,
  convertWeiToEth,
  ETH,
  signAnotherContractThenExcuteFunction,
  signAnotherContractThenExcuteFunctionWithValue,
};
