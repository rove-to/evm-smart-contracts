var {solidity} = require("ethereum-waffle");
var chai = require('chai');
chai.use(solidity);
const {ethers} = require("hardhat");
const expect = chai.expect;
const {addresses} = require("./constants");
const hardhatConfig = require("../hardhat.config");
let nft_owner_address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // default for local

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
            /*let recipient = nft_owner_address;
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
            expect(totalSupply).to.equal(initSupply);*/
        });
    });
    describe("* Transactions", function () {
        it("- Should transfer erc-1155 between accounts", async function () {
            let nftOwner = nft_owner_address;
            let receiver = addresses[0];
            let initSupply = 100;
            let tokenURI = "https://gateway.pinata.cloud/ipfs/QmWYZQzeTHDMGcsUMgdJ64hgLrXk8iZKDRmbxWha4xdbbH";

            // check token init
            let newItemId = await objectNFT.newItemId()
            console.log("newItemId:", newItemId);
            expect(newItemId).to.equal(0);

            // check token id minted
            await objectNFT.mintNFT(nftOwner, initSupply, tokenURI);
            let tokenID = await objectNFT.newItemId()
            console.log("tokenID:", tokenID);

            // transfer and check balance
            let tx = await objectNFT.safeTransferFrom(nftOwner, receiver, tokenID, 3, "0x");
            console.log("Transfer tx:", tx);
            let balance_erc1155_receiver = await objectNFT.balanceOf(receiver, tokenID);
            console.log("balance of receiver %s on token %s is %s", receiver, tokenID, balance_erc1155_receiver);
            let balance_erc1155_owner = await objectNFT.balanceOf(nftOwner, tokenID);
            console.log("balance of nft owner %s on token %s is %s", nftOwner, tokenID, balance_erc1155_owner);
            expect(balance_erc1155_receiver.add(balance_erc1155_owner)).to.equal(initSupply);
        });
    });
});