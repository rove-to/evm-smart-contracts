const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const path = require("path");
const hardhatConfig = require("../hardhat.config");

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
  const web3 = createAlchemyWeb3(
    hardhatConfig.networks[hardhatConfig.defaultNetwork].url
  );
  const newInstant = new web3.eth.Contract(
    contract.abi,
    deployedContractAddress
  );
  const nonce = await web3.eth.getTransactionCount(
    instantSignContract,
    "latest"
  ); //get latest nonce
  const tx = {
    from: instantSignContract,
    to: deployedContractAddress,
    nonce: nonce,
    gas: 500000,
    data: newInstant.methods[executeFunc](...data).encodeABI(),
  };
  const signedTx = await web3.eth.accounts.signTransaction(
    tx,
    instantSignContractPrivateKey
  );
  if (signedTx.rawTransaction != null) {
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
  }
};

module.exports = {
  sleep,
  signAnotherContractThenExcuteFunction,
};
