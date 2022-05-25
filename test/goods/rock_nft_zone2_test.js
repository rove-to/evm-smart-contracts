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

    // deploy ERC721 tradalbe 2
    erc721Tradable2 = await Erc721Tradable.deploy("Rock1", "R1", apiUri, nft_owner_address, nft_owner_address);
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
    // create erc 721 token of other collection
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

    it("- Test change metaverse owner", async () => {
      const ETH_VALUE = ETH("1");
      const metaverseId = 1;
      const INIT_IMO_FEE = ETH("0.01");
      const ROCK_PUR_FEE_PERCENT = 300; // 3%
      const newPrice = ETH("1");

      await parameterControl.setUInt256("INIT_IMO_FEE", INIT_IMO_FEE);
      await parameterControl.setUInt256("ROCK_PUR_FEE", ROCK_PUR_FEE_PERCENT);

      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        nft_owner_address,
        ETH("1"),
        "initMetaverse",
        [metaverseId.toString(16), ZONE2],
        private_keys[0]
      );

      await signAnotherContractThenExcuteFunction(
        jsonFile,
        rockNFTAddress,
        operatorContract,
        "changeZonePrice",
        [metaverseId.toString(16), zone2Index, newPrice],
        private_keys[4]
      );

      // change metaverse owner
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        rockNFTAddress,
        operatorContract,
        "changeMetaverseOwner",
        [metaverseId.toString(16), newMetaVerseOwner],
        private_keys[4]
      );

      const balanceETHOfUserBeforeMint = await getEthBalance(erc721User);
      const balanceETHOfNFTOwnerBefore = await getEthBalance(newMetaVerseOwner);

      let tokenID = BigInt((metaverseId * 10 ** 9 + zone2Index) * 10 ** 9) + rocksIdsNftColl[1];
      const DATA = generateBytes(1);
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        erc721User,
        ETH_VALUE,
        "mintRock",
        [metaverseId.toString(16), userMint, zone2Index, rocksIdsNftColl[1], apiUri, DATA],
        private_keys[2]
      );
      let balanceRockMinter = await rockNFT.balanceOf(userMint, tokenID);
      expect(balanceRockMinter).to.equal(1);

      const balanceETHOfUserAfterMint = await getEthBalance(erc721User);
      const balanceETHOfNFTOwnerAfter = await getEthBalance(newMetaVerseOwner);

      const PUR_FEE = convertWeiToEth(ETH_VALUE) * 0.03;
      expect(balanceETHOfUserAfterMint).to.lessThanOrEqual(balanceETHOfUserBeforeMint - convertWeiToEth(ETH_VALUE));
      expect(balanceETHOfNFTOwnerAfter).to.equal(balanceETHOfNFTOwnerBefore + convertWeiToEth(ETH_VALUE) - PUR_FEE);

      const INIT_FEE = 100 * INIT_IMO_FEE;
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
      const PUR_FEE = convertWeiToEth(ETH_VALUE) * 0.03;
      await parameterControl.setUInt256("INIT_IMO_FEE", INIT_IMO_FEE);
      await parameterControl.setUInt256("ROCK_PUR_FEE", ROCK_PUR_FEE_PERCENT);

      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        nft_owner_address,
        ETH("1"),
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
      let tokenID = BigInt((metaverseId * 10 ** 9 + zone2Index) * 10 ** 9) + rocksIdsNftColl[1];
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        erc721User,
        ETH("0"),
        "mintRock",
        [metaverseId.toString(16), erc721User, zone2Index, rocksIdsNftColl[1], apiUri, DATA],
        private_keys[2]
      );
      let balanceRockMinter = await rockNFT.balanceOf(erc721User, tokenID);
      expect(balanceRockMinter).to.equal(1);

      const balanceETHOfUserAfterMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerAfter = await getEthBalance(nft_owner_address);

      expect(balanceETHOfUserAfterMint).to.lessThanOrEqual(balanceETHOfUserBeforeMint);
      expect(balanceETHOfNFTOwnerAfter).to.equal(balanceETHOfNFTOwnerBefore);

      // const INIT_FEE = maxRockByNFTColl * INIT_IMO_FEE;
      const balanceOfRockNFTAdress = await getEthBalance(rockNFTAddress);
      expect(balanceOfRockNFTAdress).to.eq(1);
    });

    it("- Test add zone 2 with new erc721 collection", async () => {
      const metaverseId = 1;
      const INIT_IMO_FEE = ETH("0.01");
      await parameterControl.setUInt256("INIT_IMO_FEE", INIT_IMO_FEE);
      let NEW_ZONE_2 = { ...ZONE2 };
      NEW_ZONE_2.collAddr = erc721TradableAddress2;
      NEW_ZONE_2.zoneIndex = 3;
      console.log(NEW_ZONE_2);

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
          operatorContract,
          ETH("100"),
          "addZone",
          [metaverseId.toString(16), NEW_ZONE_2],
          private_keys[4]
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

    it("- Test add zone 3", async () => {
      const metaverseId = 1;
      const INIT_IMO_FEE = ETH("0.01");
      const zone3Index = 3;
      const maxRockPublic = 1000;
      const mintRockPublic = 99;
      const ETH_VALUE = ETH("0.1");
      const ROCK_PUR_FEE_PERCENT = 300; // 3%

      await parameterControl.setUInt256("INIT_IMO_FEE", INIT_IMO_FEE);
      await parameterControl.setUInt256("ROCK_PUR_FEE", ROCK_PUR_FEE_PERCENT);

      let rocksIdsPublic = [];
      for (let i = 1; i <= maxRockPublic; i++) {
        rocksIdsPublic.push(BigInt("0x" + i.toString(16)));
      }

      // public zone
      ZONE3 = {
        zoneIndex: zone3Index,
        price: ETH("0.1"),
        coreTeamAddr: address0,
        collAddr: address0,
        typeZone: 3,
        rockIndexFrom: 1,
        rockIndexTo: rocksIdsPublic.length,
      };

      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        nft_owner_address,
        ETH("1"),
        "initMetaverse",
        [metaverseId.toString(16), ZONE2],
        private_keys[0]
      );

      // add zone 3
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        operatorContract,
        ETH("10"),
        "addZone",
        [metaverseId.toString(16), ZONE3],
        private_keys[4]
      );

      // mint zone 3
      const balanceETHOfUserBeforeMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerBefore = await getEthBalance(operatorContract);

      for (let i = 0; i < mintRockPublic; i++) {
        let tokenID = BigInt((metaverseId * 10 ** 9 + zone3Index) * 10 ** 9) + rocksIdsPublic[i];
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          userMint,
          ETH_VALUE,
          "mintRock",
          [metaverseId.toString(16), userMint, zone3Index, rocksIdsPublic[i], apiUri, "0x0"],
          private_keys[1]
        );
        let balanceRockMinter = await rockNFT.balanceOf(userMint, tokenID);
        expect(balanceRockMinter).to.equal(1);
      }

      const balanceETHOfUserAfterMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerAfter = await getEthBalance(operatorContract);

      const PUR_FEE = convertWeiToEth(ETH_VALUE * mintRockPublic * 0.03);
      expect(balanceETHOfUserAfterMint).to.lessThanOrEqual(
        balanceETHOfUserBeforeMint - convertWeiToEth(ETH_VALUE * mintRockPublic)
      );
      expect(balanceETHOfNFTOwnerAfter).to.equal(
        balanceETHOfNFTOwnerBefore + convertWeiToEth(ETH_VALUE * mintRockPublic) - PUR_FEE
      );

      const INIT_FEE_ZONE2 = 100 * INIT_IMO_FEE;
      const INIT_FEE_ZONE3 = maxRockPublic * INIT_IMO_FEE;
      const balanceOfRockNFTAdress = await getEthBalance(rockNFTAddress);
      expect(balanceOfRockNFTAdress).to.eq(convertWeiToEth(INIT_FEE_ZONE2 + INIT_FEE_ZONE3) + PUR_FEE);
    });

    it("- Test metaverse with erc721 collection with existed 721 token but missing fee", async () => {
      const ETH_VALUE = ETH("0.9");
      const metaverseId = 1;
      const INIT_IMO_FEE = ETH("0.01");
      const newPrice = ETH("1");
      await parameterControl.setUInt256("INIT_IMO_FEE", INIT_IMO_FEE);

      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        nft_owner_address,
        ETH("1"),
        "initMetaverse",
        [metaverseId.toString(16), ZONE2],
        private_keys[0]
      );

      // change zone 2 rock price
      await signAnotherContractThenExcuteFunction(
        jsonFile,
        rockNFTAddress,
        operatorContract,
        "changeZonePrice",
        [metaverseId.toString(16), zone2Index, newPrice],
        private_keys[4]
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
          [metaverseId.toString(16), erc721User, zone2Index, rocksIdsNftColl[1], apiUri, DATA],
          private_keys[2]
        );
      } catch (e) {
        expect(e.toString()).to.include("M_P_N");
      }
    });
  });
});
