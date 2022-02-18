require("dotenv").config()

const {createAlchemyWeb3} = require("@alch/alchemy-web3")
const contract = require("../../artifacts/contracts/monetary/Rove.sol/RoveToken.json")

var API_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY

async function schedule_minting(network, rove_token_contract_address, PUBLIC_KEY, rove_token_locktime_array) {
    if (network === 'rinkeby') {
        API_URL = process.env.RINKEBY_API_URL;
    } else if (network === 'ropsten') {
        API_URL = process.env.ROPSTEN_API_URL;
    } else {
        return;
    }

    console.log("rove token contract", rove_token_contract_address)
    console.log("rove token lock time array: ", rove_token_locktime_array);

    const web3 = createAlchemyWeb3(API_URL)
    const tokenContract = new web3.eth.Contract(contract.abi, rove_token_contract_address)
    console.log("tokenContractAddress ", rove_token_contract_address);

    const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, "latest") //get latest nonce
    console.log("nonce ", nonce);
    //the transaction
    const tx = {
        from: PUBLIC_KEY,
        to: rove_token_contract_address,
        nonce: nonce,
        gas: 500000,
        data: tokenContract.methods.schedule_minting(rove_token_locktime_array).encodeABI(),
    }

    const signPromise = web3.eth.accounts.signTransaction(tx, PRIVATE_KEY)
    signPromise
        .then((signedTx) => {
            web3.eth.sendSignedTransaction(
                signedTx.rawTransaction,
                function (err, hash) {
                    if (!err) {
                        console.log(
                            "The hash of your transaction is: ",
                            hash,
                            "\nCheck Alchemy's Mempool to view the status of your transaction!"
                        )
                    } else {
                        console.log(
                            "Something went wrong when submitting your transaction:",
                            err
                        )
                    }
                }
            )
        })
        .catch((err) => {
            console.log("Promise failed:", err)
        })
}


const roveTokenContract = process.argv.slice(2,3)[0];
const roveTokenlockTimeArray = process.argv.slice(3);
schedule_minting(process.env.NETWORK, roveTokenContract, process.env.PUBLIC_KEY, roveTokenlockTimeArray);
