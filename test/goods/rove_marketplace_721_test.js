var { solidity } = require("ethereum-waffle");
var chai = require("chai");
chai.use(solidity);
const { ethers } = require("hardhat");
const expect = chai.expect;
const { addresses, private_keys } = require("../constants");
const hardhatConfig = require("../../hardhat.config");
const {
  ETH,
  getEthBalance,
  convertWeiToEth,
  signAnotherContractThenExcuteFunction,
  signAnotherContractThenExcuteFunctionWithValue,
} = require("../common_libs");

describe("Marketplace contract erc-721", function () {
  let roveToken;
  let roveTokenAdmin = addresses[0];
  let roveTokenContractAddress;
  let decimals;

  let objectNFT;
  let objectNFTAddress;
  let tokenID;
  const initSupply = 1; // erc-721 => 1
  const nftOwner = addresses[0];
  const buyer = addresses[1]; // default for local
  const buyerPrivateKey = private_keys[1];
  const buyerBalance = 1000000000; // transfer all 1 bil token to buyer

  let paramControl;
  let paramControlAddress;

  const MARKET_BENEFIT = 3; //3%

  let roveMarketplace;
  let roveMarketplaceAddress;
  const operator_address = addresses[2]; // default for local
  const operator_privatekey = private_keys[2];
  const marketPlaceJson = "./artifacts/contracts/goods/RoveMarketPlaceERC721.sol/RoveMarketPlaceERC721.json";
  const roveTokenJson = "./artifacts/contracts/monetary/RoveToken.sol/RoveToken.json";
  const tokenURI = "https://gateway.pinata.cloud/ipfs/QmWYZQzeTHDMGcsUMgdJ64hgLrXk8iZKDRmbxWha4xdbbH";
  const address0 = "0x0000000000000000000000000000000000000000"; // ETH

  beforeEach(async function () {
    // deploy rove token
    let roveTokenContract = await ethers.getContractFactory("RoveToken");
    roveToken = await roveTokenContract.deploy(roveTokenAdmin);
    let totalSupply = await roveToken.totalSupply();
    roveTokenContractAddress = roveToken.address;
    console.log("Rove token contract address", roveTokenContractAddress);
    decimals = await roveToken.decimals();
    decimals = 10 ** decimals;
    await roveToken.transfer(buyer, buyerBalance * decimals); // transfer all 1 bil token to buyer
    const buyerBalanceRoveToken_1 = await roveToken.balanceOf(buyer);
    console.log("buyerBalanceRoveToken_1 address", buyerBalanceRoveToken_1);

    // deploy nft
    let ObjectNFTContract = await ethers.getContractFactory("ERC721Tradable");
    objectNFT = await ObjectNFTContract.deploy("ROVE721", "ROVE721", "", roveTokenAdmin, roveTokenAdmin);
    objectNFTAddress = objectNFT.address;
    console.log("ERC721Tradable address", objectNFTAddress);

    // mint nft
    await objectNFT.mintTo(nftOwner, tokenURI);
    tokenID = await objectNFT.nextTokenId();
    console.log("****Token ID: ", tokenID);

    // deploy param
    let param = await ethers.getContractFactory("ParameterControl");
    paramControl = await param.deploy(roveTokenAdmin);
    paramControlAddress = paramControl.address;
    console.log("Paran control contract address", paramControlAddress);
    await paramControl.setUInt256("MARKET_BENEFIT", MARKET_BENEFIT);

    // deploy market
    let marketContract = await ethers.getContractFactory("RoveMarketPlaceERC721");
    roveMarketplace = await marketContract.deploy(operator_address, paramControlAddress);
    roveMarketplaceAddress = roveMarketplace.address;
    console.log("Rove Market place contract address", roveMarketplaceAddress);
  });

  describe("** Deployment Rove Market place", function () {
    it("* Should set the right operator", async function () {
      let operator = await roveMarketplace.operator();
      expect(operator).to.equal(operator_address);
    });
  });

  describe("** Offering", function () {
    it("- Test Place offering by nft 721 owner", async function () {
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
      tx = await roveMarketplace.placeOffering(objectNFTAddress, tokenID, roveTokenContractAddress, priceOffer);
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
      expect(offerer.toLowerCase()).to.equal(nftOwner.toLowerCase());
      expect(tokenId1).to.equal(tokenID);
      expect(price).to.equal(priceOffer);

      // view offering
      let offerings = await roveMarketplace.arrayOffering();
      console.log("********", offerings, offeringId);
      expect(offeringId).to.equal(offerings[0]);
      hostContract, tokenId1, price, (closed = await roveMarketplace.viewOfferingNFT(offeringId));
      expect(hostContract).to.equal(objectNFTAddress);
      expect(tokenId1).to.equal(tokenID);
      expect(price).to.equal(priceOffer);
    });

    it("- Test Place offering by ETH", async function () {
      // nftOwner approve for market place contract
      let tx = await objectNFT.setApprovalForAll(roveMarketplaceAddress, true);
      let receipt = await tx.wait();
      let events = receipt.events?.filter(x => {
        return x.event == "ApprovalForAll";
      });
      expect(events.length).to.equal(1);
      expect(events[0].args[0].toLowerCase()).to.equal(nftOwner.toLowerCase());
      expect(events[0].args[1]).to.equal(roveMarketplaceAddress);
      expect(events[0].args[2]).to.equal(true);

      // place offering
      const priceOffer = ETH("100");
      tx = await roveMarketplace.placeOffering(objectNFTAddress, tokenID, address0, priceOffer);
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
      expect(offerer.toLowerCase()).to.equal(nftOwner.toLowerCase());
      expect(tokenId1).to.equal(tokenID);
      expect(price).to.equal(priceOffer);

      // view offering
      let offerings = await roveMarketplace.arrayOffering();
      expect(offeringId).to.equal(offerings[0]);
      hostContract, tokenId1, price, (closed = await roveMarketplace.viewOfferingNFT(offeringId));
      expect(hostContract).to.equal(objectNFTAddress);
      expect(tokenId1).to.equal(tokenID);
      expect(price).to.equal(priceOffer);
    });

    it("- Test Place offering by non nft 721 owner", async function () {
      // mint new nft
      await objectNFT.mintTo(operator_address, tokenURI);
      tokenID2 = await objectNFT.nextTokenId();
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
      try {
        await roveMarketplace.placeOffering(objectNFTAddress, tokenID2, roveTokenContractAddress, priceOffer);
      } catch (e) {
        expect(e.toString()).to.include("Invalid NFT owner");
      }
    });
    it("- Test close offering by erc20 token", async function () {
      // nftOwner approve for market place contract
      let tx = await objectNFT.setApprovalForAll(roveMarketplaceAddress, true);
      let receipt = await tx.wait();
      let events = receipt.events?.filter(x => {
        return x.event == "ApprovalForAll";
      });
      expect(events.length).to.equal(1);
      expect(events[0].args[0].toLowerCase()).to.equal(nftOwner.toLowerCase());
      expect(events[0].args[1]).to.equal(roveMarketplaceAddress);
      expect(events[0].args[2]).to.equal(true);
      // nftOwner place offering with price 5 rove token
      const priceOffer = 5 * decimals;
      tx = await roveMarketplace.placeOffering(objectNFTAddress, tokenID, roveTokenContractAddress, priceOffer);
      receipt = await tx.wait();
      events = receipt.events?.filter(x => {
        return x.event == "OfferingPlaced";
      });
      expect(events.length).to.equal(1);
      const offeringId = events[0].args[0];
      // buyer approve for market place contract as spender
      await signAnotherContractThenExcuteFunction(
        roveTokenJson,
        roveTokenContractAddress,
        buyer,
        "approve",
        [roveMarketplaceAddress, priceOffer],
        buyerPrivateKey
      );

      // buyer close order
      console.log("tokenID", tokenID);
      console.log("owner of token: ", await objectNFT.ownerOf(tokenID));
      await signAnotherContractThenExcuteFunction(
        marketPlaceJson,
        roveMarketplaceAddress,
        buyer,
        "closeOffering",
        [offeringId],
        buyerPrivateKey
      );

      const marketBenefit = (priceOffer / 100) * MARKET_BENEFIT;
      // check balance
      const marketBalanceRoveToken = await roveToken.balanceOf(roveMarketplaceAddress);
      expect(marketBalanceRoveToken).to.equal(priceOffer);

      let nftOwnerBalanceRoveTokenOnMarket = await roveMarketplace.viewBalances(nftOwner, roveTokenContractAddress);
      expect(nftOwnerBalanceRoveTokenOnMarket).to.equal(priceOffer - marketBenefit);

      const buyerBalanceRoveToken = await roveToken.balanceOf(buyer);
      expect(buyerBalanceRoveToken).to.equal(buyerBalance * decimals - priceOffer);

      let nftOwnerBalanceNFT = await objectNFT.balanceOf(nftOwner);
      const buyerBalanceNFT = await objectNFT.balanceOf(buyer);
      expect(nftOwnerBalanceNFT.add(buyerBalanceNFT)).to.equal(initSupply);

      // call withdraw for owner nft for get rove token
      tx = await roveMarketplace.withdrawBalance(roveTokenContractAddress);
      await tx.wait();
      // view balance market place again
      nftOwnerBalanceRoveTokenOnMarket = await roveMarketplace.viewBalances(nftOwner, roveTokenContractAddress);
      expect(nftOwnerBalanceRoveTokenOnMarket).to.equal(0);
      // check erc-20 balance
      const nftOwnerWithdrawBalance = await roveToken.balanceOf(nftOwner);
      console.log(nftOwnerWithdrawBalance);
      expect(nftOwnerWithdrawBalance).to.equal(priceOffer - marketBenefit);
    });

    it("- Test close offering by ETH", async function () {
      // nftOwner approve for market place contract
      let tx = await objectNFT.setApprovalForAll(roveMarketplaceAddress, true);
      let receipt = await tx.wait();
      let events = receipt.events?.filter(x => {
        return x.event == "ApprovalForAll";
      });
      expect(events.length).to.equal(1);
      expect(events[0].args[0].toLowerCase()).to.equal(nftOwner.toLowerCase());
      expect(events[0].args[1]).to.equal(roveMarketplaceAddress);
      expect(events[0].args[2]).to.equal(true);
      // nftOwner place offering with price 5 rove token
      const priceOffer = ETH("100");
      const marketBenefit = (convertWeiToEth(priceOffer) / 100) * MARKET_BENEFIT;

      tx = await roveMarketplace.placeOffering(objectNFTAddress, tokenID, address0, priceOffer);
      receipt = await tx.wait();
      events = receipt.events?.filter(x => {
        return x.event == "OfferingPlaced";
      });
      expect(events.length).to.equal(1);
      const offeringId = events[0].args[0];
      let nftOwnerBalanceETHBefore = await getEthBalance(nftOwner);

      // buyer approve for market place contract as spender
      await signAnotherContractThenExcuteFunction(
        roveTokenJson,
        roveTokenContractAddress,
        buyer,
        "approve",
        [roveMarketplaceAddress, priceOffer],
        buyerPrivateKey
      );

      // buyer close order
      const buyerBalanceETHBeforeCloseOffer = await getEthBalance(buyer);
      await signAnotherContractThenExcuteFunctionWithValue(
        marketPlaceJson,
        roveMarketplaceAddress,
        buyer,
        ETH("100"),
        "closeOffering",
        [offeringId],
        buyerPrivateKey
      );

      // check balance of market place
      const marketBalanceETHAfterCloseOffer = await getEthBalance(roveMarketplaceAddress);
      expect(marketBalanceETHAfterCloseOffer).to.equal(convertWeiToEth(priceOffer));

      // check balance ETH of buyer
      const buyerBalanceETHAfterCloseOffer = await getEthBalance(buyer);
      expect(buyerBalanceETHAfterCloseOffer).to.lessThanOrEqual(
        buyerBalanceETHBeforeCloseOffer - convertWeiToEth(priceOffer)
      );

      // balance nft of buyer
      const buyerBalanceNFT = await objectNFT.balanceOf(buyer);
      expect(buyerBalanceNFT).to.equal(initSupply);

      // balance nft of owner
      const nftOwnerBalanceNFT = await objectNFT.balanceOf(nftOwner);
      expect(nftOwnerBalanceNFT).to.equal(0);

      // check balance of nftowner after close offering and withdraw
      tx = await roveMarketplace.withdrawBalance(address0);
      await tx.wait();
      let nftOwnerBalanceETHAfter = await getEthBalance(nftOwner);
      console.log("1: ", nftOwnerBalanceETHBefore, nftOwnerBalanceETHAfter);
      expect(nftOwnerBalanceETHAfter).to.lessThanOrEqual(
        nftOwnerBalanceETHBefore + convertWeiToEth(priceOffer) - marketBenefit
      );

      // view balance market place again
      let marketPlaceAfterWithraw = await getEthBalance(roveMarketplaceAddress);
      expect(marketPlaceAfterWithraw).to.equal(MARKET_BENEFIT);
    });

    it("- Test continue buy same token id with same offering id", async function () {
      // nftOwner approve for market place contract
      let tx = await objectNFT.setApprovalForAll(roveMarketplaceAddress, true);
      let receipt = await tx.wait();
      let events = receipt.events?.filter(x => {
        return x.event == "ApprovalForAll";
      });
      expect(events.length).to.equal(1);
      expect(events[0].args[0].toLowerCase()).to.equal(nftOwner.toLowerCase());
      expect(events[0].args[1]).to.equal(roveMarketplaceAddress);
      expect(events[0].args[2]).to.equal(true);
      // nftOwner place offering with price 5 rove token
      const priceOffer = ETH("100");
      tx = await roveMarketplace.placeOffering(objectNFTAddress, tokenID, address0, priceOffer);
      receipt = await tx.wait();
      events = receipt.events?.filter(x => {
        return x.event == "OfferingPlaced";
      });
      expect(events.length).to.equal(1);
      const offeringId = events[0].args[0];

      // buyer approve for market place contract as spender
      await signAnotherContractThenExcuteFunction(
        roveTokenJson,
        roveTokenContractAddress,
        buyer,
        "approve",
        [roveMarketplaceAddress, priceOffer],
        buyerPrivateKey
      );
      // buyer close order
      await signAnotherContractThenExcuteFunctionWithValue(
        marketPlaceJson,
        roveMarketplaceAddress,
        buyer,
        ETH("100"),
        "closeOffering",
        [offeringId],
        buyerPrivateKey
      );
      try {
        await signAnotherContractThenExcuteFunctionWithValue(
          marketPlaceJson,
          roveMarketplaceAddress,
          buyer,
          ETH("100"),
          "closeOffering",
          [offeringId],
          buyerPrivateKey
        );
      } catch (e) {
        expect(e.toString()).to.include("INVALID_ERC721_OWNER");
      }
    });

    it("- Test buy when offering is closed", async function () {
      // nftOwner approve for market place contract
      let tx = await objectNFT.setApprovalForAll(roveMarketplaceAddress, true);
      let receipt = await tx.wait();
      let events = receipt.events?.filter(x => {
        return x.event == "ApprovalForAll";
      });
      expect(events.length).to.equal(1);
      expect(events[0].args[0].toLowerCase()).to.equal(nftOwner.toLowerCase());
      expect(events[0].args[1]).to.equal(roveMarketplaceAddress);
      expect(events[0].args[2]).to.equal(true);
      // nftOwner place offering with price 5 rove token
      const priceOffer = ETH("100");
      tx = await roveMarketplace.placeOffering(objectNFTAddress, tokenID, address0, priceOffer);
      receipt = await tx.wait();
      events = receipt.events?.filter(x => {
        return x.event == "OfferingPlaced";
      });
      expect(events.length).to.equal(1);
      const offeringId = events[0].args[0];

      // buyer approve for market place contract as spender
      await signAnotherContractThenExcuteFunction(
        roveTokenJson,
        roveTokenContractAddress,
        buyer,
        "approve",
        [roveMarketplaceAddress, priceOffer],
        buyerPrivateKey
      );

      // operator close offer
      await signAnotherContractThenExcuteFunction(
        marketPlaceJson,
        roveMarketplaceAddress,
        operator_address,
        "operatorCloseOffering",
        [offeringId],
        operator_privatekey
      );

      // buyer close order
      try {
        await signAnotherContractThenExcuteFunctionWithValue(
          marketPlaceJson,
          roveMarketplaceAddress,
          buyer,
          ETH("100"),
          "closeOffering",
          [offeringId],
          buyerPrivateKey
        );
      } catch (e) {
        expect(e.toString()).to.include("OFFERING_CLOSED");
      }
    });

    it("- Test buy without enough eth", async function () {
      // nftOwner approve for market place contract
      let tx = await objectNFT.setApprovalForAll(roveMarketplaceAddress, true);
      let receipt = await tx.wait();
      let events = receipt.events?.filter(x => {
        return x.event == "ApprovalForAll";
      });
      expect(events.length).to.equal(1);
      expect(events[0].args[0].toLowerCase()).to.equal(nftOwner.toLowerCase());
      expect(events[0].args[1]).to.equal(roveMarketplaceAddress);
      expect(events[0].args[2]).to.equal(true);
      // nftOwner place offering with price 5 rove token
      const priceOffer = ETH("100");
      tx = await roveMarketplace.placeOffering(objectNFTAddress, tokenID, address0, priceOffer);
      receipt = await tx.wait();
      events = receipt.events?.filter(x => {
        return x.event == "OfferingPlaced";
      });
      expect(events.length).to.equal(1);
      const offeringId = events[0].args[0];

      // buyer approve for market place contract as spender
      await signAnotherContractThenExcuteFunction(
        roveTokenJson,
        roveTokenContractAddress,
        buyer,
        "approve",
        [roveMarketplaceAddress, priceOffer],
        buyerPrivateKey
      );

      // buyer close order
      try {
        await signAnotherContractThenExcuteFunctionWithValue(
          marketPlaceJson,
          roveMarketplaceAddress,
          buyer,
          ETH("99"),
          "closeOffering",
          [offeringId],
          buyerPrivateKey
        );
      } catch (e) {
        expect(e.toString()).to.include("VALUE_INVALID");
      }
    });

    it("- Test non operator close offering", async function () {
      // nftOwner approve for market place contract
      let tx = await objectNFT.setApprovalForAll(roveMarketplaceAddress, true);
      let receipt = await tx.wait();
      let events = receipt.events?.filter(x => {
        return x.event == "ApprovalForAll";
      });
      expect(events.length).to.equal(1);
      expect(events[0].args[0].toLowerCase()).to.equal(nftOwner.toLowerCase());
      expect(events[0].args[1]).to.equal(roveMarketplaceAddress);
      expect(events[0].args[2]).to.equal(true);
      // nftOwner place offering with price 5 rove token
      const priceOffer = ETH("100");
      tx = await roveMarketplace.placeOffering(objectNFTAddress, tokenID, address0, priceOffer);
      receipt = await tx.wait();
      events = receipt.events?.filter(x => {
        return x.event == "OfferingPlaced";
      });
      expect(events.length).to.equal(1);
      const offeringId = events[0].args[0];

      // operator close offer
      try {
        await roveMarketplace.operatorCloseOffering(offeringId);
      } catch (e) {
        expect(e.toString()).to.include("Only operator dApp can close offerings");
      }
    });
  });
});
