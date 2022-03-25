// ethereum/scripts/deploy.js
import {createAlchemyWeb3} from "@alch/alchemy-web3";
import * as path from "path";

const {ethers} = require("hardhat");
const hardhatConfig = require("../../hardhat.config");

class EnvironmentNFT {
    network: string;
    senderPublicKey: string;
    senderPrivateKey: string;

    constructor(network: any, senderPrivateKey: any, senderPublicKey: any) {
        this.network = network;
        this.senderPrivateKey = senderPrivateKey;
        this.senderPublicKey = senderPublicKey;
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
        let contract = require(path.resolve("./artifacts/contracts/goods/EnvironmentNFT.sol/EnvironmentNFT.json"));
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

    async deploy(adminAddress: any, operatorAddress: any) {
        console.log("Network run", this.network, hardhatConfig.networks[this.network].url);
        if (this.network == "local") {
            console.log("not run local");
            return;
        }
        const EnvironmentNFT = await ethers.getContractFactory("EnvironmentNFT");
        const EnvironmentNFTDeploy = await EnvironmentNFT.deploy(adminAddress, operatorAddress);

        console.log("Rove Environment NFT deployed:", EnvironmentNFTDeploy.address);
        return EnvironmentNFTDeploy.address;
    }

    async getAdminAddress(contractAddress: any) {
        let temp = this.getContract(contractAddress);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        //the transaction
        const tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
        }

        const adminAddress: any = await temp?.nftContract.methods.admin().call(tx);
        const operatorAddress: any = await temp?.nftContract.methods.operator().call(tx);
        return {adminAddress, operatorAddress};
    }

    async transfer(receiver: any, contractAddress: any, tokenID: number, amount: number, gas: number) {
        let temp = this.getContract(contractAddress);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        //the transaction
        const tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
            gas: gas,
            data: temp?.nftContract.methods.safeTransferFrom(this.senderPublicKey, receiver, tokenID, amount, "0x").encodeABI(),
        }

        return await this.signedAndSendTx(temp?.web3, tx);
    }

    async setCustomTokenUri(contractAddress: any, tokenID: number, newTokenURI: string, gas: number) {
        let temp = this.getContract(contractAddress);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        //the transaction
        const tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
            gas: gas,
            data: temp?.nftContract.methods.setCustomURI(tokenID, newTokenURI).encodeABI(),
        }

        return await this.signedAndSendTx(temp?.web3, tx);
    }

    async createEnvironmentNFT(initOwnerAddress: any, contractAddress: any, initSupply: number, price: string, max: number, tokenURI: string, gas: number) {
        let temp = this.getContract(contractAddress);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        const eth = ethers.utils.parseEther(price);
        const fun = temp?.nftContract.methods.createNFT(initOwnerAddress, initSupply, tokenURI, eth, max);
        console.log(gas);
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

    async mintEnvironmentNFT(to: any, contractAddress: any, tokenId: number, amount: number, gas: number) {
        let temp = this.getContract(contractAddress);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        const fun = temp?.nftContract.methods.mint(to, tokenId, amount, '0x');
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

    async userMintEnvironmentNFT(to: any, contractAddress: any, tokenId: number, amount: number, ethAmount: string, gas: number) {
        let temp = this.getContract(contractAddress);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        const fun = temp?.nftContract.methods.userMint(to, tokenId, amount, '0x')
        //the transaction
        let tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
            gas: gas,
            value: 0,
            data: fun.encodeABI(),
        }
        if (ethAmount != "") {
            const value = ethers.utils.parseEther(ethAmount);
            console.log("value:", value);
            tx.value = value;
        }

        if (tx.gas == 0) {
            tx.gas = await fun.estimateGas(tx);
        }

        return await this.signedAndSendTx(temp?.web3, tx);
    }

    async setCreator(contractAddress: any, creatorAddress: any, ids: number[], gas: number) {
        let temp = this.getContract(contractAddress);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        const fun = temp?.nftContract.methods.setCreator(creatorAddress, ids)
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

    async getProxyRegisterAddress(contractAddress: any) {
        let temp = this.getContract(contractAddress);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        //the transaction
        const tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
        }

        const proxyRegistryAddress: any = await temp?.nftContract.methods.proxyRegistryAddress().call(tx);
        return proxyRegistryAddress;
    }

    async isApprovedForAll(contractAddress: any, owner: any, operator: any) {
        let temp = this.getContract(contractAddress);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        //the transaction
        const tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
            gas: 500000,
            // data: null,
        }
        try {
            const result: any = await temp?.nftContract.methods.isApprovedForAll(owner, operator).call(tx);
            console.log(result.hash);
            return result;
        } catch (e) {
            console.log(e);
            return false;
        }

    }

    async setProxyRegisterAddress(contractAddress: any, proxyAddress: any, gas: number) {
        let temp = this.getContract(contractAddress);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        //the transaction
        const tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
            gas: gas,
            data: temp?.nftContract.methods.setProxyRegistryAddress(proxyAddress).encodeABI(),
        }

        return await this.signedAndSendTx(temp?.web3, tx);
    }

    async setApprovalForAll(contractAddress: any, operator: any, gas: number) {
        let temp = this.getContract(contractAddress);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        //the transaction
        const tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
            gas: gas,
            data: temp?.nftContract.methods.setApprovalForAll(operator, true).encodeABI(),
        }

        return await this.signedAndSendTx(temp?.web3, tx);
    }

    async withdraw(to: any, contractAddress: any, gas: number) {
        let temp = this.getContract(contractAddress);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        const fun = temp?.nftContract.methods.withdraw(to);
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

    async getMaxSupply(contractAddress: any, tokenId: number) {
        let temp = this.getContract(contractAddress);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        //the transaction
        const tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
        }

        const max: any = await temp?.nftContract.methods.getMaxSupplyToken(tokenId).call(tx);
        return max;
    }

    async getPriceToken(contractAddress: any, tokenId: number) {
        let temp = this.getContract(contractAddress);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        //the transaction
        const tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
        }

        const price: any = await temp?.nftContract.methods.getPriceToken(tokenId).call(tx);
        return price;
    }
}

export {EnvironmentNFT};