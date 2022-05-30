import {createAlchemyWeb3} from "@alch/alchemy-web3";
import * as path from "path";

const {ethers} = require("hardhat");
const hardhatConfig = require("../../hardhat.config");

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
}

export {Marketplace}