// ethereum/scripts/deploy.js
import {createAlchemyWeb3} from "@alch/alchemy-web3";
import * as path from "path";

const {ethers, upgrades} = require("hardhat");
const hardhatConfig = require("../../hardhat.config");
const Web3 = require('web3');

class Zone {
    zoneIndex: number; // required
    price: number; // required for type=3
    coreTeamAddr: any; // required for type=1
    collAddr: any; // required for type=2 
    typeZone: number; //1: team ,2: nft hodler, 3: public
    rockIndexFrom: number;
    rockIndexTo: number;// required to >= from

    constructor(zoneIndex: number, type: number) {
        this.zoneIndex = zoneIndex;
        this.price = ethers.utils.parseEther("0.0").toNumber();
        this.typeZone = type;
        this.rockIndexFrom = 0;
        this.rockIndexTo = 0;
        this.collAddr = "0x0000000000000000000000000000000000000000";
        this.coreTeamAddr = "0x0000000000000000000000000000000000000000";
    }
}

class RockNFT {
    network: string;
    senderPublicKey: string;
    senderPrivateKey: string;

    constructor(network: any, senderPrivateKey: any, senderPublicKey: any) {
        this.network = network;
        this.senderPrivateKey = senderPrivateKey;
        this.senderPublicKey = senderPublicKey;
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
        if (contractName == "" || contractName == "RockNFT") {
            contractName = "./artifacts/contracts/goods/RockNFT.sol/RockNFT.json";
        } else if (contractName == 'RockNFTCollectionHolderCrossChain') {
            contractName = "./artifacts/contracts/goods/RockNFTCollectionHolderCrossChain.sol/RockNFTCollectionHolderCrossChain.json";

        } else {
            contractName = "./artifacts/contracts/goods/RockNFTCollectionHolder.sol/RockNFTCollectionHolder.json";
        }
        let contract = require(path.resolve(contractName));
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

    async deploy(adminAddress: any, operatorAddress: any, paramAddress: any, name: string, symbol: string, contract: string) {
        console.log("Network run", this.network, hardhatConfig.networks[this.network].url);
        if (this.network == "local") {
            console.log("not run local");
            return;
        }
        const RockNFT = await ethers.getContractFactory(contract);
        // const EnvironmentNFTDeploy = await EnvironmentNFT.deploy(adminAddress, operatorAddress, {maxFeePerGas: ethers.utils.parseUnits("28.0", "gwei")});
        const NFTDeploy = await RockNFT.deploy(adminAddress, operatorAddress, paramAddress, name, symbol);

        console.log("Rove Rock NFT deployed:", NFTDeploy.address);
        return NFTDeploy.address;
    }

    async deploy2(adminAddress: any, operatorAddress: any, verifier: any, paramAddress: any, name: string, symbol: string, contract: string) {
        console.log("Network run", this.network, hardhatConfig.networks[this.network].url);
        if (this.network == "local") {
            console.log("not run local");
            return;
        }

        const RockNFT = await ethers.getContractFactory(contract);
        /*const NFTDeploy = await RockNFT.deploy(adminAddress, operatorAddress, verifier, paramAddress, name, symbol);
        console.log("Rove Rock NFT deployed:", NFTDeploy.address);
        return NFTDeploy.address;*/

        // deploy upgradable
        const proxy = await upgrades.deployProxy(RockNFT, [adminAddress, operatorAddress, verifier, paramAddress, name, symbol], {initializer: 'initialize(address, address, address, address, string memory, string memory)'});
        await proxy.deployed();
        console.log("Rove Rock NFT deployed:", proxy.address);
        return proxy.address;
    }

    async getAdminAddress(contractAddress: any, contractName: string) {
        let temp = this.getContract(contractAddress, contractName);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        //the transaction
        const tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
        }

        const adminAddress: any = await temp?.nftContract.methods.admin().call(tx);
        const operatorAddress: any = await temp?.nftContract.methods.operator().call(tx);
        const paramControl: any = await temp?.nftContract.methods.parameterControlAdd().call(tx);
        return {adminAddress, operatorAddress, paramControl};
    }

