// ethereum/scripts/deploy.js
import {createAlchemyWeb3} from "@alch/alchemy-web3";
import * as path from "path";

const {ethers} = require("hardhat");
const config = require("../../config");

class EnvironmentNFT {
    network: string;
    senderPublicKey: string;
    senderPrivateKey: string;

    constructor(network: any, senderPrivateKey: any, senderPublicKey: any) {
        this.network = network;
        this.senderPrivateKey = senderPrivateKey;
        this.senderPublicKey = senderPublicKey;
    }

    async deploy() {
        const EnvironmentNFT = await ethers.getContractFactory("EnvironmentNFT");
        const EnvironmentNFTDeploy = await EnvironmentNFT.deploy();

        console.log("Rove Environment NFT deployed:", EnvironmentNFTDeploy.address);
        return EnvironmentNFTDeploy.address;
    }

    async transfer(ownerAddress: any, receiver: any, contractAddress: any, tokenID: number, amount: number, gas: number) {
        let API_URL: any;
        if (this.network === 'mumbai') {
            API_URL = process.env.POLYGON_MUMBAI_API_URL;
        } else {
            console.log("Not is mumbai");
            return;
        }

        // load contract
        let contract = require(path.resolve("./artifacts/contracts/goods/EnvironmentNFT.sol/EnvironmentNFT.json"));
        const web3 = createAlchemyWeb3(API_URL)
        const nftContract = new web3.eth.Contract(contract.abi, contractAddress)

        const nonce = await web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        //the transaction
        const tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
            gas: gas,
            data: nftContract.methods.safeTransferFrom(ownerAddress, receiver, tokenID, amount, "0x").encodeABI(),
        }

        const signPromise = web3.eth.accounts.signTransaction(tx, this.senderPrivateKey)
        signPromise
            .then((signedTx) => {
                if (signedTx.rawTransaction != null) {
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
                }
            })
            .catch((err) => {
            })
    }

    async mintEnvironmentNFT(ownerAddress: any, contractAddress: any, initSupply: number, tokenURI: string, gas: number) {
        let API_URL: any;
        if (this.network === 'mumbai') {
            API_URL = process.env.POLYGON_MUMBAI_API_URL;
        } else {
            console.log("Not is mumbai");
            return;
        }

        // load contract
        let contract = require(path.resolve("./artifacts/contracts/goods/EnvironmentNFT.sol/EnvironmentNFT.json"));
        const web3 = createAlchemyWeb3(API_URL)
        const nftContract = new web3.eth.Contract(contract.abi, contractAddress)

        const nonce = await web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        //the transaction
        const tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
            gas: gas,
            data: nftContract.methods.mintNFT(ownerAddress, initSupply, tokenURI).encodeABI(),
        }

        const signPromise = web3.eth.accounts.signTransaction(tx, this.senderPrivateKey)
        signPromise
            .then((signedTx) => {
                if (signedTx.rawTransaction != null) {
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
                }
            })
            .catch((err) => {
            })
    }
}


export {EnvironmentNFT};