var {solidity} = require("ethereum-waffle");
var chai = require('chai');
chai.use(solidity);
const {ethers} = require("hardhat");
const expect = chai.expect;
const {addresses} = require("../constants");
const hardhatConfig = require("../../hardhat.config");
const path = require("path");
const {createAlchemyWeb3} = require("@alch/alchemy-web3");

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
    const initSupply = 10;
    const nftOwner = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const buyer = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'; // default for local
    const buyerPrivateKey = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
    const buyerBalance = 1000;

    let roveMarketplace;
    let roveMarketplaceAddress;
    const operator_address = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'; // default for local
    const operator_privatekey = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';

    beforeEach(async function () {
        // deploy rove token
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        let roveTokenContract = await ethers.getContractFactory("RoveToken");
        roveToken = await roveTokenContract.deploy(nftOwner);
        roveTokenContractAddress = roveToken.address;
        console.log("Rove token contract address", roveTokenContractAddress);
        roveToken.transfer(buyer, buyerBalance);// transfer buyerBalance rove to buyer

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
        // it("* Should set the right operator", async function () {
        //     expect(await roveMarketplace.operator()).to.equal(operator_address);
        // });
        //
        // it("* Should set the right rove token", async function () {
        //     expect(await roveMarketplace.roveToken()).to.equal(roveTokenContractAddress);
        // });
    });

    describe("** Offering", function () {
        // it("* Place offering", async function () {
        //     // place offering
        //     const priceOffer = 5
        //     let tx = await roveMarketplace.placeOffering(nftOwner, objectNFTAddress, tokenID, priceOffer);
        //     let receipt = await tx.wait();
        //     const events = receipt.events?.filter((x) => {return x.event == "OfferingPlaced"});
        //     expect(events.length).to.equal(1);
        //     const offeringId = events[0].args[0];
        //     const hostContract = events[0].args[1];
        //     const offerer = events[0].args[2];
        //     const tokenId1 = events[0].args[3];
        //     const price = events[0].args[4];
        //     const uri = events[0].args[5];
        //     expect(hostContract).to.equal(objectNFTAddress);
        //     expect(offerer).to.equal(nftOwner);
        //     expect(tokenId1).to.equal(tokenID);
        //     expect(price).to.equal(priceOffer);
        //
        //     // view offering
        //     hostContract, tokenId1,price, closed = await roveMarketplace.viewOfferingNFT(offeringId);
        //     expect(hostContract).to.equal(objectNFTAddress);
        //     expect(tokenId1).to.equal(tokenID);
        //     expect(price).to.equal(priceOffer);
        // });

        it("* Stop offering", async function () {
            let contract = require(path.resolve("./artifacts/contracts/goods/RoveMarketPlace.sol/RoveMarketPlace.json"));
            let contractToken = require(path.resolve("./artifacts/contracts/monetary/RoveToken.sol/RoveToken.json"));
            const web3 = createAlchemyWeb3(hardhatConfig.networks[hardhatConfig.defaultNetwork].url);
            const marketplace1 = new web3.eth.Contract(contract.abi, roveMarketplaceAddress);
            const roveToken1 = new web3.eth.Contract(contractToken.abi, roveTokenContractAddress);
            
            // nftOwner approve for market place contract
            let tx = await objectNFT.setApprovalForAll(roveMarketplaceAddress, true);
            let receipt = await tx.wait();
            let events = receipt.events?.filter((x) => {return x.event == "ApprovalForAll"});
            expect(events.length).to.equal(1);
            expect(events[0].args[0]).to.equal(nftOwner);
            expect(events[0].args[1]).to.equal(roveMarketplaceAddress);
            expect(events[0].args[2]).to.equal(true);
            
            // nftOwner place offering
            const priceOffer = 5
            tx = await roveMarketplace.placeOffering(nftOwner, objectNFTAddress, tokenID, priceOffer);
            receipt = await tx.wait();
            events = receipt.events?.filter((x) => {return x.event == "OfferingPlaced"});
            expect(events.length).to.equal(1);
            const offeringId = events[0].args[0];
            
            // buyer approve for market place contract as spender
            let nonce = await web3.eth.getTransactionCount(buyer, "latest") //get latest nonce
            tx = {
                from: buyer,
                to: roveTokenContractAddress,
                nonce: nonce,
                gas: 500000,
                data: roveToken1.methods.approve(roveMarketplaceAddress, priceOffer).encodeABI(),
            }
            let signedTx = await web3.eth.accounts.signTransaction(tx, buyerPrivateKey);
            if (signedTx.rawTransaction != null) {
                await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
            }
            
            // buyer close order
            nonce = await web3.eth.getTransactionCount(buyer, "latest") //get latest nonce
            tx = {
                from: buyer,
                to: roveMarketplaceAddress,
                nonce: nonce,
                gas: 500000,
                data: marketplace1.methods.closeOffering(offeringId).encodeABI(),
            }
            signedTx = await web3.eth.accounts.signTransaction(tx, buyerPrivateKey);
            if (signedTx.rawTransaction != null) {
                await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
            }
            
            // check balance
            const nftOwnerBalanceRoveToken = await roveMarketplace.viewBalances(nftOwner);
            expect(nftOwnerBalanceRoveToken).to.equal(priceOffer);
            const buyerBalanceRoveToken = await roveToken.balanceOf(buyer);
            expect(buyerBalanceRoveToken).to.equal(buyerBalance - priceOffer);
            
            const nftOwnerBalanceNFT = await objectNFT.balanceOf(nftOwner, tokenID);
            const buyerBalanceNFT = await objectNFT.balanceOf(buyer, tokenID);
            expect(nftOwnerBalanceNFT.add(buyerBalanceNFT)).to.equal(initSupply);
        });
    });
});