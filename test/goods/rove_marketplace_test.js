var { solidity } = require("ethereum-waffle");
var chai = require("chai");
chai.use(solidity);
const { ethers } = require("hardhat");
const expect = chai.expect;
const { addresses } = require("../constants");
const hardhatConfig = require("../../hardhat.config");
const path = require("path");
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const {
  signAnotherContractThenExcuteFunction,
  signAnotherContractThenExcuteFunctionWithValue,
} = require("../common_libs");

function sleep(second) {
  return new Promise(resolve => {
    setTimeout(resolve, second * 1000);
  });
}

describe("Marketplace contract", function () {
  let roveToken;
  let roveTokenAdmin = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  let roveTokenContractAddress;
  let decimals;

  let objectNFT;
  let objectNFTAddress;
  let tokenID;
  const initSupply = 10;
  const nftOwner = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const buyer = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"; // default for local
  const buyerPrivateKey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
  const buyerBalance = 1000000000; // transfer all 1 bil token to buyer

  let paramControl;
  let paramControlAddress;
  const CREATOR_BENEFIT = 1;
  const MARKET_BENEFIT = 2;

  let roveMarketplace;
  let roveMarketplaceAddress;
  const operator_address = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"; // default for local
  const operator_privatekey = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
  const nftPrice = 10;
  const maxNftNumber = 100;
  const roveMaketJson = "./artifacts/contracts/goods/RoveMarketPlace.sol/RoveMarketPlace.json";
  const roveTokenJson = "./artifacts/contracts/monetary/RoveToken.sol/RoveToken.json";

  beforeEach(async function () {
    // deploy rove token
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    let roveTokenContract = await ethers.getContractFactory("RoveToken");
    roveToken = await roveTokenContract.deploy(roveTokenAdmin);
    roveTokenContractAddress = roveToken.address;
    roveToken2 = await roveTokenContract.deploy(roveTokenAdmin);
    roveTokenContractAddress = roveToken.address;
    roveToken2ContractAddress = roveToken2.address;
    console.log("Rove token contract address", roveTokenContractAddress);
    console.log("Rove token 2 contract address", roveToken2ContractAddress);
    decimals = await roveToken.decimals();
    decimals = 10 ** decimals;
    roveToken.transfer(buyer, buyerBalance * decimals); // transfer all 1 bil token to buyer
    // deploy nft
    let ObjectNFTContract = await ethers.getContractFactory("ObjectNFT");
    objectNFT = await ObjectNFTContract.deploy(roveTokenAdmin, roveTokenAdmin);
    objectNFTAddress = objectNFT.address;
    console.log("ObjectNFTDeploy address", objectNFTAddress);
    // mint nft
    let tokenURI = "https://gateway.pinata.cloud/ipfs/QmWYZQzeTHDMGcsUMgdJ64hgLrXk8iZKDRmbxWha4xdbbH";
    await objectNFT.createNFT(nftOwner, initSupply, tokenURI, nftPrice, maxNftNumber);
    tokenID = await objectNFT.newItemId();

    // deploy param
    let param = await ethers.getContractFactory("ParameterControl");
    paramControl = await param.deploy(roveTokenAdmin);
    paramControlAddress = paramControl.address;
    console.log("Paran control contract address", paramControlAddress);
    await paramControl.setUInt256("CREATOR_BENEFIT", CREATOR_BENEFIT);

    // deploy market
    let marketContract = await ethers.getContractFactory("RoveMarketPlace");
    roveMarketplace = await marketContract.deploy(operator_address, paramControlAddress);
    rove2Marketplace = await marketContract.deploy(operator_address, paramControlAddress);
    roveMarketplaceAddress = roveMarketplace.address;
    rove2MarketplaceAddress = rove2Marketplace.address;
    console.log("Rove Market place contract address", roveMarketplaceAddress);
    console.log("Rove 2 Market place contract address", rove2MarketplaceAddress);
  });

  describe("** Deployment Rove Market place", function () {
    it("* Should set the right operator", async function () {
      expect(await roveMarketplace.operator()).to.equal(operator_address);
    });

    // it("* Should set the right rove token", async function () {
    //   expect(await roveMarketplace.roveToken()).to.equal(
    //     roveTokenContractAddress
    //   );
    // });
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
      const amountPlaceOffer = 3;
      tx = await roveMarketplace.placeOffering(
        objectNFTAddress,
        tokenID,
        roveTokenContractAddress,
        priceOffer,
        amountPlaceOffer
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
      const price = events[0].args[5];
      const uri = events[0].args[5];
      expect(hostContract).to.equal(objectNFTAddress);
      expect(offerer).to.equal(nftOwner);
      expect(tokenId1).to.equal(tokenID);
      expect(price).to.equal(priceOffer);

      // view offering
      let offerings = await roveMarketplace.arrayOffering();
      console.log("********", offerings, offeringId);
      expect(offeringId).to.equal(offerings[0]);
      hostContract, tokenId1, price, (closed = await roveMarketplace.viewOfferingNFT(offeringId));
      console.log("closed: ", closed);
      expect(hostContract).to.equal(objectNFTAddress);
      expect(tokenId1).to.equal(tokenID);
      expect(price).to.equal(priceOffer);
    });

    it("* Test place offering exceed innit suplly", async function () {
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
      const amountPlaceOffer = 11;
      try {
        await roveMarketplace.placeOffering(
          objectNFTAddress,
          tokenID,
          roveTokenContractAddress,
          priceOffer,
          amountPlaceOffer
        );
      } catch (error) {
        expect(error.toString()).to.include("BALANCE_INVALID");
      }
    });

    it("* Test Place offering without approve for marketplace", async function () {
      // place offering
      const priceOffer = 5 * decimals;
      const amountPlaceOffer = 3;
      try {
        await roveMarketplace.placeOffering(
          objectNFTAddress,
          tokenID,
          roveTokenContractAddress,
          priceOffer,
          amountPlaceOffer
        );
      } catch (error) {
        expect(error.toString()).to.include("ERC-1155_NOT_APPROVED");
      }
    });

    it("* Stop offering", async function () {
      let contract = require(path.resolve("./artifacts/contracts/goods/RoveMarketPlace.sol/RoveMarketPlace.json"));
      let contractToken = require(path.resolve("./artifacts/contracts/monetary/RoveToken.sol/RoveToken.json"));
      const web3 = createAlchemyWeb3(hardhatConfig.networks[hardhatConfig.defaultNetwork].url);
      const marketplace1 = new web3.eth.Contract(contract.abi, roveMarketplaceAddress);
      const roveToken1 = new web3.eth.Contract(contractToken.abi, roveTokenContractAddress);

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
      const amountPlaceOffer = 3;
      tx = await roveMarketplace.placeOffering(
        objectNFTAddress,
        tokenID,
        roveTokenContractAddress,
        priceOffer,
        amountPlaceOffer
      );
      receipt = await tx.wait();
      events = receipt.events?.filter(x => {
        return x.event == "OfferingPlaced";
      });
      expect(events.length).to.equal(1);
      const offeringId = events[0].args[0];

      // buyer approve for market place contract as spender
      const amountCloseOffer = amountPlaceOffer - 1; //
      let nonce = await web3.eth.getTransactionCount(buyer, "latest"); //get latest nonce
      tx = {
        from: buyer,
        to: roveTokenContractAddress,
        nonce: nonce,
        gas: 500000,
        data: roveToken1.methods.approve(roveMarketplaceAddress, priceOffer * amountCloseOffer).encodeABI(),
      };
      let signedTx = await web3.eth.accounts.signTransaction(tx, buyerPrivateKey);
      if (signedTx.rawTransaction != null) {
        await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      }

      // buyer close order
      nonce = await web3.eth.getTransactionCount(buyer, "latest"); //get latest nonce
      tx = {
        from: buyer,
        to: roveMarketplaceAddress,
        nonce: nonce,
        gas: 500000,
        data: marketplace1.methods.closeOffering(offeringId, amountCloseOffer).encodeABI(),
      };
      signedTx = await web3.eth.accounts.signTransaction(tx, buyerPrivateKey);
      if (signedTx.rawTransaction != null) {
        await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      }
      const creatorBenefit = ((priceOffer * amountCloseOffer) / 100) * CREATOR_BENEFIT;

      console.log("creator benifit: ", creatorBenefit);
      // check balance
      const marketBalanceRoveToken = await roveToken.balanceOf(roveMarketplaceAddress);
      console.log("marketBalanceRoveToken: ", marketBalanceRoveToken);

      expect(marketBalanceRoveToken).to.equal(priceOffer * amountCloseOffer);

      let nftOwnerBalanceRoveTokenOnMarket = await roveMarketplace.viewBalances(nftOwner, roveTokenContractAddress);
      console.log("nftOwnerBalanceRoveTokenOnMarket: ", nftOwnerBalanceRoveTokenOnMarket);

      if (nftOwner != roveTokenAdmin) {
        expect(nftOwnerBalanceRoveTokenOnMarket).to.equal(priceOffer * amountCloseOffer - creatorBenefit);
      } else {
        expect(nftOwnerBalanceRoveTokenOnMarket).to.equal(priceOffer * amountCloseOffer);
      }

      const buyerBalanceRoveToken = await roveToken.balanceOf(buyer);
      expect(buyerBalanceRoveToken).to.equal(buyerBalance * decimals - priceOffer * amountCloseOffer);

      let nftOwnerBalanceNFT = await objectNFT.balanceOf(nftOwner, tokenID);
      expect(nftOwnerBalanceNFT).to.equal(initSupply - amountCloseOffer);
      const buyerBalanceNFT = await objectNFT.balanceOf(buyer, tokenID);
      console.log("Balance NFT of buyer: ", buyerBalanceNFT);
      expect(buyerBalanceNFT).to.equal(amountCloseOffer);
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
      if (nftOwner != roveTokenAdmin) {
        expect(nftOwnerWithdrawBalance).to.equal(priceOffer * amountCloseOffer - creatorBenefit);
      } else {
        expect(nftOwnerWithdrawBalance).to.equal(priceOffer * amountCloseOffer);
      }
    });

    it("* Test buyer approve for market smaller than total NFTs price ", async function () {
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
      const amountPlaceOffer = 3;
      tx = await roveMarketplace.placeOffering(
        objectNFTAddress,
        tokenID,
        roveTokenContractAddress,
        priceOffer,
        amountPlaceOffer
      );
      receipt = await tx.wait();
      events = receipt.events?.filter(x => {
        return x.event == "OfferingPlaced";
      });
      expect(events.length).to.equal(1);
      const offeringId = events[0].args[0];

      // buyer approve for market place contract as spender
      const amountCloseOffer = amountPlaceOffer - 1; // 3
      await signAnotherContractThenExcuteFunction(
        roveTokenJson,
        roveTokenContractAddress,
        buyer,
        "approve",
        [roveMarketplaceAddress, (priceOffer * amountCloseOffer) / 2],
        buyerPrivateKey
      );

      // buyer close order
      try {
        await signAnotherContractThenExcuteFunction(
          roveMaketJson,
          roveMarketplaceAddress,
          buyer,
          "closeOffering",
          [offeringId, amountCloseOffer],
          buyerPrivateKey
        );
      } catch (error) {
        expect(error.toString()).to.include("ERC-20_NOT_APPROVED");
      }
    });

    it("* Test buyer close offer with amount greater than offered amount", async function () {
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
      const amountPlaceOffer = 3;
      tx = await roveMarketplace.placeOffering(
        objectNFTAddress,
        tokenID,
        roveTokenContractAddress,
        priceOffer,
        amountPlaceOffer
      );
      receipt = await tx.wait();
      events = receipt.events?.filter(x => {
        return x.event == "OfferingPlaced";
      });
      expect(events.length).to.equal(1);
      const offeringId = events[0].args[0];

      // buyer approve for market place contract as spender
      const amountCloseOffer = amountPlaceOffer * 2;
      await signAnotherContractThenExcuteFunction(
        roveTokenJson,
        roveTokenContractAddress,
        buyer,
        "approve",
        [roveMarketplaceAddress, priceOffer * amountCloseOffer],
        buyerPrivateKey
      );

      // buyer close order with amount > offered amount
      try {
        await signAnotherContractThenExcuteFunction(
          roveMaketJson,
          roveMarketplaceAddress,
          buyer,
          "closeOffering",
          [offeringId, amountCloseOffer],
          buyerPrivateKey
        );
      } catch (error) {
        expect(error.toString()).to.include("ERC-1155-AMOUNT_INVALID");
      }
    });

    it("* Test buyer is not enough funds erc-20 to buy", async function () {
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
      const priceOffer = 5000000000 * decimals;
      const amountPlaceOffer = 3;
      tx = await roveMarketplace.placeOffering(
        objectNFTAddress,
        tokenID,
        roveTokenContractAddress,
        priceOffer,
        amountPlaceOffer
      );
      receipt = await tx.wait();
      events = receipt.events?.filter(x => {
        return x.event == "OfferingPlaced";
      });
      expect(events.length).to.equal(1);
      const offeringId = events[0].args[0];

      // buyer approve for market place contract as spender
      const amountCloseOffer = amountPlaceOffer;
      await signAnotherContractThenExcuteFunction(
        roveTokenJson,
        roveTokenContractAddress,
        buyer,
        "approve",
        [roveMarketplaceAddress, priceOffer * amountCloseOffer],
        buyerPrivateKey
      );

      // buyer close order with amount > offered amount
      try {
        await signAnotherContractThenExcuteFunction(
          roveMaketJson,
          roveMarketplaceAddress,
          buyer,
          "closeOffering",
          [offeringId, amountCloseOffer],
          buyerPrivateKey
        );
      } catch (error) {
        expect(error.toString()).to.include("ERC-20_BALANCE_INVALID");
      }
    });

    it("* Test place offering at 2 marketplaces with total offer greater than init token", async function () {
      /*
        1. Deploy 2 market places
        2. Seller offer at 2 market with total greater than init token
        3. Buyer buy at 2 market places
      */
      const marketplace2Address = "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199";
      let roveMarketplace2;
      let marketContract2 = await ethers.getContractFactory("RoveMarketPlace");
      // deploy second
      roveMarketplace2 = await marketContract2.deploy(marketplace2Address, paramControlAddress);
      roveMarketplace2Address = roveMarketplace2.address;
      console.log("Rove Market place 2 contract address", roveMarketplace2Address);
      // nftOwner approve for market place 1 contract
      let tx = await objectNFT.setApprovalForAll(roveMarketplaceAddress, true);
      let receipt = await tx.wait();
      let events = receipt.events?.filter(x => {
        return x.event == "ApprovalForAll";
      });
      expect(events.length).to.equal(1);
      expect(events[0].args[0]).to.equal(nftOwner);
      expect(events[0].args[1]).to.equal(roveMarketplaceAddress);
      expect(events[0].args[2]).to.equal(true);

      // nftOwner approve for market place 2 contract
      let tx2 = await objectNFT.setApprovalForAll(roveMarketplace2Address, true);
      let receipt2 = await tx2.wait();
      let events2 = receipt2.events?.filter(x => {
        return x.event == "ApprovalForAll";
      });
      expect(events2.length).to.equal(1);
      expect(events2[0].args[0]).to.equal(nftOwner);
      expect(events2[0].args[1]).to.equal(roveMarketplace2Address);
      expect(events2[0].args[2]).to.equal(true);

      // nftOwner place offering with price 5 rove token at marketplace 1
      const priceOffer = 5 * decimals;
      const amountPlaceOffer = 7;
      tx = await roveMarketplace.placeOffering(
        objectNFTAddress,
        tokenID,
        roveTokenContractAddress,
        priceOffer,
        amountPlaceOffer
      );
      receipt = await tx.wait();
      events = receipt.events?.filter(x => {
        return x.event == "OfferingPlaced";
      });
      expect(events.length).to.equal(1);
      const offeringId = events[0].args[0];

      // nftOwner place offering with price 5 rove token at marketplace 2
      const amountPlaceOffer2 = 4;
      tx2 = await roveMarketplace2.placeOffering(
        objectNFTAddress,
        tokenID,
        roveTokenContractAddress,
        priceOffer,
        amountPlaceOffer2
      );
      receipt2 = await tx2.wait();
      events2 = receipt2.events?.filter(x => {
        return x.event == "OfferingPlaced";
      });
      expect(events2.length).to.equal(1);
      const offeringId2 = events2[0].args[0];

      // buyer approve for market place contract as spender
      const amountCloseOffer = amountPlaceOffer;
      await signAnotherContractThenExcuteFunction(
        roveTokenJson,
        roveTokenContractAddress,
        buyer,
        "approve",
        [roveMarketplaceAddress, priceOffer * amountCloseOffer],
        buyerPrivateKey
      );

      // buyer close order at market 1
      await signAnotherContractThenExcuteFunction(
        roveMaketJson,
        roveMarketplaceAddress,
        buyer,
        "closeOffering",
        [offeringId, amountCloseOffer],
        buyerPrivateKey
      );

      // buyer close offer at market 2
      const amountCloseOffer2 = amountPlaceOffer2;
      await signAnotherContractThenExcuteFunction(
        roveTokenJson,
        roveTokenContractAddress,
        buyer,
        "approve",
        [roveMarketplace2Address, priceOffer * amountCloseOffer2],
        buyerPrivateKey
      );
      try {
        await signAnotherContractThenExcuteFunction(
          roveMaketJson,
          roveMarketplace2Address,
          buyer,
          "closeOffering",
          [offeringId2, amountCloseOffer2],
          buyerPrivateKey
        );
      } catch (error) {
        expect(error.toString()).to.include("ERC-1155_BALANCE_INVALID");
      }
    });

    it("* Test withdraw with difference token", async function () {
      /*
      1. Deploy 2 tokens
      2. Place offer token 1
      3. Buyer close offer and seller withdraw with token 2
    */
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

      // nftOwner place offering with price 5 rove token at marketplace 1
      const priceOffer = 6 * decimals;
      const amountPlaceOffer = 7;
      tx = await roveMarketplace.placeOffering(
        objectNFTAddress,
        tokenID,
        roveTokenContractAddress,
        priceOffer,
        amountPlaceOffer
      );
      receipt = await tx.wait();
      events = receipt.events?.filter(x => {
        return x.event == "OfferingPlaced";
      });
      expect(events.length).to.equal(1);
      const offeringId = events[0].args[0];

      // buyer approve for market place contract as spender
      const amountCloseOffer = amountPlaceOffer;
      await signAnotherContractThenExcuteFunction(
        roveTokenJson,
        roveTokenContractAddress,
        buyer,
        "approve",
        [roveMarketplaceAddress, priceOffer * amountCloseOffer],
        buyerPrivateKey
      );

      // buyer close order at market
      await signAnotherContractThenExcuteFunction(
        roveMaketJson,
        roveMarketplaceAddress,
        buyer,
        "closeOffering",
        [offeringId, amountCloseOffer],
        buyerPrivateKey
      );
      // Offerer withdraw another token
      try {
        tx = await roveMarketplace.withdrawBalance(roveToken2ContractAddress);
      } catch (error) {
        console.error(error);
        expect(error.toString()).to.include("WITHDRAW_UNAVAILABLE");
      }
    });

    it("* Test none operator close offering", async function () {
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

      // nftOwner place offering with price 5 rove token at marketplace 1
      const priceOffer = 5 * decimals;
      const amountPlaceOffer = 9;
      tx = await roveMarketplace.placeOffering(
        objectNFTAddress,
        tokenID,
        roveTokenContractAddress,
        priceOffer,
        amountPlaceOffer
      );
      receipt = await tx.wait();
      events = receipt.events?.filter(x => {
        return x.event == "OfferingPlaced";
      });
      expect(events.length).to.equal(1);
      const offeringId = events[0].args[0];

      // buyer approve for market place contract as spender
      const amountCloseOffer = amountPlaceOffer;
      await signAnotherContractThenExcuteFunction(
        roveTokenJson,
        roveTokenContractAddress,
        buyer,
        "approve",
        [roveMarketplaceAddress, priceOffer * amountCloseOffer],
        buyerPrivateKey
      );

      // close offering without operator role
      try {
        await roveMarketplace.operatorCloseOffering(offeringId);
      } catch (error) {
        console.error(error);
        expect(error.toString()).to.include("OPERATOR_ONLY");
      }
    });

    it("* Test operator close offering", async function () {
      let tx = await objectNFT.setApprovalForAll(roveMarketplaceAddress, true);
      let receipt = await tx.wait();
      let events = receipt.events?.filter(x => {
        return x.event == "ApprovalForAll";
      });
      expect(events.length).to.equal(1);
      expect(events[0].args[0]).to.equal(nftOwner);
      expect(events[0].args[1]).to.equal(roveMarketplaceAddress);
      expect(events[0].args[2]).to.equal(true);

      // nftOwner place offering with price 5 rove token at marketplace 1
      const priceOffer = 5 * decimals;
      const amountPlaceOffer = 9;
      tx = await roveMarketplace.placeOffering(
        objectNFTAddress,
        tokenID,
        roveTokenContractAddress,
        priceOffer,
        amountPlaceOffer
      );
      receipt = await tx.wait();
      events = receipt.events?.filter(x => {
        return x.event == "OfferingPlaced";
      });
      expect(events.length).to.equal(1);
      const offeringId = events[0].args[0];

      // close offering by operator
      await signAnotherContractThenExcuteFunction(
        roveMaketJson,
        roveMarketplaceAddress,
        operator_address,
        "operatorCloseOffering",
        [offeringId],
        operator_privatekey
      );

      let closed = await roveMarketplace.viewOfferingNFT(offeringId);
      console.log("closed: ", closed);
      expect(closed[3]).to.equal(true);

      // buyer approve for market place contract as spender
      const amountCloseOffer = amountPlaceOffer;

      await signAnotherContractThenExcuteFunction(
        roveTokenJson,
        roveTokenContractAddress,
        buyer,
        "approve",
        [roveMarketplaceAddress, priceOffer * amountCloseOffer],
        buyerPrivateKey
      );
      // buyer buy afer operator close offering
      try {
        await signAnotherContractThenExcuteFunction(
          roveMaketJson,
          roveMarketplaceAddress,
          buyer,
          "closeOffering",
          [offeringId, amountCloseOffer],
          buyerPrivateKey
        );
      } catch (error) {
        expect(error.toString()).to.include("OFFERING_CLOSED");
      }
    });

    it("* Test benifit of market when sell/buy by Rove token", async function () {
      const MARKET_BENEFIT = 1000; // 10%
      const ROVE_TOKEN_ADD = roveTokenContractAddress;
      const DISCOUNT_ROVE_TOKEN = 200; // Operator benifit = 8 %
      const CREATOR_BENEFIT = 0;
      // set parameter control when use rove token to trade
      await paramControl.set("ROVE_TOKEN", ROVE_TOKEN_ADD);
      await paramControl.setUInt256("DISCOUNT_ROVE_TOKEN", DISCOUNT_ROVE_TOKEN);
      await paramControl.setUInt256("MARKET_BENEFIT", MARKET_BENEFIT);
      await paramControl.setUInt256("CREATOR_BENEFIT", CREATOR_BENEFIT);

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
      const amountPlaceOffer = 3;
      tx = await roveMarketplace.placeOffering(
        objectNFTAddress,
        tokenID,
        roveTokenContractAddress,
        priceOffer,
        amountPlaceOffer
      );
      receipt = await tx.wait();
      events = receipt.events?.filter(x => {
        return x.event == "OfferingPlaced";
      });
      expect(events.length).to.equal(1);
      const offeringId = events[0].args[0];

      // buyer approve for market place contract as spender
      const amountCloseOffer = amountPlaceOffer;
      let benifitOfOperator = priceOffer * amountCloseOffer * 0.1; // operator of market place
      benifitOfOperatorAfterDiscount = benifitOfOperator - benifitOfOperator * 0.02;

      await signAnotherContractThenExcuteFunction(
        roveTokenJson,
        roveTokenContractAddress,
        buyer,
        "approve",
        [roveMarketplaceAddress, priceOffer * amountCloseOffer],
        buyerPrivateKey
      );

      // Balance of rovemarketpace, buyer, seller before close oferring
      const balanceNFTofSellerBefore = await objectNFT.balanceOf(nftOwner, tokenID);
      const balanceNFTofBuyerBefore = await objectNFT.balanceOf(buyer, tokenID);
      const balanceRoveTokenofSellerBefore = await roveToken.balanceOf(nftOwner);
      const balanceRoveTokenofBuyerBefore = await roveToken.balanceOf(buyer);
      const balanceRoveTokenofMarketBefore = await roveToken.balanceOf(roveMarketplaceAddress);
      console.log(
        "Balance before: ",
        balanceNFTofSellerBefore,
        balanceNFTofBuyerBefore,
        balanceRoveTokenofSellerBefore,
        balanceRoveTokenofBuyerBefore,
        balanceRoveTokenofMarketBefore
      );

      // buyer close offering
      await signAnotherContractThenExcuteFunction(
        roveMaketJson,
        roveMarketplaceAddress,
        buyer,
        "closeOffering",
        [offeringId, amountCloseOffer],
        buyerPrivateKey
      );

      // check balance nft of seller
      const balanceNFTofSellerAfter = await objectNFT.balanceOf(nftOwner, tokenID);
      expect(balanceNFTofSellerAfter).to.equal(initSupply - amountCloseOffer);

      // check balance nft of buyer
      const balanceNFTofBuyerAfter = await objectNFT.balanceOf(buyer, tokenID);
      expect(balanceNFTofBuyerAfter).to.equal(amountCloseOffer);

      // check balance rove token of seller
      await roveMarketplace.withdrawBalance(roveTokenContractAddress);
      const balanceRoveTokenofSellerAfterWithdraw = await roveToken.balanceOf(nftOwner);
      expect(balanceRoveTokenofSellerAfterWithdraw).to.equal(
        priceOffer * amountCloseOffer - benifitOfOperatorAfterDiscount
      );

      // check balance rove token of buyer
      const balanceRoveTokenofBuyerAfter = await roveToken.balanceOf(buyer);
      expect(balanceRoveTokenofBuyerAfter).to.equal(balanceRoveTokenofBuyerBefore - priceOffer * amountCloseOffer);

      // check balance rove token of market place
      const balanceRoveTokenofMarketAfterWithdraw = await roveToken.balanceOf(roveMarketplaceAddress);
      expect(balanceRoveTokenofMarketAfterWithdraw).to.equal(benifitOfOperatorAfterDiscount);

      console.log(
        "Balance after: ",
        balanceNFTofSellerAfter,
        balanceNFTofBuyerAfter,
        balanceRoveTokenofSellerAfterWithdraw,
        balanceRoveTokenofBuyerAfter,
        balanceRoveTokenofMarketAfterWithdraw
      );
    });

    context("* Place/close offering with ETH", () => {
      const address0 = "0x0000000000000000000000000000000000000000"; // ETH
      const ethValue = ethers.utils.parseEther("8000"); // 1 ETH
      const web3 = createAlchemyWeb3(hardhatConfig.networks[hardhatConfig.defaultNetwork].url);
      it("* Test place offer with ETH", async function () {
        let tx = await objectNFT.setApprovalForAll(roveMarketplaceAddress, true);
        let receipt = await tx.wait();
        let events = receipt.events?.filter(x => {
          return x.event == "ApprovalForAll";
        });
        expect(events.length).to.equal(1);
        expect(events[0].args[0]).to.equal(nftOwner);
        expect(events[0].args[1]).to.equal(roveMarketplaceAddress);
        expect(events[0].args[2]).to.equal(true);

        // nftOwner place offering with price 5 rove token at marketplace 1
        const priceOffer = 5 * decimals;
        const amountPlaceOffer = 9;
        tx = await roveMarketplace.placeOffering(objectNFTAddress, tokenID, address0, priceOffer, amountPlaceOffer);
        receipt = await tx.wait();
        events = receipt.events?.filter(x => {
          return x.event == "OfferingPlaced";
        });
        expect(events.length).to.equal(1);
        const offeringId = events[0].args[0];
        const hostContract = events[0].args[1];
        const offerer = events[0].args[2];
        const tokenId1 = events[0].args[3];
        const price = events[0].args[5];
        expect(hostContract).to.equal(objectNFTAddress);
        expect(offerer).to.equal(nftOwner);
        expect(tokenId1).to.equal(tokenID);
        expect(price).to.equal(priceOffer);
        expect(events[0].args[4]).to.equal(address0);
        const viewOffering = await roveMarketplace.viewOfferingNFT(offeringId);
        console.log(" View offering: ", viewOffering);
        expect(viewOffering[3]).to.equal(false);
      });

      it("* Test close offer with ETH", async function () {
        let tx = await objectNFT.setApprovalForAll(roveMarketplaceAddress, true);
        let receipt = await tx.wait();
        let events = receipt.events?.filter(x => {
          return x.event == "ApprovalForAll";
        });
        expect(events.length).to.equal(1);
        expect(events[0].args[0]).to.equal(nftOwner);
        expect(events[0].args[1]).to.equal(roveMarketplaceAddress);
        expect(events[0].args[2]).to.equal(true);

        // nftOwner place offering with price 5 rove token at marketplace 1
        const priceOffer = ethers.utils.parseEther("1000");
        const amountPlaceOffer = 8;
        tx = await roveMarketplace.placeOffering(objectNFTAddress, tokenID, address0, priceOffer, amountPlaceOffer);
        receipt = await tx.wait();
        events = receipt.events?.filter(x => {
          return x.event == "OfferingPlaced";
        });
        const offeringId = events[0].args[0];
        let balanceEthOfBuyer1 = await web3.eth.getBalance(buyer);
        let blanceEthOfNftOwner1 = await web3.eth.getBalance(nftOwner);
        let blanceEthOfMarketPlace1 = await web3.eth.getBalance(roveMarketplaceAddress);

        balanceEthOfBuyer1 = web3.utils.fromWei(balanceEthOfBuyer1, "ether");
        blanceEthOfNftOwner1 = web3.utils.fromWei(blanceEthOfNftOwner1, "ether");
        blanceEthOfMarketPlace1 = web3.utils.fromWei(blanceEthOfMarketPlace1, "ether");
        console.log(
          "===> Balance ETH of NFT buyer, owner, marketplace before close offer:",
          balanceEthOfBuyer1,
          blanceEthOfNftOwner1,
          blanceEthOfMarketPlace1
        );
        const amountCloseOffer = amountPlaceOffer;
        await signAnotherContractThenExcuteFunctionWithValue(
          roveMaketJson,
          roveMarketplaceAddress,
          buyer,
          ethValue,
          "closeOffering",
          [offeringId, amountCloseOffer],
          buyerPrivateKey
        );

        // check ETH balance of buyer
        let balanceEthOfBuyer = await web3.eth.getBalance(buyer);
        let blanceEthOfNftOwner = await web3.eth.getBalance(nftOwner);
        let blanceEthOfMarketPlace = await web3.eth.getBalance(roveMarketplaceAddress);
        balanceEthOfBuyer = web3.utils.fromWei(balanceEthOfBuyer, "ether");
        blanceEthOfNftOwner = web3.utils.fromWei(blanceEthOfNftOwner, "ether");
        blanceEthOfMarketPlace = web3.utils.fromWei(blanceEthOfMarketPlace, "ether");
        console.log(
          "===> Balance ETH of NFT buyer, owner afer close offer:",
          balanceEthOfBuyer,
          blanceEthOfNftOwner,
          blanceEthOfMarketPlace
        );
      });
    });
  });
});
