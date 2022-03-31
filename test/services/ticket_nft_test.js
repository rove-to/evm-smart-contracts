var { solidity } = require("ethereum-waffle");
var chai = require("chai");
chai.use(solidity);
const { ethers } = require("hardhat");
const expect = chai.expect;
const { addresses, private_keys } = require("../constants");
const hardhatConfig = require("../../hardhat.config");
const {
  sleep,
  getEthBalance,
  convertWeiToEth,
  ETH,
  signAnotherContractThenExcuteFunction,
  signAnotherContractThenExcuteFunctionWithValue,
} = require("../common_libs");

const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const PrivateKeyProvider = require("truffle-privatekey-provider");

describe.only("** Ticket NFT", () => {
  let ticketNFT;
  let parameterControl;
  let ticketNFTAddress;
  let parameterControlAddress;
  let adminContract = addresses[0]; // default for local
  let adminPrivateKey = private_keys[0];
  let operatorContract = addresses[1];
  let operatorPrivateKey = private_keys[1];
  const jsonFile = "./artifacts/contracts/services/TicketNFT.sol/TicketNFT.json";
  const TOKEN_URI = "abcxyz";
  const tokenId = 1;
  // percent for ticket public free
  const TICKET_PUB_FEE = ETH("0.01");
  const INIT_SUPPLY_TOKEN = 100;
  const MAX_SUPPLY = 1000; // max supply = init + total mint
  const PRICE_PER_TOKEN = ETH("0.03");
  const ETH_VALUE = ETH("0.1");

  const userOwnerTicket = "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199";
  const userOwnerTicketPrivateKey = "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";
  const userMintContract = addresses[3];
  const userMintPrivateKey = private_keys[3];

  // setup before every test
  beforeEach(async () => {
    console.log("Hardhat network", hardhatConfig.defaultNetwork);
    let TicketNFTContract = await ethers.getContractFactory("TicketNFT");
    let ParameterControlContract = await ethers.getContractFactory("ParameterControl");

    // deploy parameter control
    parameterControl = await ParameterControlContract.deploy(adminContract);
    parameterControlAddress = parameterControl.address;
    console.log("ParameterControl deployed address", parameterControlAddress);

    // deploy ticket NFT
    ticketNFT = await TicketNFTContract.deploy(adminContract, operatorContract, parameterControlAddress);
    ticketNFTAddress = ticketNFT.address;
    console.log("Ticket NFT deployed address", ticketNFTAddress);
    await parameterControl.setUInt256("TICKET_PUB_FEE", TICKET_PUB_FEE);
  });

  it("- Test publish ticket with publish free is 0", async () => {
    await parameterControl.setUInt256("TICKET_PUB_FEE", 0);
    // create then publish ticket with fee = 0
    await ticketNFT.publishTicket(userOwnerTicket, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY);
    const isTokenExists = await ticketNFT.exists(tokenId);
    const tokenSupply = await ticketNFT.totalSupply(tokenId);
    const maxSupplyToken = await ticketNFT.getMaxSupplyToken(tokenId);
    const ticketCreator = await ticketNFT.getCreator(tokenId);
    const balanceOfTicketOwner = await ticketNFT.balanceOf(userOwnerTicket, tokenId);
    expect(isTokenExists).to.equal(true);
    expect(tokenSupply).to.equal(INIT_SUPPLY_TOKEN);
    expect(maxSupplyToken).to.equal(MAX_SUPPLY);
    expect(ticketCreator.toLowerCase()).to.equal(adminContract.toLowerCase());
    expect(balanceOfTicketOwner).to.equal(INIT_SUPPLY_TOKEN);
  });

  it("- Test publish ticket with publish free > 0 without ETH", async () => {
    try {
      await ticketNFT.publishTicket(adminContract, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY);
    } catch (error) {
      expect(error.toString()).to.include("MISS_PUBLISH_FEE");
    }
  });

  it("- Test publish ticket with publish free > 0 without ETH", async () => {
    try {
      await ticketNFT.publishTicket(adminContract, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY);
    } catch (error) {
      expect(error.toString()).to.include("MISS_PUBLISH_FEE");
    }
  });

  it("- Test publish ticket with publish free > 0 with ETH_VALUE", async () => {
    await signAnotherContractThenExcuteFunctionWithValue(
      jsonFile,
      ticketNFTAddress,
      userOwnerTicket,
      ETH_VALUE,
      "publishTicket",
      [userOwnerTicket, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
      userOwnerTicketPrivateKey
    );
    const isTokenExists = await ticketNFT.exists(tokenId);
    const tokenSupply = await ticketNFT.totalSupply(tokenId);
    const maxSupplyToken = await ticketNFT.getMaxSupplyToken(tokenId);
    const ticketCreator = await ticketNFT.getCreator(tokenId);
    const balanceOfTicketOwner = await ticketNFT.balanceOf(userOwnerTicket, tokenId);
    expect(isTokenExists).to.equal(true);
    expect(tokenSupply).to.equal(INIT_SUPPLY_TOKEN);
    expect(maxSupplyToken).to.equal(MAX_SUPPLY);
    expect(ticketCreator.toLowerCase()).to.equal(userOwnerTicket.toLowerCase());
    expect(balanceOfTicketOwner).to.equal(INIT_SUPPLY_TOKEN);
  });

  it("- Test publish ticket with publish free > 0 with ETH_VALUE < PUBLISH FEE", async () => {
    const ETH_VALUE = ETH("0.001");
    try {
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        ticketNFTAddress,
        adminContract,
        ETH_VALUE,
        "publishTicket",
        [adminContract, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
        adminPrivateKey
      );
    } catch (error) {
      expect(error.toString()).to.include("MISS_PUBLISH_FEE");
    }
  });

  it("- Test user mint non-existed token", async () => {
    try {
      await ticketNFT.userMint(userMintContract, tokenId, 100, "0x00");
    } catch (error) {
      expect(error.toString()).to.include("NONEXIST_TOKEN");
    }
  });

  it("- Test user mint with not enought ETH value", async () => {
    const MINT_ETH_VALUE = ETH("0.05");
    const NUMBER_MINT = 3;
    // user create ticket
    await signAnotherContractThenExcuteFunctionWithValue(
      jsonFile,
      ticketNFTAddress,
      userOwnerTicket,
      ETH_VALUE,
      "publishTicket",
      [adminContract, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
      userOwnerTicketPrivateKey
    );

    // another user mint ticket with value < price * total ticket
    try {
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        ticketNFTAddress,
        userMintContract,
        MINT_ETH_VALUE,
        "userMint",
        [userMintContract, tokenId, NUMBER_MINT, "0x00"],
        userMintPrivateKey
      );
    } catch (error) {
      expect(error.toString()).to.include("MISS_PRICE");
    }
  });

  it("- Test user mint reach max token", async () => {
    const MINT_ETH_VALUE = ETH("30");
    const NUMBER_MINT = 901;
    // user create ticket
    await signAnotherContractThenExcuteFunctionWithValue(
      jsonFile,
      ticketNFTAddress,
      userOwnerTicket,
      ETH_VALUE,
      "publishTicket",
      [adminContract, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
      userOwnerTicketPrivateKey
    );

    // another user mint ticket with value < price * total ticket
    try {
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        ticketNFTAddress,
        userMintContract,
        MINT_ETH_VALUE,
        "userMint",
        [userMintContract, tokenId, NUMBER_MINT, "0x00"],
        userMintPrivateKey
      );
    } catch (error) {
      expect(error.toString()).to.include("REACH_MAX");
    }
  });

  it("- Test user mint with price is 0", async () => {
    const MINT_ETH_VALUE = ETH("0.05");
    const PRICE_PER_TOKEN = ETH("0");
    const NUMBER_MINT = 3;
    // user create ticket
    await signAnotherContractThenExcuteFunctionWithValue(
      jsonFile,
      ticketNFTAddress,
      userOwnerTicket,
      ETH_VALUE,
      "publishTicket",
      [adminContract, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
      userOwnerTicketPrivateKey
    );

    // can only mint 1 ticket when price is 0
    try {
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        ticketNFTAddress,
        userMintContract,
        MINT_ETH_VALUE,
        "userMint",
        [userMintContract, tokenId, NUMBER_MINT, "0x00"],
        userMintPrivateKey
      );
    } catch (error) {
      expect(error.toString()).to.include("MAX_QUANTITY");
    }
    // mint 1 token
    await signAnotherContractThenExcuteFunctionWithValue(
      jsonFile,
      ticketNFTAddress,
      userMintContract,
      MINT_ETH_VALUE,
      "userMint",
      [userMintContract, tokenId, 1, "0x00"],
      userMintPrivateKey
    );
    const totalTokenAfterMint = await ticketNFT.totalSupply(tokenId);
    expect(totalTokenAfterMint).to.equal(INIT_SUPPLY_TOKEN + 1);
  });
});