    async metaverseOwners(contractAddress: any, metaverseIdHexa: string, contractName: string) {
        let temp = this.getContract(contractAddress, contractName);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce
        const metaverseIdInt = BigInt("0x" + metaverseIdHexa);
        //the transaction
        const tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
        }

        const adminAddress: any = await temp?.nftContract.methods.metaverseOwners(metaverseIdInt).call(tx);
        return {adminAddress,};
    }

    async transfer(receiver: any, contractAddress: any, tokenID: number, amount: number, gas: number, contractName: string) {
        let temp = this.getContract(contractAddress, contractName);
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

    async setCustomTokenUri(contractAddress: any, tokenID: any, newTokenURI: string, gas: number, contractName: string) {
        let temp = this.getContract(contractAddress, contractName);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        const fun = temp?.nftContract.methods.setCustomURI(tokenID, newTokenURI);
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

    async initMetaverse(contractAddress: any, metaverseIdHexa: string, zone1: Zone, zone2: Zone, zone3: Zone, ethAmount: string, gas: number, contractName: string) {
        let temp = this.getContract(contractAddress, contractName);
        let nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce
        console.log("zone1", zone1);
        console.log("zone2", zone2);
        console.log("zone3", zone3);
        const metaverseIdInt = BigInt("0x" + metaverseIdHexa);
        const fun = temp?.nftContract.methods.initMetaverse(metaverseIdInt,
            JSON.parse(JSON.stringify(zone1)),
            JSON.parse(JSON.stringify(zone2)),
            JSON.parse(JSON.stringify(zone3)),
        );

        //the transaction
        const tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
            gas: gas,
            data: fun.encodeABI(),
            value: 0,
        }
        if (ethAmount != "") {
            tx.value = ethers.utils.parseEther(ethAmount);
        }
        try {
            if (tx.gas == 0) {
                tx.gas = await fun.estimateGas(tx);
            }
        } catch (e) {
            console.log(e);
            return;
        }
        return await this.signedAndSendTx(temp?.web3, tx);
    }

    async initNFTHolderMetaverse(contractAddress: any, metaverseIdHexa: string, zone2: Zone, ethAmount: string, gas: number, contractName: string) {
        let temp = this.getContract(contractAddress, contractName);
        let nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest");
        const metaverseIdInt = BigInt("0x" + metaverseIdHexa);
        const fun = temp?.nftContract.methods.initMetaverse(
            metaverseIdInt,
            JSON.parse(JSON.stringify(zone2)),
        );

        //the transaction
        const tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
            gas: gas,
            data: fun.encodeABI(),
            value: 0,
        }
        if (ethAmount != "") {
            tx.value = ethers.utils.parseEther(ethAmount);
        }
        try {
            if (tx.gas == 0) {
                tx.gas = await fun.estimateGas(tx);
            }
        } catch (e) {
            console.log(e);
            return;
        }
        return await this.signedAndSendTx(temp?.web3, tx);
    }


    async mintRock(metaverseIdHexa: string, to: any, contractAddress: any, zoneIndex: number, rockIndex: number, rockURI: string, ethAmount: string, gas: number, contractName: string) {
        let temp = this.getContract(contractAddress, contractName);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce


        const metaverseIdInt = BigInt("0x" + metaverseIdHexa);
        const fun = temp?.nftContract.methods.mintRock(metaverseIdInt, to, zoneIndex, rockIndex, rockURI, '0x')
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

    async userBurnNFT(to: any, contractAddress: any, tokenId: number, amount: number, gas: number, contractName: string) {
        let temp = this.getContract(contractAddress, contractName);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        const fun = temp?.nftContract.methods.burn(to, tokenId, amount)
        //the transaction
        let tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
            gas: gas,
            value: 0,
            data: fun.encodeABI(),
        }

        if (tx.gas == 0) {
            tx.gas = await fun.estimateGas(tx);
        }

        return await this.signedAndSendTx(temp?.web3, tx);
    }

    async userBurnNFTs(to: any, contractAddress: any, tokenIds: number[], amounts: number[], gas: number, contractName: string) {
        if (tokenIds.length == 0 || amounts.length == 0 || tokenIds.length != amounts.length) {
            console.log("Data is invalid")
            return
        }
        let temp = this.getContract(contractAddress, contractName);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        const fun = temp?.nftContract.methods.burnBatch(to, tokenIds, amounts)
        //the transaction
        let tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
            gas: gas,
            value: 0,
            data: fun.encodeABI(),
        }

        if (tx.gas == 0) {
            tx.gas = await fun.estimateGas(tx);
        }

        return await this.signedAndSendTx(temp?.web3, tx);
    }

    async changeVerifier(contractAddress: any, verifier: any, contractName: string, gas: number) {
        let temp = this.getContract(contractAddress, contractName);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce
        console.log("------verifier", verifier);
        const fun = temp?.nftContract.methods.changeVerifier(verifier);
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

    async changeZonePrice(contractAddress: any, metaverseIdHexa: string, zoneIndex: number, price: string, contractName: string, gas: number) {
        let temp = this.getContract(contractAddress, contractName);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce
        const metaverseIdInt = BigInt("0x" + metaverseIdHexa);
        const fun = temp?.nftContract.methods.changeZonePrice(metaverseIdInt, zoneIndex, ethers.utils.parseEther(price).toNumber())
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

    async setCreator(contractAddress: any, creatorAddress: any, ids: number[], gas: number, contractName: string) {
        let temp = this.getContract(contractAddress, contractName);
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

    async getProxyRegisterAddress(contractAddress: any, contractName: string) {
        let temp = this.getContract(contractAddress, contractName);
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

    async isApprovedForAll(contractAddress: any, owner: any, operator: any, contractName: string) {
        let temp = this.getContract(contractAddress, contractName);
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

    async setProxyRegisterAddress(contractAddress: any, proxyAddress: any, gas: number, contractName: string) {
        let temp = this.getContract(contractAddress, contractName);
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

    async setApprovalForAll(contractAddress: any, operator: any, gas: number, contractName: string) {
        let temp = this.getContract(contractAddress, contractName);
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

    async withdraw(to: any, contractAddress: any, gas: number, contractName: string) {
        let temp = this.getContract(contractAddress, contractName);
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

    async getMaxSupply(contractAddress: any, tokenId: number, contractName: string) {
        let temp = this.getContract(contractAddress, contractName);
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

    async getMetaverseOwner(contractAddress: any, metaverseIdHexa: string, contractName: string) {
        let temp = this.getContract(contractAddress, contractName);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce
        const metaverseIdInt = BigInt("0x" + metaverseIdHexa);
        //the transaction
        const tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
        }

        const owner: any = await temp?.nftContract.methods.metaverseOwners(metaverseIdInt).call(tx);
        return owner;
    }

    async getMetaverseZones(contractAddress: any, metaverseIdHexa: string, zoneIndex: number, contractName: string) {
        let temp = this.getContract(contractAddress, contractName);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce
        const metaverseIdInt = BigInt("0x" + metaverseIdHexa);
        //the transaction
        const tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
        }

        const zones: any = await temp?.nftContract.methods.metaverseZones(metaverseIdInt, zoneIndex).call(tx);
        return zones;
    }

    async uri(contractAddress: any, tokenId: number, contractName: string) {
        let temp = this.getContract(contractAddress, contractName);
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce

        //the transaction
        const tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
        }

        const uri: any = await temp?.nftContract.methods.uri(tokenId).call(tx);
        return uri;
    }

    async verifySignData(contractAddress: any, data: string, signdData: string, contractName: string) {
        let temp = this.getContract(contractAddress, contractName);
        
        const nonce = await temp?.web3.eth.getTransactionCount(this.senderPublicKey, "latest") //get latest nonce
        const hashedMessage = Web3.utils.sha3(data);
        // sign hashed message
        const web3 = new Web3();
        const signature = web3.eth.accounts.sign(hashedMessage, this.senderPrivateKey);
        const fun = temp?.nftContract.methods.verifySignData(signature.message, signature.signature);
        console.log("---------", contractName);
        //the transaction
        const tx = {
            from: this.senderPublicKey,
            to: contractAddress,
            nonce: nonce,
            gas: 50000,
            data: fun.encodeABI(),
        }

        return await this.signedAndSendTx(temp?.web3, tx);
    }
}

export {RockNFT, Zone};