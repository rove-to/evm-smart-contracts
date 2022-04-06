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

describe.only("** Ticket NFT721", () => {
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
  const jsonFileErc721Tradable = "./artifacts/contracts/utils/ERC721Tradable.sol/ERC721Tradable.json";
  const TOKEN_URI = "https://gateway.pinata.cloud/ipfs/QmWYZQzeTHDMGcsUMgdJ64hgLrXk8iZKDRmbxWha4xdbbH";
  const TOKEN_ID = 2; // erc1155 , erc721
  const TICKET_ID = 1;
  const DATA = generateBytes(TOKEN_ID);
  // percent for ticket public free
  const INIT_SUPPLY_TOKEN = 1;
  const MAX_SUPPLY = 2; // max supply = init + total mint
  const PRICE_PER_TOKEN = ETH("100");
  const ETH_VALUE_MINT = ETH("100");
  const QTY_MINT_721 = 1;

  const userOwnerTicket = "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199";
  const userOwnerTicketPrivateKey = "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";
  const userMintContract = addresses[3];
  const userMintPrivateKey = private_keys[3];
  const userMint2Contract = "0xdd2fd4581271e230360230f9337d5c0430bf44c0";
  const userMint2PrivateKey = "0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0";
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
    console.log("ERC721 Tradable deployed address: ", erc721TradableAddress);

    // create erc 1155 token
    await signAnotherContractThenExcuteFunction(
      jsonFileErc1155Tradable,
      erc1155TradableAddress,
      operatorContract,
      "create",
      [userMintContract, TOKEN_ID, INIT_SUPPLY_TOKEN, TOKEN_URI, "0x00", PRICE_PER_TOKEN, MAX_SUPPLY],
      operatorPrivateKey
    );

    // create erc 721 token
    await signAnotherContractThenExcuteFunction(
      jsonFileErc721Tradable,
      erc721TradableAddress,
      operatorContract,
      "mintTo",
      [userMintContract, TOKEN_URI],
      operatorPrivateKey
    );
  });
  it("- Test publish ticket with contract address is not ERC721", async () => {
    // publist ticket with erc1155 address
    try {
      await signAnotherContractThenExcuteFunction(
        jsonFileTicket721NFT,
        ticketNFT721Address,
        operatorContract,
        "publishTicket",
        [userOwnerTicket, erc1155TradableAddress, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
        operatorPrivateKey
      );
    } catch (e) {
      expect(e.toString()).to.include("NOT_ERC721");
    }
  });

  it("- Test publish ticket Erc721 twice", async () => {
    // create ticket
    await signAnotherContractThenExcuteFunction(
      jsonFileTicket721NFT,
      ticketNFT721Address,
      operatorContract,
      "publishTicket",
      [userOwnerTicket, erc721TradableAddress, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
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
        [userOwnerTicket, erc721TradableAddress, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
        operatorPrivateKey
      );
    } catch (e) {
      expect(e.toString()).to.include("IS_EXISTEd");
    }
  });

  it("- Test user mint without own erc721 token", async () => {
    await signAnotherContractThenExcuteFunction(
      jsonFileTicket721NFT,
      ticketNFT721Address,
      operatorContract,
      "publishTicket",
      [userOwnerTicket, erc721TradableAddress, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
      operatorPrivateKey
    );
    // user mint ticket without own erc 721 token
    try {
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFileTicket721NFT,
        ticketNFT721Address,
        adminContract,
        ETH_VALUE_MINT,
        "userMint",
        [adminContract, TICKET_ID, QTY_MINT_721, DATA],
        adminPrivateKey
      );
    } catch (e) {
      expect(e.toString()).to.include("NOT_OWNER_ERC721");
    }
  });

  it("- Test minted token can't mint again", async () => {
    // user 1 publish erc 721 ticket
    await signAnotherContractThenExcuteFunction(
      jsonFileTicket721NFT,
      ticketNFT721Address,
      operatorContract,
      "publishTicket",
      [userOwnerTicket, erc721TradableAddress, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
      operatorPrivateKey
    );

    // user 2 mint ticket
    await signAnotherContractThenExcuteFunctionWithValue(
      jsonFileTicket721NFT,
      ticketNFT721Address,
      userMintContract,
      ETH_VALUE_MINT,
      "userMint",
      [userMintContract, TICKET_ID, QTY_MINT_721, DATA],
      userMintPrivateKey
    );
    // user 2 mint same ticket
    try {
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFileTicket721NFT,
        ticketNFT721Address,
        userMintContract,
        ETH_VALUE_MINT,
        "userMint",
        [userMintContract, TICKET_ID, QTY_MINT_721, DATA],
        userMintPrivateKey
      );
    } catch (e) {
      expect(e.toString()).to.include("MINTED");
    }
  });

  it("- Test mint with quantity greater than 1", async () => {
    // user 1 publish erc 721 ticket
    await signAnotherContractThenExcuteFunction(
      jsonFileTicket721NFT,
      ticketNFT721Address,
      operatorContract,
      "publishTicket",
      [userOwnerTicket, erc721TradableAddress, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
      operatorPrivateKey
    );

    // user 2 mint 2 tickets
    try {
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFileTicket721NFT,
        ticketNFT721Address,
        userMintContract,
        ETH_VALUE_MINT,
        "userMint",
        [userMintContract, TICKET_ID, 2, DATA], // quantity mint is 2
        userMintPrivateKey
      );
    } catch (e) {
      expect(e.toString()).to.include("MAX_QUANTITY");
    }
  });

  it("- Test mint ticket is not existed", async () => {
    // user 1 publish erc 721 ticket
    await signAnotherContractThenExcuteFunction(
      jsonFileTicket721NFT,
      ticketNFT721Address,
      operatorContract,
      "publishTicket",
      [userOwnerTicket, erc721TradableAddress, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
      operatorPrivateKey
    );

    // user 2 mint
    try {
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFileTicket721NFT,
        ticketNFT721Address,
        userMintContract,
        ETH_VALUE_MINT,
        "userMint",
        [userMintContract, 100, QTY_MINT_721, DATA], // ticket id 100 is not existed
        userMintPrivateKey
      );
    } catch (e) {
      expect(e.toString()).to.include("NONEXIST_TOKEN");
    }
  });

  it("- Test minter doesn't enough ETH", async () => {
    const ETH_VALUE_MINT = ETH("99");
    // user 1 publish erc 721 ticket
    await signAnotherContractThenExcuteFunction(
      jsonFileTicket721NFT,
      ticketNFT721Address,
      operatorContract,
      "publishTicket",
      [userOwnerTicket, erc721TradableAddress, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
      operatorPrivateKey
    );

    // user 2 mint
    try {
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFileTicket721NFT,
        ticketNFT721Address,
        userMintContract,
        ETH_VALUE_MINT,
        "userMint",
        [userMintContract, TICKET_ID, QTY_MINT_721, DATA],
        userMintPrivateKey
      );
    } catch (e) {
      expect(e.toString()).to.include("MISS_PRICE");
    }
  });

  it("- Test mint when reach max supply", async () => {
    // create second erc 721 token
    await signAnotherContractThenExcuteFunction(
      jsonFileErc721Tradable,
      erc721TradableAddress,
      operatorContract,
      "mintTo",
      [userMint2Contract, TOKEN_URI],
      operatorPrivateKey
    );

    // user 1 publish erc 721 ticket
    await signAnotherContractThenExcuteFunction(
      jsonFileTicket721NFT,
      ticketNFT721Address,
      operatorContract,
      "publishTicket",
      [userOwnerTicket, erc721TradableAddress, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
      operatorPrivateKey
    );
    // user 2 mint
    await signAnotherContractThenExcuteFunctionWithValue(
      jsonFileTicket721NFT,
      ticketNFT721Address,
      userMintContract,
      ETH_VALUE_MINT,
      "userMint",
      [userMintContract, TICKET_ID, QTY_MINT_721, DATA],
      userMintPrivateKey
    );
    // user 3 mint
    try {
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFileTicket721NFT,
        ticketNFT721Address,
        userMint2Contract,
        ETH_VALUE_MINT,
        "userMint",
        [userMint2Contract, TICKET_ID, QTY_MINT_721, DATA],
        userMint2PrivateKey
      );
    } catch (e) {
      expect(e.toString()).to.include("REACH_MAX");
    }
  });

  it("- Test mint non eixsted erc721 token ", async () => {
    const DATA = generateBytes(999); // erc 721 token id 999
    // user 1 publish erc 721 ticket
    await signAnotherContractThenExcuteFunction(
      jsonFileTicket721NFT,
      ticketNFT721Address,
      operatorContract,
      "publishTicket",
      [userOwnerTicket, erc721TradableAddress, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
      operatorPrivateKey
    );

    // user 2 mint
    try {
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFileTicket721NFT,
        ticketNFT721Address,
        userMintContract,
        ETH_VALUE_MINT,
        "userMint",
        [userMintContract, TICKET_ID, QTY_MINT_721, DATA],
        userMintPrivateKey
      );
    } catch (e) {
      expect(e.toString()).to.include("ERC721: owner query for nonexistent token");
    }
  });

  it.only("- Test balance of all contract", async () => {
    // user 1 publish erc 721 ticket
    await signAnotherContractThenExcuteFunction(
      jsonFileTicket721NFT,
      ticketNFT721Address,
      operatorContract,
      "publishTicket",
      [userOwnerTicket, erc721TradableAddress, INIT_SUPPLY_TOKEN, TOKEN_URI, PRICE_PER_TOKEN, MAX_SUPPLY],
      operatorPrivateKey
    );
    const balanceETHOfOperator = await getEthBalance(operatorContract);
    const balanceETHOfMinterBeforeMint = await getEthBalance(userMintContract);
    // user 2 mint
    await signAnotherContractThenExcuteFunctionWithValue(
      jsonFileTicket721NFT,
      ticketNFT721Address,
      userMintContract,
      ETH_VALUE_MINT,
      "userMint",
      [userMintContract, TICKET_ID, QTY_MINT_721, DATA],
      userMintPrivateKey
    );

    const totalTokenAfterMint = await ticketNFT721.totalSupply(TICKET_ID);
    const balanceTicketOfOwner = await ticketNFT721.balanceOf(userOwnerTicket, TICKET_ID);
    const balanceTokenOfMinter = await ticketNFT721.balanceOf(userMintContract, TICKET_ID);
    expect(totalTokenAfterMint).to.equal(INIT_SUPPLY_TOKEN + QTY_MINT_721);
    expect(balanceTicketOfOwner).to.equal(INIT_SUPPLY_TOKEN);
    expect(balanceTokenOfMinter).to.equal(QTY_MINT_721);

    // check balane eth of ticket nft 721 contract
    const balanceTicketNFT721 = await getEthBalance(ticketNFT721Address);
    expect(balanceTicketNFT721).to.equal(convertWeiToEth(ETH_VALUE_MINT));

    // check operator receiced correct eth after mint then withdraw
    await ticketNFT721.withdraw(operatorContract);
    const balanceETHOfOperatorAfter = await getEthBalance(operatorContract);
    expect(balanceETHOfOperatorAfter).to.equal(balanceETHOfOperator + convertWeiToEth(ETH_VALUE_MINT));

    // check balane eth of ticket nft 721 contract after withdraw
    const balanceTicketNFT721After = await getEthBalance(ticketNFT721Address);
    expect(balanceTicketNFT721After).to.equal(0);

    // check balance of minter
    const balanceETHOfMinterAfterMint = await getEthBalance(userMintContract);
    expect(balanceETHOfMinterAfterMint).to.lessThanOrEqual(
      balanceETHOfMinterBeforeMint - convertWeiToEth(ETH_VALUE_MINT)
    );
  });
});
