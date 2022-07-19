import {createAlchemyWeb3} from "@alch/alchemy-web3";
import * as path from "path";

const {ethers, upgrades} = require("hardhat");
const hardhatConfig = require("../../hardhat.config");


class Erc721 {
    network: string;
    senderPublicKey: string;
    senderPrivateKey: string;

    constructor(network: any, senderPrivateKey: any, senderPublicKey: any) {
        this.network = network;
        this.senderPrivateKey = senderPrivateKey;
        this.senderPublicKey = senderPublicKey;
    }

    async upgradeContract(proxyAddress: any, contractName: string) {
        const contractUpdated = await ethers.getContractFactory(contractName);
        upgrades.up
        console.log('Upgrading ' + contractName + '... by proxy ' + proxyAddress);
        const tx = await upgrades.upgradeProxy(proxyAddress, contractUpdated);
        console.log(contractName + ' upgraded on tx address ' + tx.address);
        return tx;
    }

    async deployUpgradeable(name: string, symbol: string, baseUri: string, adminAddress: any, operatorAddress: any) {
        if (this.network == "local") {
            console.log("not run local");
            return;
        }

        const ERC721TradableUpgradeable = await ethers.getContractFactory("ERC721TradableUpgradeable");
        console.log("ERC721TradableUpgradeable.deploying ...")
        const proxy = await upgrades.deployProxy(ERC721TradableUpgradeable, [name, symbol, baseUri, adminAddress, operatorAddress], {initializer: 'initialize(string, string, string, address, address)'});
        await proxy.deployed();
        console.log("ERC721TradableUpgradeable deployed at proxy:", proxy.address);
        return proxy.address;
    }

    getContract(contractAddress: any) {
        console.log("Network run", this.network, hardhatConfig.networks[this.network].url);
        if (this.network == "local") {
            console.log("not run local");
            return;
        }
        let API_URL: any;
        API_URL = hardhatConfig.networks[hardhatConfig.defaultNetwork].url;

        // load contract
        let contract = require(path.resolve("./artifacts/contracts/utils/ERC721TradableUpgradeable.sol/ERC721TradableUpgradeable.json"));
        const web3 = createAlchemyWeb3(API_URL)
        const nftContract = new web3.eth.Contract(contract.abi, contractAddress)
        return {web3, nftContract};
    }

    async signedAndSendTx(web3: any, tx: any) {
        const signedTx = await web3.eth.accounts.signTransaction(tx, this.senderPrivateKey)
        if (signedTx.rawTransaction != null) {
            let sentTx = await web3.eth.sendSignedTransaction(
                signedTx.rawTransaction,
                function (err: any, hash: any) {
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
            return sentTx;
        }
        return null;
    }

    async mintTo(contractAddress: any, toAddress: any, customUri: string = '', gas: number) {
        let temp = this.getContract(contractAddress);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        const fun = temp?.nftContract.methods.mintTo(toAddress, customUri);
        //the transaction
        const tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
            gas: gas,
            data: fun.encodeABI(),
        }

        if (tx.gas == 0) {
            tx.gas = await fun.estimateGas(tx);
        }

        return await this.signedAndSendTx(temp?.web3, tx);
    }

    async nextTokenId(contractAddress: any) {
        let temp = this.getContract(contractAddress);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        //the transaction
        const tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
        }

        const nextTokenId: any = await temp?.nftContract.methods.nextTokenId().call(tx);
        return nextTokenId;
    }
}

export {Erc721};