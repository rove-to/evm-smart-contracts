var {solidity} = require("ethereum-waffle");
var chai = require('chai');
chai.use(solidity);
const {ethers} = require("hardhat");
const expect = chai.expect;
const {addresses, private_keys} = require("../constants");
const hardhatConfig = require("../../hardhat.config");
const path = require("path");
const {createAlchemyWeb3} = require("@alch/alchemy-web3");

describe("** NFTs erc-1155 contract", function () {
    let objectNFT;
    let objectNFTAddress;
    let nft_owner_contract_address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // default for local
    const nft_creator = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'; // default for local
    const nft_creator_privatekey = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

    beforeEach(async function () {
        console.log("Hardhat network", hardhatConfig.defaultNetwork)

        if (hardhatConfig.defaultNetwork !== 'local') {
            nft_owner_contract_address = `${process.env.PUBLIC_KEY}`;
        }
        console.log("nft_owner_address", nft_owner_contract_address);

        let ObjectNFTContract = await ethers.getContractFactory("ObjectNFT");
        objectNFT = await ObjectNFTContract.deploy();
        objectNFTAddress = objectNFT.address;
        console.log("ObjectNFTDeploy address", objectNFTAddress);


    });
    describe("* Mint NFT erc-1155", function () {
        it("- Check total supply of minted NFT token: owner of contract", async function () {
            let recipient = nft_owner_contract_address;
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

        it("- Check total supply of minted NFT token: any creator", async function () {

            let contract = require(path.resolve("./artifacts/contracts/goods/ObjectNFT.sol/ObjectNFT.json"));
            const web3 = createAlchemyWeb3(hardhatConfig.networks[hardhatConfig.defaultNetwork].url);
            const objectNFT1 = new web3.eth.Contract(contract.abi, objectNFTAddress);

            let recipient = nft_owner_contract_address;
            let initSupply = 10;
            let tokenURI = "https://gateway.pinata.cloud/ipfs/QmWYZQzeTHDMGcsUMgdJ64hgLrXk8iZKDRmbxWha4xdbbH";

            // check token init
            let newItemId = await objectNFT.newItemId()
            console.log("newItemId", newItemId);
            expect(newItemId).to.equal(0);

            // check token id increase after mint
            nonce = await web3.eth.getTransactionCount(nft_creator, "latest") //get latest nonce
            tx = {
                from: nft_creator,
                to: objectNFTAddress,
                nonce: nonce,
                gas: 500000,
                data: objectNFT1.methods.mintNFT(recipient, initSupply, tokenURI).encodeABI(),
            }
            signedTx = await web3.eth.accounts.signTransaction(tx, nft_creator_privatekey);
            if (signedTx.rawTransaction != null) {
                await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
            }

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
            let nftOwner = nft_owner_contract_address;
            let receiver1 = addresses[1];
            let receiver_privatekey1 = private_keys[1];
            let receiver2 = addresses[2];
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
            const amount = 5;
            tx = await objectNFT.safeTransferFrom(nftOwner, receiver1, tokenID, amount, "0x");
            console.log("Transfer tx:", tx.hash);
            await tx.wait();
            let balance_erc1155_receiver = await objectNFT.balanceOf(receiver1, tokenID);
            console.log("balance of receiver %s on token %s is %s", receiver1, tokenID, balance_erc1155_receiver);
            let balance_erc1155_owner = await objectNFT.balanceOf(nftOwner, tokenID);
            console.log("balance of nft owner %s on token %s is %s", nftOwner, tokenID, balance_erc1155_owner);
            expect(balance_erc1155_receiver.add(balance_erc1155_owner)).to.equal(initSupply);


            // continue transfer
            let contract = require(path.resolve("./artifacts/contracts/goods/ObjectNFT.sol/ObjectNFT.json"));
            const web3 = createAlchemyWeb3(hardhatConfig.networks[hardhatConfig.defaultNetwork].url);
            const objectNFT1 = new web3.eth.Contract(contract.abi, objectNFTAddress);
            // check token id increase after mint
            nonce = await web3.eth.getTransactionCount(receiver1, "latest") //get latest nonce
            tx = {
                from: receiver1,
                to: objectNFTAddress,
                nonce: nonce,
                gas: 500000,
                data: objectNFT1.methods.safeTransferFrom(receiver1, receiver2, tokenID, amount - 2, "0x").encodeABI(),
            }
            signedTx = await web3.eth.accounts.signTransaction(tx, receiver_privatekey1);
            if (signedTx.rawTransaction != null) {
                await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
            }
            balance_erc1155_receiver = await objectNFT.balanceOf(receiver2, tokenID);
            console.log("balance of receiver %s on token %s is %s", receiver1, tokenID, balance_erc1155_receiver);
            balance_erc1155_owner = await objectNFT.balanceOf(receiver1, tokenID);
            console.log("balance of nft owner %s on token %s is %s", nftOwner, tokenID, balance_erc1155_owner);
            expect(balance_erc1155_receiver.add(balance_erc1155_owner)).to.equal(amount);

        });
    });
});