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
  generateBytes,
  signAnotherContractThenExcuteFunction,
  signAnotherContractThenExcuteFunctionWithValue,
} = require("../common_libs");
let nft_owner_address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // default for local

describe("** NFTs erc-1155 contract", function () {
  let rockNFT;
  let rockNFTAddress;
  let parameterControl;
  let parameterControlAddress;
  const adminContract = addresses[0]; // default for local
  const operatorContract = addresses[1]; // default for local
  const userMint = addresses[2];
  const newMetaVerseOwner = addresses[3];
  const address0 = "0x0000000000000000000000000000000000000000"; // ETH

  let apiUri = "https://rove-dev.moshwithme.io/api/v1/rock/{id}/json";
  const jsonFile = "./artifacts/contracts/goods/RockNFT.sol/RockNFT.json";

  // public zone
  const maxRockPublic = 1000;
  const priceRockPublic = ETH("1");
  const mintRockPublic = 99;
  const zone3Index = 3;

  let rocksIdsPublic = [];
  for (let i = 1; i <= maxRockPublic; i++) {
    rocksIdsPublic.push(BigInt("0x" + i.toString(16)));
  }

  beforeEach(async function () {
    console.log("Hardhat network", hardhatConfig.defaultNetwork);

    if (hardhatConfig.defaultNetwork !== "local") {
      nft_owner_address = `${process.env.PUBLIC_KEY}`;
    }
    console.log("nft_owner_address", nft_owner_address);

    let ParameterControlContract = await ethers.getContractFactory("ParameterControl");

    // deploy parameter control
    parameterControl = await ParameterControlContract.deploy(adminContract);
    parameterControlAddress = parameterControl.address;
    console.log("ParameterControl deployed address", parameterControlAddress);

    let RockNFTContract = await ethers.getContractFactory("RockNFT");
    rockNFT = await RockNFTContract.deploy(nft_owner_address, operatorContract, parameterControlAddress, "Rock", "R");
    rockNFTAddress = rockNFT.address;
    console.log("RockNFTDeploy address", rockNFT.address);

    const publicZoneRockIndex = 2;
    // public zone
    ZONE3 = {
      zoneIndex: zone3Index,
      price: priceRockPublic,
      coreTeamAddr: address0,
      collAddr: address0,
      typeZone: 3,
      rockIndexFrom: publicZoneRockIndex,
      rockIndexTo: rocksIdsPublic.length,
    };
  });

  describe("* Create Rock NFT Zone 3", () => {
    it("- Test init metaverse with missing fee", async () => {
      const metaverseId = 1;
      const INIT_IMO_FEE = ETH("0.01");
      await parameterControl.setUInt256("INIT_IMO_FEE", INIT_IMO_FEE);
      try {
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          nft_owner_address,
          ETH("9"),
          "initMetaverse",
          [metaverseId.toString(16), ZONE3],
          private_keys[0]
        );
      } catch (e) {
        expect(e.toString()).to.include("I_F");
      }
    });

    it("- Test change metaverse owner", async () => {
      const metaverseId = 1;
      const ETH_VALUE = ETH("1");
      const INIT_IMO_FEE = ETH("0.01");
      const ROCK_PUR_FEE_PERCENT = 300; // 3%
      await parameterControl.setUInt256("INIT_IMO_FEE", INIT_IMO_FEE);
      await parameterControl.setUInt256("ROCK_PUR_FEE", ROCK_PUR_FEE_PERCENT);

      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        nft_owner_address,
        ETH("10"),
        "initMetaverse",
        [metaverseId.toString(16), ZONE3],
        private_keys[0]
      );
      await rockNFT.changeMetaverseOwner(metaverseId.toString(16), newMetaVerseOwner);
      const balanceETHOfUserBeforeMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerBefore = await getEthBalance(newMetaVerseOwner);
      for (let i = 1; i < mintRockPublic; i++) {
        let tokenID = BigInt((metaverseId * 10 ** 9 + zone3Index) * 10 ** 9) + rocksIdsPublic[i];
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          userMint,
          ETH_VALUE,
          "mintRock",
          [metaverseId.toString(16), userMint, zone3Index, rocksIdsPublic[i], apiUri, "0x0"],
          private_keys[2]
        );
        let balanceRockMinter = await rockNFT.balanceOf(userMint, tokenID);
        expect(balanceRockMinter).to.equal(1);
      }

      const balanceETHOfUserAfterMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerAfter = await getEthBalance(newMetaVerseOwner);
      const numberRealRockMint = mintRockPublic - 1;

      const PUR_FEE = convertWeiToEth(ETH_VALUE * numberRealRockMint * 0.03);
      expect(balanceETHOfUserAfterMint).to.lessThanOrEqual(
        balanceETHOfUserBeforeMint - convertWeiToEth(ETH_VALUE * numberRealRockMint)
      );
      expect(balanceETHOfNFTOwnerAfter).to.equal(
        balanceETHOfNFTOwnerBefore + convertWeiToEth(ETH_VALUE * numberRealRockMint) - PUR_FEE
      );

      const INIT_FEE = maxRockPublic * INIT_IMO_FEE;
      const balanceOfRockNFTAdress = await getEthBalance(rockNFTAddress);
      expect(balanceOfRockNFTAdress).to.eq(convertWeiToEth(INIT_FEE) + PUR_FEE);
    });

    it("- Test mint rock ID 1", async () => {
      const metaverseId = 1;
      const ETH_VALUE = ETH("1");
      const INIT_IMO_FEE = ETH("0.01");
      const ROCK_PUR_FEE_PERCENT = 300; // 3%
      await parameterControl.setUInt256("INIT_IMO_FEE", INIT_IMO_FEE);
      await parameterControl.setUInt256("ROCK_PUR_FEE", ROCK_PUR_FEE_PERCENT);

      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        nft_owner_address,
        ETH("10"),
        "initMetaverse",
        [metaverseId.toString(16), ZONE3],
        private_keys[0]
      );
      try {
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          userMint,
          ETH_VALUE,
          "mintRock",
          [metaverseId.toString(16), userMint, zone3Index, rocksIdsPublic[0], apiUri, "0x0"],
          private_keys[2]
        );
      } catch (e) {
        expect(e.toString()).to.include("I_R_I");
      }
    });

    it("- Test create metaverse with rock indexFrom 1", async () => {
      const metaverseId = 1;
      const INIT_IMO_FEE = ETH("0.01");
      const ROCK_PUR_FEE_PERCENT = 300; // 3%
      await parameterControl.setUInt256("INIT_IMO_FEE", INIT_IMO_FEE);
      await parameterControl.setUInt256("ROCK_PUR_FEE", ROCK_PUR_FEE_PERCENT);
      ZONE3.rockIndexFrom = 1;

      try {
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          nft_owner_address,
          ETH("10"),
          "initMetaverse",
          [metaverseId.toString(16), ZONE3],
          private_keys[0]
        );
      } catch (e) {
        expect(e.toString()).to.include("I_Z2");
      }
    });

    it("- Test change public price rock", async function () {
      const newPublicPriceRock = ETH("2");
      const metaverseId = 1;
      await rockNFT.initMetaverse(metaverseId.toString(16), ZONE3);
      // change price for public rock
      await rockNFT.changeZonePrice(metaverseId.toString(16), zone3Index, newPublicPriceRock);
      const balanceETHOfUserBeforeMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerBefore = await getEthBalance(nft_owner_address);
      for (let i = 1; i < mintRockPublic; i++) {
        try {
          await signAnotherContractThenExcuteFunctionWithValue(
            jsonFile,
            rockNFTAddress,
            userMint,
            ETH("1"),
            "mintRock",
            [metaverseId.toString(16), userMint, zone3Index, rocksIdsPublic[i], apiUri, "0x0"],
            private_keys[2]
          );
        } catch (e) {
          expect(e.toString()).to.include("M_P_P");
        }
      }

      for (let i = 1; i < mintRockPublic; i++) {
        let tokenID = BigInt((metaverseId * 10 ** 9 + zone3Index) * 10 ** 9) + rocksIdsPublic[i];
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          userMint,
          ETH("2"),
          "mintRock",
          [metaverseId.toString(16), userMint, zone3Index, rocksIdsPublic[i], apiUri, "0x0"],
          private_keys[2]
        );
        let balanceRockMinter = await rockNFT.balanceOf(userMint, tokenID);
        expect(balanceRockMinter).to.equal(1);
      }

      const balanceETHOfUserAfterMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerAfter = await getEthBalance(nft_owner_address);
      const numberRealRockMint = mintRockPublic - 1;

      expect(balanceETHOfUserAfterMint).to.lessThanOrEqual(
        balanceETHOfUserBeforeMint - convertWeiToEth(newPublicPriceRock * numberRealRockMint)
      );
      expect(balanceETHOfNFTOwnerAfter).to.equal(
        balanceETHOfNFTOwnerBefore + convertWeiToEth(newPublicPriceRock * numberRealRockMint)
      );
    });

    it("- Test add new zone", async function () {
      const metaverseId = 1;
      const zone4Index = 4;
      const maxRockPublicNewZone = 1000;
      const INIT_IMO_FEE = ETH("0.01");
      await parameterControl.setUInt256("INIT_IMO_FEE", INIT_IMO_FEE);

      let rocksIdsPublic = [];
      for (let i = 1; i <= maxRockPublicNewZone; i++) {
        rocksIdsPublic.push(BigInt("0x" + i.toString(16)));
      }
      // public zone
      ZONE4 = {
        zoneIndex: zone4Index,
        price: priceRockPublic,
        coreTeamAddr: address0,
        collAddr: address0,
        typeZone: 3,
        rockIndexFrom: 1,
        rockIndexTo: rocksIdsPublic.length,
      };

      // init metaverse
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        nft_owner_address,
        ETH("10"),
        "initMetaverse",
        [metaverseId.toString(16), ZONE3],
        private_keys[0]
      );
      // add new zone
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        nft_owner_address,
        ETH("10"),
        "addZone",
        [metaverseId.toString(16), ZONE4],
        private_keys[0]
      );

      const balanceETHOfUserBeforeMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerBefore = await getEthBalance(nft_owner_address);

      // mint rock public
      for (let i = 0; i < mintRockPublic; i++) {
        let tokenID = BigInt((metaverseId * 10 ** 9 + zone4Index) * 10 ** 9) + rocksIdsPublic[i];
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          userMint,
          ETH("1"),
          "mintRock",
          [metaverseId.toString(16), userMint, zone4Index, rocksIdsPublic[i], apiUri, "0x0"],
          private_keys[2]
        );

        let balanceRockMinter = await rockNFT.balanceOf(userMint, tokenID);
        expect(balanceRockMinter).to.equal(1);
      }
      const balanceETHOfUserAfterMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerAfter = await getEthBalance(nft_owner_address);

      const INIT_FEE_ZONE = maxRockPublic * INIT_IMO_FEE;
      const INIT_FEE_NEW_ZONE = maxRockPublicNewZone * INIT_IMO_FEE;

      expect(balanceETHOfUserAfterMint).to.lessThanOrEqual(
        balanceETHOfUserBeforeMint - convertWeiToEth(priceRockPublic * mintRockPublic)
      );

      expect(balanceETHOfNFTOwnerAfter).to.equal(
        balanceETHOfNFTOwnerBefore + convertWeiToEth(priceRockPublic * mintRockPublic)
      );

      const balanceOfRockNFTAdress = await getEthBalance(rockNFTAddress);
      expect(balanceOfRockNFTAdress).to.eq(convertWeiToEth(INIT_FEE_ZONE) + convertWeiToEth(INIT_FEE_NEW_ZONE));
    });
  });
});
