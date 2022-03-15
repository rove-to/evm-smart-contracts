// ethereum/scripts/deploy.js
import {createAlchemyWeb3} from "@alch/alchemy-web3";
import * as path from "path";

const {ethers} = require("hardhat");

class ObjectNFT {
    network: string;
    senderPublicKey: string;
    senderPrivateKey: string;

    constructor(network: any, senderPrivateKey: any, senderPublicKey: any) {
        this.network = network;
        this.senderPrivateKey = senderPrivateKey;
        this.senderPublicKey = senderPublicKey;
    }

    async deploy() {
        if (this.network == "local") {
            console.log("not run local");
            return;
        }

        const ObjectNFT = await ethers.getContractFactory("ObjectNFT");
        console.log("ObjectNFT.deploying ...")
        const ObjectNFTDeploy = await ObjectNFT.deploy(this.senderPublicKey, this.senderPublicKey);

        console.log("Rove ObjectNFT deployed:", ObjectNFTDeploy.address);
        return ObjectNFTDeploy.address;
    }

    async transfer(receiver: any, contractAddress: any, tokenID: number, amount: number, gas: number) {
        let API_URL: any;
        if (this.network === 'mumbai') {
            API_URL = process.env.POLYGON_MUMBAI_API_URL;
        } else {
            console.log("Not is mumbai");
            return;
        }

        // load contract
        let contract = require(path.resolve("./artifacts/contracts/goods/ObjectNFT.sol/ObjectNFT.json"));
        const web3 = createAlchemyWeb3(API_URL)
        const nftContract = new web3.eth.Contract(contract.abi, contractAddress)

        const nonce = await web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        //the transaction
        const tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
            gas: gas,
            data: nftContract.methods.safeTransferFrom(this.senderPublicKey, receiver, tokenID, amount, "0x").encodeABI(),
        }

        const signedTx = await web3.eth.accounts.signTransaction(tx, this.senderPrivateKey)
        if (signedTx.rawTransaction != null) {
            return await web3.eth.sendSignedTransaction(
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
    }

    async mintObjectNFT(ownerAddress: any, contractAddress: any, initSupply: number, tokenURI: string, gas: number) {
        let API_URL: any;
        if (this.network === 'mumbai') {
            API_URL = process.env.POLYGON_MUMBAI_API_URL;
        } else {
            console.log("Not is mumbai");
            return;
        }

        // load contract
        let contract = require(path.resolve("./artifacts/contracts/goods/ObjectNFT.sol/ObjectNFT.json"));
        const web3 = createAlchemyWeb3(API_URL)
        const nftContract = new web3.eth.Contract(contract.abi, contractAddress)

        const nonce = await web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        //the transaction
        const tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
            gas: gas,
            data: nftContract.methods.createNFT(ownerAddress, initSupply, tokenURI).encodeABI(),
        }

        const signedTx = await web3.eth.accounts.signTransaction(tx, this.senderPrivateKey)
        if (signedTx.rawTransaction != null) {
            return web3.eth.sendSignedTransaction(
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
    }
}


export {ObjectNFT};