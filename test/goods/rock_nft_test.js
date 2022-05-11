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
  const userMint = addresses[1]; // default for local
  const coreTeamAddress = addresses[2];
  const erc721User = addresses[3];

  // core team
  const maxRockCoreTeam = 1000;
  const priceRockCoreTeam = ETH("0");
  const mintRockCoreTeam = 99;
  // collection
  const maxRockByNFTColl = 4000;
  const priceRockByNFTColl = ETH("0.1");
  const mintRockByNFTColl = 99;
  // public
  const maxRockPublic = 10000;
  const priceRockPublic = ETH("1");
  const mintRockPublic = 99;

  const address0 = "0x0000000000000000000000000000000000000000"; // ETH

  let apiUri = "https://rove-dev.moshwithme.io/api/v1/rock/{id}/json";
  const jsonFile = "./artifacts/contracts/goods/RockNFT.sol/RockNFT.json";
  const jsonFileErc721Tradable = "./artifacts/contracts/utils/ERC721Tradable.sol/ERC721Tradable.json";

  let rocks = [];
  for (let i = 1; i <= maxRockCoreTeam + maxRockByNFTColl + maxRockPublic; i++) {
    rocks.push(i.toString(16));
  }

  // core team rock
  let rocksIdsCoreTeam = [];
  for (let i = 0; i < maxRockCoreTeam; i++) {
    rocksIdsCoreTeam.push(BigInt("0x" + rocks[i]));
  }
  // rock by nft coll
  let rocksIdsNftColl = [];
  for (let i = rocksIdsCoreTeam.length; i < maxRockCoreTeam + maxRockByNFTColl; i++) {
    rocksIdsNftColl.push(BigInt("0x" + rocks[i]));
  }

  // public rock
  let rocksIdsPublic = [];
  for (let i = rocksIdsCoreTeam.length + rocksIdsNftColl.length; i < rocks.length; i++) {
    rocksIdsPublic.push(BigInt("0x" + rocks[i]));
  }

  const zone1Index = 1;
  const zone2Index = 2;
  const zone3Index = 3;

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
    rockNFT = await RockNFTContract.deploy(nft_owner_address, nft_owner_address, parameterControlAddress, "Rock", "R");
    rockNFTAddress = rockNFT.address;
    console.log("RockNFTDeploy address", rockNFT.address);

    // deploy ERC721 tradalbe
    let Erc721Tradable = await ethers.getContractFactory("ERC721Tradable");
    erc721Tradable = await Erc721Tradable.deploy("Rock", "R", apiUri, nft_owner_address, nft_owner_address);
    erc721TradableAddress = erc721Tradable.address;
    console.log("ERC721 Tradable deployed address: ", erc721TradableAddress);

    // create erc 721 token
    await signAnotherContractThenExcuteFunction(
      jsonFileErc721Tradable,
      erc721TradableAddress,
      nft_owner_address,
      "mintTo",
      [erc721User, apiUri],
      private_keys[0]
    );

    ZONE1 = {
      zoneIndex: zone1Index,
      price: priceRockCoreTeam,
      coreTeamAddr: coreTeamAddress,
      collAddr: address0,
      typeZone: 1,
      rockIndexFrom: 1,
      rockIndexTo: rocksIdsCoreTeam.length,
    };
    // collection zone
    ZONE2 = {
      zoneIndex: zone2Index,
      price: priceRockByNFTColl,
      coreTeamAddr: address0,
      collAddr: erc721TradableAddress,
      typeZone: 2,
      rockIndexFrom: rocksIdsCoreTeam.length,
      rockIndexTo: rocksIdsNftColl.length,
    };
    // public zone
    ZONE3 = {
      zoneIndex: zone3Index,
      price: priceRockPublic,
      coreTeamAddr: address0,
      collAddr: address0,
      typeZone: 3,
      rockIndexFrom: rocksIdsNftColl.length,
      rockIndexTo: rocksIdsPublic.length,
    };
  });

  describe("* Create Rock NFT erc-1155", function () {
    it("- Test init metaverse with missing fee", async () => {
      const metaverseId = 1;
      const INIT_IMO_FEE = ETH("0.01");
      await parameterControl.setUInt256("INIT_IMO_FEE", INIT_IMO_FEE);
      try {
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          nft_owner_address,
          ETH("10"),
          "initMetaverse",
          [metaverseId.toString(16), ZONE1, ZONE2, ZONE3],
          private_keys[0]
        );
      } catch (e) {
        expect(e.toString()).to.include("I_F");
      }
    });

    it("- Test metaverse for core team", async () => {
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

      const balanceETHOfUserBeforeMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerBefore = await getEthBalance(nft_owner_address);

      // mint core team rock
      for (let i = 0; i < mintRockCoreTeam; i++) {
        let tokenID = BigInt((metaverseId * 10 ** 9 + zone1Index) * 10 ** 9) + rocksIdsCoreTeam[i];
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          coreTeamAddress,
          priceRockCoreTeam, // core team mint with 0 eth
          "mintRock",
          [metaverseId.toString(16), coreTeamAddress, zone1Index, rocksIdsCoreTeam[i], apiUri, "0x0"],
          private_keys[2]
        );
        let balanceRockMinter = await rockNFT.balanceOf(coreTeamAddress, tokenID);
        expect(balanceRockMinter).to.equal(1);
      }

      // mint public rock
      for (let i = 0; i < mintRockPublic; i++) {
        let tokenID = BigInt((metaverseId * 10 ** 9 + zone3Index) * 10 ** 9) + rocksIdsPublic[i];
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          userMint,
          priceRockPublic,
          "mintRock",
          [metaverseId.toString(16), userMint, zone3Index, rocksIdsPublic[i], apiUri, "0x0"],
          private_keys[1]
        );
        let balanceRockMinter = await rockNFT.balanceOf(userMint, tokenID);
        expect(balanceRockMinter).to.equal(1);
      }

      const balanceETHOfUserAfterMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerAfter = await getEthBalance(nft_owner_address);
      expect(balanceETHOfUserAfterMint).to.lessThanOrEqual(
        balanceETHOfUserBeforeMint - convertWeiToEth(priceRockPublic * mintRockPublic)
      );
      expect(balanceETHOfNFTOwnerAfter).to.equal(
        balanceETHOfNFTOwnerBefore + convertWeiToEth(priceRockPublic * mintRockPublic)
      );

      const INIT_FEE = (maxRockByNFTColl + maxRockPublic + maxRockCoreTeam) * INIT_IMO_FEE;
      const balanceOfRockNFTAdress = await getEthBalance(rockNFTAddress);
      expect(balanceOfRockNFTAdress).to.eq(convertWeiToEth(INIT_FEE));
    });

    it("- Test metaverse without init fee puclic rock only", async function () {
      const metaverseId = 1;
      await rockNFT.initMetaverse(metaverseId.toString(16), ZONE1, ZONE2, ZONE3);

      const balanceETHOfUserBeforeMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerBefore = await getEthBalance(nft_owner_address);
      // mint rock public
      for (let i = 0; i < mintRockPublic; i++) {
        let tokenID = BigInt((metaverseId * 10 ** 9 + zone3Index) * 10 ** 9) + rocksIdsPublic[i];
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          userMint,
          ETH("1"),
          "mintRock",
          [metaverseId.toString(16), userMint, zone3Index, rocksIdsPublic[i], apiUri, "0x0"],
          private_keys[1]
        );

        let balanceRockMinter = await rockNFT.balanceOf(userMint, tokenID);
        // console.log(rocksIdsPublic[i], userMint, balanceRockMinter);
        expect(balanceRockMinter).to.equal(1);
      }
      const balanceETHOfUserAfterMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerAfter = await getEthBalance(nft_owner_address);

      expect(balanceETHOfUserAfterMint).to.lessThanOrEqual(
        balanceETHOfUserBeforeMint - convertWeiToEth(priceRockPublic * mintRockPublic)
      );
      expect(balanceETHOfNFTOwnerAfter).to.equal(
        balanceETHOfNFTOwnerBefore + convertWeiToEth(priceRockPublic * mintRockPublic)
      );
    });

    it("- Test metaverse with init fee puclic rock only", async () => {
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

      const balanceETHOfUserBeforeMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerBefore = await getEthBalance(nft_owner_address);

      for (let i = 0; i < mintRockPublic; i++) {
        let tokenID = BigInt((metaverseId * 10 ** 9 + zone3Index) * 10 ** 9) + rocksIdsPublic[i];
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          userMint,
          priceRockPublic,
          "mintRock",
          [metaverseId.toString(16), userMint, zone3Index, rocksIdsPublic[i], apiUri, "0x0"],
          private_keys[1]
        );
        let balanceRockMinter = await rockNFT.balanceOf(userMint, tokenID);
        expect(balanceRockMinter).to.equal(1);
      }

      const balanceETHOfUserAfterMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerAfter = await getEthBalance(nft_owner_address);

      expect(balanceETHOfUserAfterMint).to.lessThanOrEqual(
        balanceETHOfUserBeforeMint - convertWeiToEth(priceRockPublic * mintRockPublic)
      );
      expect(balanceETHOfNFTOwnerAfter).to.equal(
        balanceETHOfNFTOwnerBefore + convertWeiToEth(priceRockPublic * mintRockPublic)
      );

      const INIT_FEE = rocks.length * INIT_IMO_FEE;
      const balanceOfRockNFTAdress = await getEthBalance(rockNFTAddress);
      expect(balanceOfRockNFTAdress).to.eq(convertWeiToEth(INIT_FEE));
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
        [metaverseId.toString(16), ZONE1, ZONE2, ZONE3],
        private_keys[0]
      );

      // mint collection
      for (let i = 0; i < mintRockByNFTColl; i++) {
        const DATA = generateBytes(99);
        let tokenID = BigInt((metaverseId * 10 ** 9 + zone2Index) * 10 ** 9) + rocksIdsNftColl[i];
        try {
          await signAnotherContractThenExcuteFunctionWithValue(
            jsonFile,
            rockNFTAddress,
            erc721User,
            ETH("150"),
            "mintRock",
            [metaverseId.toString(16), erc721User, zone2Index, rocksIdsNftColl[i], apiUri, DATA],
            private_keys[3]
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
        [metaverseId.toString(16), ZONE1, ZONE2, ZONE3],
        private_keys[0]
      );

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
        private_keys[3]
      );
      let balanceRockMinter = await rockNFT.balanceOf(erc721User, tokenID);
      expect(balanceRockMinter).to.equal(1);

      const balanceETHOfUserAfterMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerAfter = await getEthBalance(nft_owner_address);

      expect(balanceETHOfUserAfterMint).to.lessThanOrEqual(balanceETHOfUserBeforeMint);
      expect(balanceETHOfNFTOwnerAfter).to.equal(
        balanceETHOfNFTOwnerBefore + convertWeiToEth(priceRockByNFTColl) - PUR_FEE
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
  });
});
