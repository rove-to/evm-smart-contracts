import {createAlchemyWeb3} from "@alch/alchemy-web3";
import * as path from "path";

const {ethers, upgrades} = require("hardhat");
const hardhatConfig = require("../../hardhat.config");
const Web3 = require('web3');

class Marketplace {
    network: string;
    senderPublicKey: string;
    senderPrivateKey: string;

    constructor(network: any, senderPrivateKey: any, senderPublicKey: any) {
        this.network = network;
        this.senderPrivateKey = senderPrivateKey;
        this.senderPublicKey = senderPublicKey;
    }

    async deploy(operatorAddress: any, paramAddress: any) {
        if (this.network == "local") {
            console.log("not run local");
            return;
        }

        const RoveMarketPlace = await ethers.getContractFactory("RoveMarketPlace");
        console.log("RoveMarketPlace.deploying ...")
        const RoveMarketPlaceDeploy = await RoveMarketPlace.deploy(operatorAddress, paramAddress);

        console.log("RoveMarketPlace deployed:", RoveMarketPlaceDeploy.address);
        return RoveMarketPlaceDeploy.address;
    }

    async deployUpgradeable(operatorAddress: any, paramAddress: any) {
        if (this.network == "local") {
            console.log("not run local");
            return;
        }

        const RoveMarketPlaceUpgradeable = await ethers.getContractFactory("RoveMarketPlaceUpgradeable");
        console.log("RoveMarketPlaceUpgradeable.deploying ...")
        const proxy = await upgrades.deployProxy(RoveMarketPlaceUpgradeable, [operatorAddress, paramAddress], {initializer: 'initialize(address, address)'});
        await proxy.deployed();
        console.log("RoveMarketPlaceUpgradeable deployed at proxy:", proxy.address);
        return proxy.address;
    }

    async deployErc721(operatorAddress: any, paramAddress: any) {
        if (this.network == "local") {
            console.log("not run local");
            return;
        }

        const RoveMarketPlaceERC721 = await ethers.getContractFactory("RoveMarketPlaceERC721");
        console.log("RoveMarketPlaceRRC721.deploying ...")
        const RoveMarketPlaceERC721Deploy = await RoveMarketPlaceERC721.deploy(operatorAddress, paramAddress);

        console.log("RoveMarketPlaceRRC721 deployed:", RoveMarketPlaceERC721Deploy.address);
        return RoveMarketPlaceERC721Deploy.address;
    }

    async deployErc721Upgradeable(operatorAddress: any, paramAddress: any) {
        if (this.network == "local") {
            console.log("not run local");
            return;
        }

        const RoveMarketPlaceERC721Upgradeable = await ethers.getContractFactory("RoveMarketPlaceERC721Upgradeable");
        console.log("RoveMarketPlaceERC721Upgradeable.deploying ...")
        const proxy = await upgrades.deployProxy(RoveMarketPlaceERC721Upgradeable, [operatorAddress, paramAddress], {initializer: 'initialize(address, address)'});
        await proxy.deployed();
        console.log("RoveMarketPlaceERC721Upgradeable deployed at proxy:", proxy.address);
        return proxy.address;
    }

    async upgradeContract(proxyAddress: any, contractName: string) {
        const contractUpdated = await ethers.getContractFactory(contractName);
        upgrades.up
        console.log('Upgrading ' + contractName + '... by proxy ' + proxyAddress);
        const tx = await upgrades.upgradeProxy(proxyAddress, contractUpdated);
        console.log(contractName + ' upgraded on tx address ' + tx.address);
        return tx;
    }

    getContract(contractAddress: any, contractName: string) {
        console.log("Network run", this.network, hardhatConfig.networks[this.network].url);
        if (this.network == "local") {
            console.log("not run local");
            return;
        }
        let API_URL: any;
        API_URL = hardhatConfig.networks[hardhatConfig.defaultNetwork].url;

        // load contract
        if (contractName == "") {
            contractName = "./artifacts/contracts/goods/RoveMarketPlaceUpgradeable.sol/RoveMarketPlaceUpgradeable.json";
        } else if (contractName == 'RoveMarketPlaceERC721Upgradeable') {
            contractName = "./artifacts/contracts/goods/RoveMarketPlaceERC721Upgradeable.sol/RoveMarketPlaceERC721Upgradeable.json";

        } else {
            contractName = "./artifacts/contracts/goods/RoveMarketPlaceUpgradeable.sol/RoveMarketPlaceUpgradeable.json";
        }
        let contract = require(path.resolve(contractName));
        const web3 = createAlchemyWeb3(API_URL)
        const nftContract = new web3.eth.Contract(contract.abi, contractAddress)
        return {web3, nftContract};
    }

    async withdrawBalance(erc20: any, contractAddress: any, contractName: string, gas: number) {
        let temp = this.getContract(contractAddress, contractName);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        const fun = temp?.nftContract.methods.withdrawBalance(erc20);
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
}

export {Marketplace}