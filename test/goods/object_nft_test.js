var {solidity} = require("ethereum-waffle");
var chai = require('chai');
chai.use(solidity);
const {ethers} = require("hardhat");
const expect = chai.expect;
const {addresses} = require("../constants");
const hardhatConfig = require("../../hardhat.config");
let nft_owner_address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // default for local
function sleep(second) {
    return new Promise((resolve) => {
        setTimeout(resolve, second * 1000);
    });
}

describe("** NFTs erc-1155 contract", function () {
    let objectNFT;

    beforeEach(async function () {
        console.log("Hardhat network", hardhatConfig.defaultNetwork)
        let proxyRegistryAddress = "";
        if (hardhatConfig.defaultNetwork === 'rinkeby') {
            proxyRegistryAddress = "0xf57b2c51ded3a29e6891aba85459d600256cf317";
        } else {
            proxyRegistryAddress = "0xa5409ec958c83c3f309868babaca7c86dcb077c1";
        }

        if (hardhatConfig.defaultNetwork !== 'local') {
            nft_owner_address = `${process.env.PUBLIC_KEY}`;
        }
        console.log("nft_owner_address", nft_owner_address);

        let ObjectNFTContract = await ethers.getContractFactory("ObjectNFT");
        objectNFT = await ObjectNFTContract.deploy(proxyRegistryAddress);
        console.log("ObjectNFTDeploy address", objectNFT.address);


    });
    describe("* Mint NFT erc-1155", function () {
        it("- Check total supply of minted NFT token", async function () {
            let recipient = nft_owner_address;
            let initSupply = 10;
            let tokenURI = "https://gateway.pinata.cloud/ipfs/QmWYZQzeTHDMGcsUMgdJ64hgLrXk8iZKDRmbxWha4xdbbH";

            // check token init
            let newItemId = await objectNFT.newItemId()
            console.log("newItemId", newItemId);
            expect(newItemId).to.equal(0);

            // check token id increase after mint
            await objectNFT.mintNFT(recipient, initSupply, tokenURI);
            let tokenID = await objectNFT.newItemId()
            console.log("tokenID", tokenID);
            expect(tokenID).to.equal(newItemId + 1);

            // check total supply of token id
            let totalSupply = await objectNFT.totalSupply(tokenID);
            console.log("totalSupply init:", totalSupply);
            expect(totalSupply).to.equal(initSupply);
        });
    });
    describe("* Transactions", function () {
        it("- Should transfer erc-1155 between accounts", async function () {
            let nftOwner = nft_owner_address;
            let receiver = addresses[0];
            let initSupply = 100;
            let tokenURI = "https://gateway.pinata.cloud/ipfs/QmWYZQzeTHDMGcsUMgdJ64hgLrXk8iZKDRmbxWha4xdbbH";

            // check token init
            console.log("+ check token init");
            let newItemId = await objectNFT.newItemId()
            console.log("newItemId:", newItemId);
            expect(newItemId).to.equal(0);

            // check token id minted 1st
            console.log("+ check token id minted 1st");
            let tx = await objectNFT.mintNFT(nftOwner, initSupply, tokenURI);
            await tx.wait();
            let tokenID = await objectNFT.newItemId()
            expect(tokenID).to.equal(1);
            console.log("tokenID:", tokenID);

            // check token id minted 2nd
            console.log("+ check token id minted 2nd");
            tx = await objectNFT.mintNFT(nftOwner, initSupply, tokenURI);
            await tx.wait();
            tokenID = await objectNFT.newItemId();
            expect(tokenID).to.equal(2);
            console.log("tokenID:", tokenID);

            // transfer and check balance
            console.log("+ transfer and check balance")
            tx = await objectNFT.safeTransferFrom(nftOwner, receiver, tokenID, 5, "0x");
            console.log("Transfer tx:", tx.hash);
            await tx.wait();
            let balance_erc1155_receiver = await objectNFT.balanceOf(receiver, tokenID);
            console.log("balance of receiver %s on token %s is %s", receiver, tokenID, balance_erc1155_receiver);
            await sleep(10);
            let balance_erc1155_owner = await objectNFT.balanceOf(nftOwner, tokenID);
            console.log("balance of nft owner %s on token %s is %s", nftOwner, tokenID, balance_erc1155_owner);
            await sleep(10);
            expect(balance_erc1155_receiver.add(balance_erc1155_owner)).to.equal(initSupply);
        });
    });
});