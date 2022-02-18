require("dotenv").config()

const {createAlchemyWeb3} = require("@alch/alchemy-web3")
const contract = require("../artifacts/contracts/goods/ObjectNFT.sol/ObjectNFT.json")

var API_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY

async function mintObjectNFT(network, PUBLIC_KEY, contractAddress, tokenURI) {
    if (network === 'rinkeby') {
        API_URL = process.env.RINKEBY_API_URL
    } else {
        return;
    }

    const web3 = createAlchemyWeb3(API_URL)
    const nftContract = new web3.eth.Contract(contract.abi, contractAddress)

    const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, "latest") //get latest nonce

    //the transaction
    const tx = {
        from: PUBLIC_KEY,
        to: contractAddress,
        nonce: nonce,
        gas: 500000,
        data: nftContract.methods.mintNFT(PUBLIC_KEY, tokenURI).encodeABI(),
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

mintObjectNFT(process.env.NETWORK, process.env.PUBLIC_KEY, process.env.OBJECT_NFT_SC, "https://gateway.pinata.cloud/ipfs/QmWYZQzeTHDMGcsUMgdJ64hgLrXk8iZKDRmbxWha4xdbbH");
