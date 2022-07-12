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
}

export {Marketplace}