var {solidity} = require("ethereum-waffle");
var chai = require('chai');
chai.use(solidity);
const {ethers} = require("hardhat");
const expect = chai.expect;
const {addresses} = require("../constants");
const hardhatConfig = require("../../hardhat.config");
const path = require("path");
const {createAlchemyWeb3} = require("@alch/alchemy-web3");
const operator_address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // default for local
function sleep(second) {
    return new Promise((resolve) => {
        setTimeout(resolve, second * 1000);
    });
}

describe("Marketplace contract", function () {
    let roveToken;
    let roveTokenContractAddress;

    let objectNFT;
    let objectNFTAddress;
    let tokenID;
    let nftOwner;

    let roveMarketplace;
    let roveMarketplaceAddress;

    beforeEach(async function () {
        // deploy rove token
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        let roveTokenContract = await ethers.getContractFactory("RoveToken");
        roveToken = await roveTokenContract.deploy(operator_address);
        roveTokenContractAddress = roveToken.address;
        console.log("Rove token contract address", roveTokenContractAddress);

        // deploy nft
        let proxyRegistryAddress = "";
        if (hardhatConfig.defaultNetwork === 'rinkeby') {
            proxyRegistryAddress = "0xf57b2c51ded3a29e6891aba85459d600256cf317";
        } else {
            proxyRegistryAddress = "0xa5409ec958c83c3f309868babaca7c86dcb077c1";
        }
        let ObjectNFTContract = await ethers.getContractFactory("ObjectNFT");
        objectNFT = await ObjectNFTContract.deploy(proxyRegistryAddress);
        objectNFTAddress = objectNFT.address;
        console.log("ObjectNFTDeploy address", objectNFTAddress);
        // mint nft
        nftOwner = operator_address;
        let initSupply = 10;
        let tokenURI = "https://gateway.pinata.cloud/ipfs/QmWYZQzeTHDMGcsUMgdJ64hgLrXk8iZKDRmbxWha4xdbbH";
        await objectNFT.mintNFT(nftOwner, initSupply, tokenURI);
        tokenID = await objectNFT.newItemId()

        // deploy market
        let marketContract = await ethers.getContractFactory("RoveMarketPlace");
        roveMarketplace = await marketContract.deploy(operator_address, roveTokenContractAddress);
        roveMarketplaceAddress = roveMarketplace.address;
        console.log("Rove Market place contract address", roveMarketplaceAddress);
    });

    describe("** Deployment Rove Market place", function () {
        it("* Should set the right operator", async function () {
            expect(await roveMarketplace.operator()).to.equal(operator_address);
        });

        it("* Should set the right rove token", async function () {
            expect(await roveMarketplace.roveToken()).to.equal(roveTokenContractAddress);
        });
    });

    describe("** Offering", function () {
        it("* Place offering", async function () {
            // place offering
            const priceOffer = 5
            let tx = await roveMarketplace.placeOffering(nftOwner, objectNFTAddress, tokenID, priceOffer);
            let receipt = await tx.wait();
            const events = receipt.events?.filter((x) => {return x.event == "OfferingPlaced"});
            expect(events.length).to.equal(1);
            const offeringId = events[0].args[0];
            const hostContract = events[0].args[1];
            const offerer = events[0].args[2];
            const tokenId1 = events[0].args[3];
            const price = events[0].args[4];
            const uri = events[0].args[5];
            expect(hostContract).to.equal(objectNFTAddress);
            expect(offerer).to.equal(nftOwner);
            expect(tokenId1).to.equal(tokenID);
            expect(price).to.equal(priceOffer);

            // view offering
            hostContract, tokenId1,price, closed = await roveMarketplace.viewOfferingNFT(offeringId);
            expect(hostContract).to.equal(objectNFTAddress);
            expect(tokenId1).to.equal(tokenID);
            expect(price).to.equal(priceOffer);
        });
    });
});