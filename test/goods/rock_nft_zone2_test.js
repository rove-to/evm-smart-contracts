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

describe("** Create Rock NFT Zone 2", function () {
  let rockNFT;
  let rockNFTAddress;
  let parameterControl;
  let parameterControlAddress;
  const adminContract = addresses[0]; // default for local
  const userMint = addresses[1]; // default for local
  const erc721User = addresses[2];
  const newMetaVerseOwner = addresses[3];
  const operatorContract = addresses[4];

  // collection
  const maxRockByNFTColl = 4000;
  const priceRockByNFTColl = ETH("0");
  const mintRockByNFTColl = 99;

  const address0 = "0x0000000000000000000000000000000000000000"; // ETH

  let apiUri = "https://rove-dev.moshwithme.io/api/v1/rock/{id}/json";
  const jsonFile = "./artifacts/contracts/goods/RockNFTCollectionHolder.sol/RockNFTCollectionHolder.json";
  const jsonFileErc721Tradable = "./artifacts/contracts/utils/ERC721Tradable.sol/ERC721Tradable.json";

  let rocksIdsNftColl = [];
  for (let i = 1; i <= maxRockByNFTColl; i++) {
    rocksIdsNftColl.push(BigInt("0x" + i.toString(16)));
  }

  const zone1Index = 1;
  const zone2Index = 2;

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

    let RockNFTContract = await ethers.getContractFactory("RockNFTCollectionHolder");
    rockNFT = await RockNFTContract.deploy(nft_owner_address, operatorContract, parameterControlAddress, "Rock", "R");
    rockNFTAddress = rockNFT.address;
    console.log("RockNFTDeploy address", rockNFT.address);

    // deploy ERC721 tradalbe
    let Erc721Tradable = await ethers.getContractFactory("ERC721Tradable");
    erc721Tradable = await Erc721Tradable.deploy("Rock", "R", apiUri, nft_owner_address, nft_owner_address);
    erc721TradableAddress = erc721Tradable.address;
    console.log("ERC721 Tradable deployed address: ", erc721TradableAddress);

    //
    erc721Tradable2 = await Erc721Tradable.deploy("Rock", "R", apiUri, nft_owner_address, nft_owner_address);
    erc721TradableAddress2 = erc721Tradable2.address;
    console.log("ERC721 Tradable deployed address2: ", erc721TradableAddress2);

    // create erc 721 token 1
    await signAnotherContractThenExcuteFunction(
      jsonFileErc721Tradable,
      erc721TradableAddress,
      nft_owner_address,
      "mintTo",
      [erc721User, apiUri],
      private_keys[0]
    );
    // create erc 721 token 2
    await signAnotherContractThenExcuteFunction(
      jsonFileErc721Tradable,
      erc721TradableAddress2,
      nft_owner_address,
      "mintTo",
      [erc721User, apiUri],
      private_keys[0]
    );

    // collection zone
    ZONE2 = {
      zoneIndex: zone2Index,
      price: priceRockByNFTColl,
      coreTeamAddr: address0,
      collAddr: erc721TradableAddress,
      typeZone: 2,
      rockIndexFrom: 2,
      rockIndexTo: 100,
    };
  });

  describe("* Create Rock NFT erc-1155", function () {
    it("- Test init metaverse with missing fee", async () => {
      const metaverseId = 1;
      const INIT_IMO_FEE = ETH("0.01");
      await parameterControl.setUInt256("INIT_IMO_FEE", INIT_IMO_FEE);
      await parameterControl.setUInt256("INIT_IMO_NFT_HOLDER_SIZE", maxRockByNFTColl);
      try {
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          nft_owner_address,
          ETH("39"),
          "initMetaverse",
          [metaverseId.toString(16), ZONE2],
          private_keys[0]
        );
      } catch (e) {
        console.error(e);
        expect(e.toString()).to.include("I_F");
      }
    });

    it.skip("- Test change metaverse owner", async () => {
      const ETH_VALUE = ETH("1");
      const metaverseId = 1;
      const INIT_IMO_FEE = ETH("0.01");
      const ROCK_PUR_FEE_PERCENT = 300; // 3%
      await parameterControl.setUInt256("INIT_IMO_FEE", INIT_IMO_FEE);
      await parameterControl.setUInt256("ROCK_PUR_FEE", ROCK_PUR_FEE_PERCENT);

      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        nft_owner_address,
        ETH("40"),
        "initMetaverse",
        [metaverseId.toString(16), ZONE2],
        private_keys[0]
      );

      // change metaverse owner
      await rockNFT.changeMetaverseOwner(metaverseId.toString(16), newMetaVerseOwner);
      const balanceETHOfUserBeforeMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerBefore = await getEthBalance(newMetaVerseOwner);

      let tokenID = BigInt((metaverseId * 10 ** 9 + zone2Index) * 10 ** 9) + rocksIdsPublic[1];
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        erc721User,
        ETH_VALUE,
        "mintRock",
        [metaverseId.toString(16), userMint, zone2Index, rocksIdsPublic[i], apiUri, "0x0"],
        private_keys[2]
      );
      let balanceRockMinter = await rockNFT.balanceOf(userMint, tokenID);
      expect(balanceRockMinter).to.equal(1);

      const balanceETHOfUserAfterMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerAfter = await getEthBalance(newMetaVerseOwner);

      const PUR_FEE = (convertWeiToEth(ETH_VALUE * mintRockPublic) * 3) / 100;
      expect(balanceETHOfUserAfterMint).to.lessThanOrEqual(balanceETHOfUserBeforeMint - convertWeiToEth(ETH_VALUE));
      expect(balanceETHOfNFTOwnerAfter).to.equal(balanceETHOfNFTOwnerBefore + convertWeiToEth(ETH_VALUE) - PUR_FEE);

      const INIT_FEE = maxRockByNFTColl * INIT_IMO_FEE;
      const balanceOfRockNFTAdress = await getEthBalance(rockNFTAddress);
      expect(balanceOfRockNFTAdress).to.eq(convertWeiToEth(INIT_FEE) + PUR_FEE);
    });

    it("- Test metaverse with erc721 collection with non-existed 721 token", async () => {
      const metaverseId = 1;
      const INIT_IMO_FEE = ETH("0.01");
      await parameterControl.setUInt256("INIT_IMO_FEE", INIT_IMO_FEE);

      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        nft_owner_address,
        ETH("150"),
        "initMetaverse",
        [metaverseId.toString(16), ZONE2],
        private_keys[0]
      );

      // mint collection
      for (let i = 0; i < mintRockByNFTColl; i++) {
        const DATA = generateBytes(99);
        try {
          await signAnotherContractThenExcuteFunctionWithValue(
            jsonFile,
            rockNFTAddress,
            erc721User,
            ETH("150"),
            "mintRock",
            [metaverseId.toString(16), erc721User, zone2Index, rocksIdsNftColl[i], apiUri, DATA],
            private_keys[2]
          );
        } catch (e) {
          expect(e.toString()).to.include("ERC721: owner query for nonexistent token");
        }
      }
    });

    it("- Test metaverse with erc721 collection with existed 721 token", async () => {
      const ETH_VALUE = ETH("0.1");
      const metaverseId = 1;
      const INIT_IMO_FEE = ETH("0.01");
      const ROCK_PUR_FEE_PERCENT = 300; // 3%
      const PUR_FEE = (convertWeiToEth(ETH_VALUE) * 3) / 100;
      await parameterControl.setUInt256("INIT_IMO_FEE", INIT_IMO_FEE);
      await parameterControl.setUInt256("ROCK_PUR_FEE", ROCK_PUR_FEE_PERCENT);

      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        nft_owner_address,
        ETH("150"),
        "initMetaverse",
        [metaverseId.toString(16), ZONE2],
        private_keys[0]
      );

      // check owner of rock index 1
      const rockIndex1Owner = await rockNFT.balanceOf(
        operatorContract,
        BigInt((metaverseId * 10 ** 9 + zone1Index) * 10 ** 9) + BigInt("0x" + "1".toString(16))
      );
      expect(rockIndex1Owner).to.eq(1);

      const balanceETHOfUserBeforeMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerBefore = await getEthBalance(nft_owner_address);

      // mint collection
      const DATA = generateBytes(1);
      let tokenID = BigInt((metaverseId * 10 ** 9 + zone2Index) * 10 ** 9) + rocksIdsNftColl[0];
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        erc721User,
        ETH_VALUE,
        "mintRock",
        [metaverseId.toString(16), erc721User, zone2Index, rocksIdsNftColl[0], apiUri, DATA],
        private_keys[2]
      );
      let balanceRockMinter = await rockNFT.balanceOf(erc721User, tokenID);
      expect(balanceRockMinter).to.equal(1);

      const balanceETHOfUserAfterMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerAfter = await getEthBalance(nft_owner_address);

      expect(balanceETHOfUserAfterMint).to.lessThanOrEqual(balanceETHOfUserBeforeMint);
      expect(balanceETHOfNFTOwnerAfter).to.equal(
        balanceETHOfNFTOwnerBefore + convertWeiToEth(priceRockByNFTColl) - PUR_FEE
      );

      const INIT_FEE = maxRockByNFTColl * INIT_IMO_FEE;
      const balanceOfRockNFTAdress = await getEthBalance(rockNFTAddress);
      expect(balanceOfRockNFTAdress).to.eq(convertWeiToEth(INIT_FEE) + PUR_FEE);
    });

    it("- Test add zone 2 with new erc721 collection", async () => {
      const metaverseId = 1;
      const INIT_IMO_FEE = ETH("0.01");
      await parameterControl.setUInt256("INIT_IMO_FEE", INIT_IMO_FEE);
      let NEW_ZONE_2 = { ...ZONE2 };
      NEW_ZONE_2.collAddr = erc721TradableAddress2;
      NEW_ZONE_2.zoneIndex = 3;

      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        nft_owner_address,
        ETH("40"),
        "initMetaverse",
        [metaverseId.toString(16), ZONE2],
        private_keys[0]
      );
      try {
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          nft_owner_address,
          ETH("100"),
          "addZone",
          [metaverseId.toString(16), NEW_ZONE_2],
          private_keys[0]
        );
      } catch (e) {
        expect(e.toString()).to.include("I_Z2");
      }

      let NEW_ZONE_2_1 = { ...ZONE2 };
      NEW_ZONE_2_1.zoneIndex = 4;
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        nft_owner_address,
        ETH("100"),
        "addZone",
        [metaverseId.toString(16), NEW_ZONE_2_1],
        private_keys[0]
      );
    });
    /*
    it("- Test change collection rock price", async () => {
      const newCollRockPrice = ETH("0.2");
      const ETH_VALUE = ETH("0.1");
      const metaverseId = 1;
      const INIT_IMO_FEE = ETH("0.01");
      const ROCK_PUR_FEE_PERCENT = 300; // 3%
      await parameterControl.setUInt256("INIT_IMO_FEE", INIT_IMO_FEE);
      await parameterControl.setUInt256("ROCK_PUR_FEE", ROCK_PUR_FEE_PERCENT);

      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        nft_owner_address,
        ETH("150"),
        "initMetaverse",
        [metaverseId.toString(16), ZONE1, ZONE2, ZONE3],
        private_keys[0]
      );

      // change collection rock price
      await rockNFT.changeZonePrice(metaverseId.toString(16), zone2Index, newCollRockPrice);

      // mint collection
      const DATA = generateBytes(1);
      try {
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          erc721User,
          ETH_VALUE,
          "mintRock",
          [metaverseId.toString(16), erc721User, zone2Index, rocksIdsNftColl[0], apiUri, DATA],
          private_keys[3]
        );
      } catch (e) {
        expect(e.toString()).to.include("M_P_N");
      }
      const balanceETHOfUserBeforeMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerBefore = await getEthBalance(nft_owner_address);

      let tokenID = BigInt((metaverseId * 10 ** 9 + zone2Index) * 10 ** 9) + rocksIdsNftColl[0];
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        erc721User,
        newCollRockPrice,
        "mintRock",
        [metaverseId.toString(16), erc721User, zone2Index, rocksIdsNftColl[0], apiUri, DATA],
        private_keys[3]
      );
      let balanceRockMinter = await rockNFT.balanceOf(erc721User, tokenID);
      expect(balanceRockMinter).to.equal(1);

      const balanceETHOfUserAfterMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerAfter = await getEthBalance(nft_owner_address);

      const PUR_FEE = convertWeiToEth(newCollRockPrice) * 0.03;
      expect(balanceETHOfUserAfterMint).to.lessThanOrEqual(balanceETHOfUserBeforeMint);

      expect(balanceETHOfNFTOwnerAfter).to.equal(
        balanceETHOfNFTOwnerBefore + convertWeiToEth(newCollRockPrice) - PUR_FEE
      );

      const INIT_FEE = (maxRockByNFTColl + maxRockPublic + maxRockCoreTeam) * INIT_IMO_FEE;
      const balanceOfRockNFTAdress = await getEthBalance(rockNFTAddress);
      expect(balanceOfRockNFTAdress).to.eq(convertWeiToEth(INIT_FEE) + PUR_FEE);
    });

    it("- Test metaverse with erc721 collection with existed 721 token but missing fee", async () => {
      const ETH_VALUE = ETH("0.01");
      const metaverseId = 1;
      const INIT_IMO_FEE = ETH("0.01");
      await parameterControl.setUInt256("INIT_IMO_FEE", INIT_IMO_FEE);

      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        nft_owner_address,
        ETH("150"),
        "initMetaverse",
        [metaverseId.toString(16), ZONE1, ZONE2, ZONE3],
        private_keys[0]
      );

      // mint collection
      const DATA = generateBytes(1);
      try {
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          erc721User,
          ETH_VALUE,
          "mintRock",
          [metaverseId.toString(16), erc721User, zone2Index, rocksIdsNftColl[0], apiUri, DATA],
          private_keys[3]
        );
      } catch (e) {
        expect(e.toString()).to.include("M_P_N");
      }

      // mint public rock
      try {
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          userMint,
          ETH_VALUE,
          "mintRock",
          [metaverseId.toString(16), userMint, zone3Index, rocksIdsPublic[0], apiUri, "0x0"],
          private_keys[1]
        );
      } catch (e) {
        expect(e.toString()).to.include("M_P_P");
      }
    });

    it("- Test add new zone", async function () {
      const metaverseId = 1;
      const zone4Index = 4;
      const zone5Index = 5;
      const zone6Index = 6;
      const maxRockCoreTeamNewZone = 100;
      const maxRockByNFTCollNewZone = 400;
      const maxRockPublicNewZone = 1000;
      const INIT_IMO_FEE = ETH("0.01");
      await parameterControl.setUInt256("INIT_IMO_FEE", INIT_IMO_FEE);

      let rocks = [];
      for (let i = 1; i <= maxRockCoreTeamNewZone + maxRockByNFTCollNewZone + maxRockPublicNewZone; i++) {
        rocks.push(i.toString(16));
      }

      // core team rock
      let rocksIdsCoreTeam = [];
      for (let i = 0; i < maxRockCoreTeamNewZone; i++) {
        rocksIdsCoreTeam.push(BigInt("0x" + rocks[i]));
      }
      // rock by nft coll
      let rocksIdsNftColl = [];
      for (let i = rocksIdsCoreTeam.length; i < maxRockCoreTeamNewZone + maxRockByNFTCollNewZone; i++) {
        rocksIdsNftColl.push(BigInt("0x" + rocks[i]));
      }

      // public rock
      let rocksIdsPublic = [];
      for (let i = rocksIdsCoreTeam.length + rocksIdsNftColl.length; i < rocks.length; i++) {
        rocksIdsPublic.push(BigInt("0x" + rocks[i]));
      }
      ZONE4 = {
        zoneIndex: zone4Index,
        price: priceRockCoreTeam,
        coreTeamAddr: coreTeamAddress,
        collAddr: address0,
        typeZone: 1,
        rockIndexFrom: 1,
        rockIndexTo: rocksIdsCoreTeam.length,
      };
      // collection zone
      ZONE5 = {
        zoneIndex: zone5Index,
        price: priceRockByNFTColl,
        coreTeamAddr: address0,
        collAddr: erc721TradableAddress,
        typeZone: 2,
        rockIndexFrom: rocksIdsCoreTeam.length,
        rockIndexTo: rocksIdsNftColl.length,
      };
      // public zone
      ZONE6 = {
        zoneIndex: zone6Index,
        price: priceRockPublic,
        coreTeamAddr: address0,
        collAddr: address0,
        typeZone: 3,
        rockIndexFrom: rocksIdsNftColl.length,
        rockIndexTo: rocksIdsPublic.length,
      };

      // init metaverse
      // await rockNFT.initMetaverse(metaverseId.toString(16), ZONE1, ZONE2, ZONE3);
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        nft_owner_address,
        ETH("150"),
        "initMetaverse",
        [metaverseId.toString(16), ZONE1, ZONE2, ZONE3],
        private_keys[0]
      );
      // add new zone
      // await rockNFT.addZone(metaverseId.toString(16), ZONE4); // coreteam zone
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        nft_owner_address,
        ETH("1"),
        "addZone",
        [metaverseId.toString(16), ZONE4],
        private_keys[0]
      );
      // await rockNFT.addZone(metaverseId.toString(16), ZONE5); // collection zone
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        nft_owner_address,
        ETH("4"),
        "addZone",
        [metaverseId.toString(16), ZONE5],
        private_keys[0]
      );
      // await rockNFT.addZone(metaverseId.toString(16), ZONE6); // public zone
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        nft_owner_address,
        ETH("10"),
        "addZone",
        [metaverseId.toString(16), ZONE6],
        private_keys[0]
      );

      const balanceETHOfUserBeforeMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerBefore = await getEthBalance(nft_owner_address);
      const balanceETHOfErc721UserBefore = await getEthBalance(erc721User);
      // mint core team rock in new zone
      for (let i = 0; i < mintRockCoreTeam; i++) {
        let tokenID = BigInt((metaverseId * 10 ** 9 + zone4Index) * 10 ** 9) + rocksIdsCoreTeam[i];
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          coreTeamAddress,
          priceRockCoreTeam, // core team mint with 0 eth
          "mintRock",
          [metaverseId.toString(16), coreTeamAddress, zone4Index, rocksIdsCoreTeam[i], apiUri, "0x0"],
          private_keys[2]
        );
        let balanceRockMinter = await rockNFT.balanceOf(coreTeamAddress, tokenID);
        expect(balanceRockMinter).to.equal(1);
      }

      // mint collection rock in new zone
      let tokenIDCoreTeamRock = BigInt((metaverseId * 10 ** 9 + zone5Index) * 10 ** 9) + rocksIdsNftColl[0];
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        erc721User,
        priceRockByNFTColl,
        "mintRock",
        [metaverseId.toString(16), erc721User, zone5Index, rocksIdsNftColl[0], apiUri, generateBytes(1)],
        private_keys[3]
      );
      let balanceRockMinter = await rockNFT.balanceOf(erc721User, tokenIDCoreTeamRock);
      expect(balanceRockMinter).to.equal(1);

      // mint rock public
      for (let i = 0; i < mintRockPublic; i++) {
        let tokenID = BigInt((metaverseId * 10 ** 9 + zone6Index) * 10 ** 9) + rocksIdsPublic[i];
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          userMint,
          ETH("1"),
          "mintRock",
          [metaverseId.toString(16), userMint, zone6Index, rocksIdsPublic[i], apiUri, "0x0"],
          private_keys[1]
        );

        let balanceRockMinter = await rockNFT.balanceOf(userMint, tokenID);
        expect(balanceRockMinter).to.equal(1);
      }
      const balanceETHOfUserAfterMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerAfter = await getEthBalance(nft_owner_address);
      const balanceETHOfErc721UserAfter = await getEthBalance(erc721User);

      const INIT_FEE_ZONE = (maxRockByNFTColl + maxRockPublic + maxRockCoreTeam) * INIT_IMO_FEE;
      const INIT_FEE_NEW_ZONE =
        (maxRockByNFTCollNewZone + maxRockPublicNewZone + maxRockCoreTeamNewZone) * INIT_IMO_FEE;

      expect(balanceETHOfUserAfterMint).to.lessThanOrEqual(
        balanceETHOfUserBeforeMint - convertWeiToEth(priceRockPublic * mintRockPublic)
      );

      expect(balanceETHOfNFTOwnerAfter).to.equal(
        balanceETHOfNFTOwnerBefore +
          convertWeiToEth(priceRockPublic * mintRockPublic) +
          convertWeiToEth(priceRockByNFTColl)
      );

      expect(balanceETHOfErc721UserAfter).to.lessThanOrEqual(
        balanceETHOfErc721UserBefore - convertWeiToEth(priceRockByNFTColl)
      );

      const balanceOfRockNFTAdress = await getEthBalance(rockNFTAddress);
      expect(balanceOfRockNFTAdress).to.eq(convertWeiToEth(INIT_FEE_ZONE) + convertWeiToEth(INIT_FEE_NEW_ZONE));
    }); */
  });
});
