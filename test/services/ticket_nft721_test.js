var { solidity } = require("ethereum-waffle");
var chai = require("chai");
chai.use(solidity);
const { ethers } = require("hardhat");
const expect = chai.expect;
const { addresses, private_keys } = require("../constants");
const hardhatConfig = require("../../hardhat.config");
const {
  getEthBalance,
  convertWeiToEth,
  ETH,
  signAnotherContractThenExcuteFunction,
  signAnotherContractThenExcuteFunctionWithValue,
  generateBytes,
} = require("../common_libs");

describe("** Ticket NFT721", () => {
  let ticketNFT721;
  let parameterControl;
  let erc1155Tradable;
  let erc721Tradable;
  let ticketNFT721Address;
  let parameterControlAddress;
  let erc1155TradableAddress;
  let erc721TradableAddress;
  let adminContract = addresses[0]; // default for local
  let adminPrivateKey = private_keys[0];
  let operatorContract = addresses[1];
  let operatorPrivateKey = private_keys[1];
  const jsonFileTicket721NFT = "./artifacts/contracts/services/TicketNFTFor721.sol/TicketNFTFor721.json";
  const jsonFileErc1155Tradable = "./artifacts/contracts/utils/ERC1155Tradable.sol/ERC1155Tradable.json";
  const jsonFieErc721Tradable = "./artifacts/contracts/utils/ERC721Tradable.sol/ERC721Tradable.json";
  const TOKEN_URI = "https://gateway.pinata.cloud/ipfs/QmWYZQzeTHDMGcsUMgdJ64hgLrXk8iZKDRmbxWha4xdbbH";
  const TOKEN_ID = 1;
  const TOKEN_ID_721 = 999;
  // percent for ticket public free
  const INIT_SUPPLY_TOKEN = 100;
  const MAX_SUPPLY = 1000; // max supply = init + total mint
  const PRICE_PER_TOKEN = ETH("100");
  const ETH_VALUE = ETH("0.5");

  const userOwnerTicket = "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199";
  const userOwnerTicketPrivateKey = "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";
  const userMintContract = addresses[3];
  const userMintPrivateKey = private_keys[3];
  const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

  // setup before every test
  beforeEach(async () => {
    console.log("Hardhat network", hardhatConfig.defaultNetwork);
    let TicketNFT721Contract = await ethers.getContractFactory("TicketNFTFor721");
    let ParameterControlContract = await ethers.getContractFactory("ParameterControl");
    let Erc1155Tradable = await ethers.getContractFactory("ERC1155Tradable");
    let Erc721Tradable = await ethers.getContractFactory("ERC721Tradable");

    // deploy parameter control
    parameterControl = await ParameterControlContract.deploy(adminContract);
    parameterControlAddress = parameterControl.address;
    console.log("ParameterControl deployed address: ", parameterControlAddress);

    // deploy ticket721 NFT
    ticketNFT721 = await TicketNFT721Contract.deploy(adminContract, operatorContract, parameterControlAddress);
    ticketNFT721Address = ticketNFT721.address;
    console.log("Ticket NFT deployed address: ", ticketNFT721Address);

    // deploy ERC1155 tradalbe
    erc1155Tradable = await Erc1155Tradable.deploy("Rove", "RVE", TOKEN_URI, adminContract, operatorContract);
    erc1155TradableAddress = erc1155Tradable.address;
    console.log("ERC1155 Tradable deployed address: ", erc1155TradableAddress);

    // deploy ERC721 tradalbe
    erc721Tradable = await Erc721Tradable.deploy("Rove", "RVE", TOKEN_URI, adminContract, operatorContract);
    erc721TradableAddress = erc721Tradable.address;
    console.log("ERC1155 Tradable deployed address: ", erc721TradableAddress);
  });

  it("- Test publish ticket twice", async () => {
    // create ticket
    await signAnotherContractThenExcuteFunction(
      jsonFileTicket721NFT,
      ticketNFT721Address,
      operatorContract,
      "publishTicket",
      [userOwnerTicket, ADDRESS_ZERO, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
      operatorPrivateKey
    );

    const isTokenExists = await ticketNFT721.exists(TOKEN_ID);
    const tokenSupply = await ticketNFT721.totalSupply(TOKEN_ID);
    const maxSupplyToken = await ticketNFT721.getMaxSupplyToken(TOKEN_ID);
    const ticketCreator = await ticketNFT721.getCreator(TOKEN_ID);
    const balanceOfTicketOwner = await ticketNFT721.balanceOf(userOwnerTicket, TOKEN_ID);
    expect(isTokenExists).to.equal(true);
    expect(tokenSupply).to.equal(INIT_SUPPLY_TOKEN);
    expect(maxSupplyToken).to.equal(MAX_SUPPLY);
    expect(ticketCreator.toLowerCase()).to.equal(operatorContract.toLowerCase());
    expect(balanceOfTicketOwner).to.equal(INIT_SUPPLY_TOKEN);

    // continue create ticket
    try {
      await signAnotherContractThenExcuteFunction(
        jsonFileTicket721NFT,
        ticketNFT721Address,
        operatorContract,
        "publishTicket",
        [userOwnerTicket, ADDRESS_ZERO, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
        operatorPrivateKey
      );
    } catch (e) {
      expect(e.toString()).to.include("IS_EXISTEd");
    }
  });

  it.only("- Test user mint without own erc721 token", async () => {
    // create erc721 token
    await signAnotherContractThenExcuteFunction(
      jsonFileErc1155Tradable,
      erc1155TradableAddress,
      operatorContract,
      "create",
      [userMintContract, 2, INIT_SUPPLY_TOKEN, TOKEN_URI, "0x00", PRICE_PER_TOKEN, MAX_SUPPLY],
      operatorPrivateKey
    );

    // create ticket
    const ETH_VALUE_MINT = ETH("300");

    await signAnotherContractThenExcuteFunction(
      jsonFileTicket721NFT,
      ticketNFT721Address,
      operatorContract,
      "publishTicket",
      [userOwnerTicket, userOwnerTicket, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
      operatorPrivateKey
    );
    const _data = generateBytes(TOKEN_ID_721);
    // continue create ticket
    await signAnotherContractThenExcuteFunctionWithValue(
      jsonFileTicket721NFT,
      ticketNFT721Address,
      userMintContract,
      ETH_VALUE_MINT,
      "userMint",
      [userMintContract, TOKEN_ID, 1, _data],
      userMintPrivateKey
    );
  });

  // it("- Test publish ticket with publish free > 0 without ETH", async () => {
  //   try {
  //     await ticketNFT721.publishTicket(adminContract, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY);
  //   } catch (error) {
  //     expect(error.toString()).to.include("MISS_PUBLISH_FEE");
  //   }
  // });

  // it("- Test publish ticket with publish free > 0 without ETH", async () => {
  //   try {
  //     await ticketNFT721.publishTicket(adminContract, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY);
  //   } catch (error) {
  //     expect(error.toString()).to.include("MISS_PUBLISH_FEE");
  //   }
  // });

  // it("- Test publish ticket with publish free > 0 with ETH_VALUE", async () => {
  //   await signAnotherContractThenExcuteFunctionWithValue(
  //     jsonFile,
  //     ticketNFT721Address,
  //     userOwnerTicket,
  //     ETH_VALUE,
  //     "publishTicket",
  //     [userOwnerTicket, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
  //     userOwnerTicketPrivateKey
  //   );
  //   const isTokenExists = await ticketNFT721.exists(tokenId);
  //   const tokenSupply = await ticketNFT721.totalSupply(tokenId);
  //   const maxSupplyToken = await ticketNFT721.getMaxSupplyToken(tokenId);
  //   const ticketCreator = await ticketNFT721.getCreator(tokenId);
  //   const balanceOfTicketOwner = await ticketNFT721.balanceOf(userOwnerTicket, tokenId);
  //   expect(isTokenExists).to.equal(true);
  //   expect(tokenSupply).to.equal(INIT_SUPPLY_TOKEN);
  //   expect(maxSupplyToken).to.equal(MAX_SUPPLY);
  //   expect(ticketCreator.toLowerCase()).to.equal(userOwnerTicket.toLowerCase());
  //   expect(balanceOfTicketOwner).to.equal(INIT_SUPPLY_TOKEN);
  // });

  // it("- Test publish ticket with publish free > 0 with ETH_VALUE < PUBLISH FEE", async () => {
  //   const ETH_VALUE = ETH("0.001");
  //   try {
  //     await signAnotherContractThenExcuteFunctionWithValue(
  //       jsonFile,
  //       ticketNFT721Address,
  //       adminContract,
  //       ETH_VALUE,
  //       "publishTicket",
  //       [adminContract, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
  //       adminPrivateKey
  //     );
  //   } catch (error) {
  //     expect(error.toString()).to.include("MISS_PUBLISH_FEE");
  //   }
  // });

  // it("- Test user mint non-existed token", async () => {
  //   try {
  //     await ticketNFT721.userMint(userMintContract, tokenId, 100, "0x00");
  //   } catch (error) {
  //     expect(error.toString()).to.include("NONEXIST_TOKEN");
  //   }
  // });

  // it("- Test user mint with not enought ETH value", async () => {
  //   const MINT_ETH_VALUE = ETH("0.05");
  //   const NUMBER_MINT = 3;
  //   // user create ticket
  //   await signAnotherContractThenExcuteFunctionWithValue(
  //     jsonFile,
  //     ticketNFT721Address,
  //     userOwnerTicket,
  //     ETH_VALUE,
  //     "publishTicket",
  //     [adminContract, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
  //     userOwnerTicketPrivateKey
  //   );

  //   // another user mint ticket with value < price * total ticket
  //   try {
  //     await signAnotherContractThenExcuteFunctionWithValue(
  //       jsonFile,
  //       ticketNFT721Address,
  //       userMintContract,
  //       MINT_ETH_VALUE,
  //       "userMint",
  //       [userMintContract, tokenId, NUMBER_MINT, "0x00"],
  //       userMintPrivateKey
  //     );
  //   } catch (error) {
  //     expect(error.toString()).to.include("MISS_PRICE");
  //   }
  // });

  // it("- Test user mint reach max token", async () => {
  //   const MINT_ETH_VALUE = ETH("30");
  //   const NUMBER_MINT = 901;
  //   // user create ticket
  //   await signAnotherContractThenExcuteFunctionWithValue(
  //     jsonFile,
  //     ticketNFT721Address,
  //     userOwnerTicket,
  //     ETH_VALUE,
  //     "publishTicket",
  //     [userOwnerTicket, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
  //     userOwnerTicketPrivateKey
  //   );

  //   // another user mint ticket with value < price * total ticket
  //   try {
  //     await signAnotherContractThenExcuteFunctionWithValue(
  //       jsonFile,
  //       ticketNFT721Address,
  //       userMintContract,
  //       MINT_ETH_VALUE,
  //       "userMint",
  //       [userMintContract, tokenId, NUMBER_MINT, "0x00"],
  //       userMintPrivateKey
  //     );
  //   } catch (error) {
  //     expect(error.toString()).to.include("REACH_MAX");
  //   }
  // });

  // it("- Test user mint with price is 0", async () => {
  //   const MINT_ETH_VALUE = ETH("0.05");
  //   const PRICE_PER_TOKEN = ETH("0");
  //   const NUMBER_MINT = 3;
  //   // user create ticket
  //   await signAnotherContractThenExcuteFunctionWithValue(
  //     jsonFile,
  //     ticketNFT721Address,
  //     userOwnerTicket,
  //     ETH_VALUE,
  //     "publishTicket",
  //     [userOwnerTicket, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
  //     userOwnerTicketPrivateKey
  //   );

  //   // can only mint 1 ticket when price is 0
  //   try {
  //     await signAnotherContractThenExcuteFunctionWithValue(
  //       jsonFile,
  //       ticketNFT721Address,
  //       userMintContract,
  //       MINT_ETH_VALUE,
  //       "userMint",
  //       [userMintContract, tokenId, NUMBER_MINT, "0x00"],
  //       userMintPrivateKey
  //     );
  //   } catch (error) {
  //     expect(error.toString()).to.include("MAX_QUANTITY");
  //   }
  //   // mint 1 token
  //   await signAnotherContractThenExcuteFunctionWithValue(
  //     jsonFile,
  //     ticketNFT721Address,
  //     userMintContract,
  //     MINT_ETH_VALUE,
  //     "userMint",
  //     [userMintContract, tokenId, 1, "0x00"],
  //     userMintPrivateKey
  //   );
  //   const totalTokenAfterMint = await ticketNFT721.totalSupply(tokenId);
  //   const balanceTokenOfOwner = await ticketNFT721.balanceOf(userOwnerTicket, tokenId);
  //   const balanceTokenOfMinter = await ticketNFT721.balanceOf(userMintContract, tokenId);
  //   expect(totalTokenAfterMint).to.equal(INIT_SUPPLY_TOKEN + 1);
  //   expect(balanceTokenOfOwner).to.equal(INIT_SUPPLY_TOKEN);
  //   expect(balanceTokenOfMinter).to.equal(1);
  // });

  // it("- Test user mint with 5% purchase fee", async () => {
  //   const TICKET_PUR_FEE = 500; // 5%
  //   const TICKET_PUB_FEE = ETH("0");
  //   const NUMBER_MINT = 3;
  //   const ETH_VALUE = ETH("0");
  //   const ETH_VALUE_MINT = ETH("300");
  //   const PRICE_PER_TOKEN = ETH("100");
  //   const purChaseFee = (TICKET_PUR_FEE * ETH_VALUE_MINT) / 10000;
  //   await parameterControl.setUInt256("TICKET_PUR_FEE", TICKET_PUR_FEE);
  //   await parameterControl.setUInt256("TICKET_PUB_FEE", TICKET_PUB_FEE);
  //   // user create ticket
  //   await signAnotherContractThenExcuteFunctionWithValue(
  //     jsonFile,
  //     ticketNFT721Address,
  //     userOwnerTicket,
  //     ETH_VALUE,
  //     "publishTicket",
  //     [userOwnerTicket, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
  //     userOwnerTicketPrivateKey
  //   );
  //   const balanceETHOfticketOwner = await getEthBalance(userOwnerTicket);
  //   const balanceETHOfMinterBeforeMint = await getEthBalance(userMintContract);

  //   // user mint
  //   await signAnotherContractThenExcuteFunctionWithValue(
  //     jsonFile,
  //     ticketNFT721Address,
  //     userMintContract,
  //     ETH_VALUE_MINT,
  //     "userMint",
  //     [userMintContract, tokenId, NUMBER_MINT, "0x00"],
  //     userMintPrivateKey
  //   );
  //   const totalTokenAfterMint = await ticketNFT721.totalSupply(tokenId);
  //   const balanceTicketOfOwner = await ticketNFT721.balanceOf(userOwnerTicket, tokenId);
  //   const balanceTokenOfMinter = await ticketNFT721.balanceOf(userMintContract, tokenId);
  //   expect(totalTokenAfterMint).to.equal(INIT_SUPPLY_TOKEN + NUMBER_MINT);
  //   expect(balanceTicketOfOwner).to.equal(INIT_SUPPLY_TOKEN);
  //   expect(balanceTokenOfMinter).to.equal(NUMBER_MINT);

  //   // check ticket owner receiced correct eth after mint
  //   const balanceETHOfticketOwnerAfter = await getEthBalance(userOwnerTicket);
  //   expect(balanceETHOfticketOwnerAfter).to.equal(
  //     balanceETHOfticketOwner + convertWeiToEth(ETH_VALUE_MINT) - convertWeiToEth(purChaseFee)
  //   );

  //   // check balance of minter
  //   const balanceETHOfMinterAfterMint = await getEthBalance(userMintContract);
  //   expect(balanceETHOfMinterAfterMint).to.lessThanOrEqual(
  //     balanceETHOfMinterBeforeMint - convertWeiToEth(ETH_VALUE_MINT)
  //   );

  //   // check deployer received 5% purchase fee
  //   const deployerBalance = await getEthBalance(ticketNFT721Address);
  //   expect(deployerBalance).to.equal(convertWeiToEth(purChaseFee));
  // });

  // it("- Test user mint with 0% purchase fee", async () => {
  //   const TICKET_PUR_FEE = 0; // 0%
  //   const TICKET_PUB_FEE = ETH("0");
  //   const NUMBER_MINT = 3;
  //   const ETH_VALUE = ETH("0");
  //   const ETH_VALUE_MINT = ETH("300");
  //   const PRICE_PER_TOKEN = ETH("100");
  //   const purChaseFee = (TICKET_PUR_FEE * ETH_VALUE_MINT) / 10000;
  //   await parameterControl.setUInt256("TICKET_PUR_FEE", TICKET_PUR_FEE);
  //   await parameterControl.setUInt256("TICKET_PUB_FEE", TICKET_PUB_FEE);
  //   // user create ticket
  //   await signAnotherContractThenExcuteFunctionWithValue(
  //     jsonFile,
  //     ticketNFT721Address,
  //     userOwnerTicket,
  //     ETH_VALUE,
  //     "publishTicket",
  //     [userOwnerTicket, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
  //     userOwnerTicketPrivateKey
  //   );
  //   const balanceETHOfticketOwner = await getEthBalance(userOwnerTicket);
  //   const balanceETHOfMinterBeforeMint = await getEthBalance(userMintContract);

  //   // user mint
  //   await signAnotherContractThenExcuteFunctionWithValue(
  //     jsonFile,
  //     ticketNFT721Address,
  //     userMintContract,
  //     ETH_VALUE_MINT,
  //     "userMint",
  //     [userMintContract, tokenId, NUMBER_MINT, "0x00"],
  //     userMintPrivateKey
  //   );
  //   const totalTokenAfterMint = await ticketNFT721.totalSupply(tokenId);
  //   const balanceTicketOfOwner = await ticketNFT721.balanceOf(userOwnerTicket, tokenId);
  //   const balanceTokenOfMinter = await ticketNFT721.balanceOf(userMintContract, tokenId);
  //   expect(totalTokenAfterMint).to.equal(INIT_SUPPLY_TOKEN + NUMBER_MINT);
  //   expect(balanceTicketOfOwner).to.equal(INIT_SUPPLY_TOKEN);
  //   expect(balanceTokenOfMinter).to.equal(NUMBER_MINT);

  //   // check ticket owner receiced correct eth after mint
  //   const balanceETHOfticketOwnerAfter = await getEthBalance(userOwnerTicket);
  //   expect(balanceETHOfticketOwnerAfter).to.equal(
  //     balanceETHOfticketOwner + convertWeiToEth(ETH_VALUE_MINT) - convertWeiToEth(purChaseFee)
  //   );

  //   // check balance of minter
  //   const balanceETHOfMinterAfterMint = await getEthBalance(userMintContract);
  //   expect(balanceETHOfMinterAfterMint).to.lessThanOrEqual(
  //     balanceETHOfMinterBeforeMint - convertWeiToEth(ETH_VALUE_MINT)
  //   );

  //   // check deployer received 0% purchase fee
  //   const deployerBalance = await getEthBalance(ticketNFT721Address);
  //   expect(deployerBalance).to.equal(0);
  // });
});
