var { solidity } = require("ethereum-waffle");
var chai = require("chai");
chai.use(solidity);
const { ethers } = require("hardhat");
const expect = chai.expect;
const { addresses } = require("../constants");
const hardhatConfig = require("../../hardhat.config");
const path = require("path");
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");

function sleep(second) {
  return new Promise(resolve => {
    setTimeout(resolve, second * 1000);
  });
}

describe("Marketplace contract erc-721", function () {
  let roveToken;
  let roveTokenAdmin = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  let roveTokenContractAddress;
  let decimals;

  let objectNFT;
  let objectNFTAddress;
  let tokenID;
  const initSupply = 1; // erc-721 => 1
  const nftOwner = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const buyer = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"; // default for local
  const buyerPrivateKey =
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
  const buyerBalance = 1000000000; // transfer all 1 bil token to buyer

  let roveMarketplace;
  let roveMarketplaceAddress;
  const operator_address = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"; // default for local
  const operator_privatekey =
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";

  beforeEach(async function () {
    // deploy rove token
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    let roveTokenContract = await ethers.getContractFactory("RoveToken");
    roveToken = await roveTokenContract.deploy(roveTokenAdmin);
    roveTokenContractAddress = roveToken.address;
    console.log("Rove token contract address", roveTokenContractAddress);
    decimals = await roveToken.decimals();
    decimals = 10 ** decimals;
    roveToken.transfer(buyer, buyerBalance * decimals); // transfer all 1 bil token to buyer

    // deploy nft
    let ObjectNFTContract = await ethers.getContractFactory("ERC721Tradable");
    objectNFT = await ObjectNFTContract.deploy(
      "ROVE721",
      "ROVE721",
      "",
      roveTokenAdmin,
      roveTokenAdmin
    );
    objectNFTAddress = objectNFT.address;
    console.log("ERC721Tradable address", objectNFTAddress);

    // mint nft
    let tokenURI =
      "https://gateway.pinata.cloud/ipfs/QmWYZQzeTHDMGcsUMgdJ64hgLrXk8iZKDRmbxWha4xdbbH";
    await objectNFT.mintTo(nftOwner, tokenURI);
    tokenID = await objectNFT.nextTokenId();
    console.log("****", tokenID);

    // deploy param
    let param = await ethers.getContractFactory("ParameterControl");
    let paramAddress = await param.deploy(operator_address);
    paramAddress = paramAddress.address;
    console.log("Paran control contract address", paramAddress);

    // deploy market
    let marketContract = await ethers.getContractFactory(
      "RoveMarketPlaceERC721"
    );
    roveMarketplace = await marketContract.deploy(
      operator_address,
      roveTokenContractAddress,
      paramAddress
    );
    roveMarketplaceAddress = roveMarketplace.address;
    console.log("Rove Market place contract address", roveMarketplaceAddress);
  });

  describe("** Deployment Rove Market place", function () {
    it("* Should set the right operator", async function () {
      let operator = await roveMarketplace.operator();
      expect(operator).to.equal(operator_address);
    });

    it("* Should set the right rove token", async function () {
      expect(await roveMarketplace.roveToken()).to.equal(
        roveTokenContractAddress
      );
    });
  });

  describe("** Offering", function () {
    it("* Place offering", async function () {
      // nftOwner approve for market place contract
      let tx = await objectNFT.setApprovalForAll(roveMarketplaceAddress, true);
      let receipt = await tx.wait();
      let events = receipt.events?.filter(x => {
        return x.event == "ApprovalForAll";
      });
      expect(events.length).to.equal(1);
      expect(events[0].args[0]).to.equal(nftOwner);
      expect(events[0].args[1]).to.equal(roveMarketplaceAddress);
      expect(events[0].args[2]).to.equal(true);

      // place offering
      const priceOffer = 5 * decimals;
      tx = await roveMarketplace.placeOffering(
        objectNFTAddress,
        tokenID,
        priceOffer
      );
      receipt = await tx.wait();
      events = receipt.events?.filter(x => {
        return x.event == "OfferingPlaced";
      });
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
      let offerings = await roveMarketplace.arrayOffering();
      console.log("********", offerings, offeringId);
      expect(offeringId).to.equal(offerings[0]);
      hostContract,
        tokenId1,
        price,
        (closed = await roveMarketplace.viewOfferingNFT(offeringId));
      expect(hostContract).to.equal(objectNFTAddress);
      expect(tokenId1).to.equal(tokenID);
      expect(price).to.equal(priceOffer);
    });

    it.only("* Stop offering", async function () {
      let contract = require(path.resolve(
        "./artifacts/contracts/goods/RoveMarketPlace.sol/RoveMarketPlace.json"
      ));
      let contractToken = require(path.resolve(
        "./artifacts/contracts/monetary/RoveToken.sol/RoveToken.json"
      ));
      const web3 = createAlchemyWeb3(
        hardhatConfig.networks[hardhatConfig.defaultNetwork].url
      );
      const marketplace1 = new web3.eth.Contract(
        contract.abi,
        roveMarketplaceAddress
      );
      const roveToken1 = new web3.eth.Contract(
        contractToken.abi,
        roveTokenContractAddress
      );

      // nftOwner approve for market place contract
      let tx = await objectNFT.setApprovalForAll(roveMarketplaceAddress, true);
      let receipt = await tx.wait();
      let events = receipt.events?.filter(x => {
        return x.event == "ApprovalForAll";
      });
      expect(events.length).to.equal(1);
      expect(events[0].args[0]).to.equal(nftOwner);
      expect(events[0].args[1]).to.equal(roveMarketplaceAddress);
      expect(events[0].args[2]).to.equal(true);

      // nftOwner place offering with price 5 rove token
      const priceOffer = 5 * decimals;
      tx = await roveMarketplace.placeOffering(
        objectNFTAddress,
        tokenID,
        priceOffer
      );
      receipt = await tx.wait();
      events = receipt.events?.filter(x => {
        return x.event == "OfferingPlaced";
      });
      expect(events.length).to.equal(1);
      const offeringId = events[0].args[0];

      // buyer approve for market place contract as spender
      let nonce = await web3.eth.getTransactionCount(buyer, "latest"); //get latest nonce
      tx = {
        from: buyer,
        to: roveTokenContractAddress,
        nonce: nonce,
        gas: 500000,
        data: roveToken1.methods
          .approve(roveMarketplaceAddress, priceOffer)
          .encodeABI(),
      };
      let signedTx = await web3.eth.accounts.signTransaction(
        tx,
        buyerPrivateKey
      );
      if (signedTx.rawTransaction != null) {
        await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      }

      // buyer close order
      console.log("tokenID", tokenID);
      nonce = await web3.eth.getTransactionCount(buyer, "latest"); //get latest nonce
      tx = {
        from: buyer,
        to: roveMarketplaceAddress,
        nonce: nonce,
        gas: 500000,
        data: marketplace1.methods.closeOffering(offeringId).encodeABI(),
      };
      signedTx = await web3.eth.accounts.signTransaction(tx, buyerPrivateKey);
      if (signedTx.rawTransaction != null) {
        await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      }

      // check balance
      const marketBalanceRoveToken = await roveToken.balanceOf(
        roveMarketplaceAddress
      );
      expect(marketBalanceRoveToken).to.equal(priceOffer);
      let nftOwnerBalanceRoveTokenOnMarket = await roveMarketplace.viewBalances(
        nftOwner
      );
      expect(nftOwnerBalanceRoveTokenOnMarket).to.equal(priceOffer);
      const buyerBalanceRoveToken = await roveToken.balanceOf(buyer);
      expect(buyerBalanceRoveToken).to.equal(
        buyerBalance * decimals - priceOffer
      );

      let nftOwnerBalanceNFT = await objectNFT.balanceOf(nftOwner);
      const buyerBalanceNFT = await objectNFT.balanceOf(buyer);
      expect(nftOwnerBalanceNFT.add(buyerBalanceNFT)).to.equal(initSupply);

      // call withdraw for owner nft for get rove token
      tx = await roveMarketplace.withdrawBalance();
      await tx.wait();
      // view balance market place again
      nftOwnerBalanceRoveTokenOnMarket = await roveMarketplace.viewBalances(
        nftOwner
      );
      expect(nftOwnerBalanceRoveTokenOnMarket).to.equal(0);
      // check erc-20 balance
      const nftOwnerWithdrawBalance = await roveToken.balanceOf(nftOwner);
      console.log(nftOwnerWithdrawBalance);
      expect(nftOwnerWithdrawBalance).to.equal(priceOffer);
    });
  });
});
