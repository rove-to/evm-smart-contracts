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
  instantAddress,
  instantNeedToChange, // current instant
  executeFunc,
  data, // argument of excuteFunc type: array[]
  instantNeedToChangePrivateKey
) => {
  let contract = require(path.resolve(jsonFile));
  const web3 = createAlchemyWeb3(
    hardhatConfig.networks[hardhatConfig.defaultNetwork].url
  );
  const newInstant = new web3.eth.Contract(contract.abi, instantAddress);
  const nonce = await web3.eth.getTransactionCount(
    instantNeedToChange,
    "latest"
  ); //get latest nonce
  const tx = {
    from: instantNeedToChange,
    to: instantAddress,
    nonce: nonce,
    gas: 500000,
    data: newInstant.methods[executeFunc](...data).encodeABI(),
  };
  const signedTx = await web3.eth.accounts.signTransaction(
    tx,
    instantNeedToChangePrivateKey
  );
  if (signedTx.rawTransaction != null) {
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
  }
};

module.exports = {
  sleep,
  signAnotherContractThenExcuteFunction,
};
