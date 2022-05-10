var { solidity } = require("ethereum-waffle");
var chai = require("chai");
chai.use(solidity);
const { ethers } = require("hardhat");
const expect = chai.expect;
const { addresses, private_keys } = require("../constants");
const hardhatConfig = require("../../hardhat.config");
const {
  sleep,
  ETH,
  getEthBalance,
  convertWeiToEth,
  signAnotherContractThenExcuteFunction,
  signAnotherContractThenExcuteFunctionWithValue,
} = require("../common_libs");
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
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

  // collection
  const maxRockByNFTColl = 0;
  const priceRockByNFTColl = ETH("0.1");
  const mintRockByNFTColl = 100;
  // public
  const maxRockPublic = 10000;
  const priceRockPublic = ETH("1");
  const mintRockPublic = 99;
  // core team
  const maxRockCoreTeam = 5000;
  const mintRockCoreTeam = 99;

  const address0 = "0x0000000000000000000000000000000000000000"; // ETH
  const web3 = createAlchemyWeb3(hardhatConfig.networks[hardhatConfig.defaultNetwork].url);

  let apiUri = "https://rove-dev.moshwithme.io/api/v1/rock/{id}/json";
  const jsonFile = "./artifacts/contracts/goods/RockNFT.sol/RockNFT.json";

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
    await parameterControl.set("ROCK_URI", apiUri);

    let RockNFTContract = await ethers.getContractFactory("RockNFT");
    rockNFT = await RockNFTContract.deploy(nft_owner_address, nft_owner_address, parameterControlAddress, "Rock", "R");
    rockNFTAddress = rockNFT.address;

    console.log("RockNFTDeploy address", rockNFT.address);
  });

  describe("* Create Rock NFT erc-1155", function () {
    it("- Test init metaverse without init fee", async function () {
      const metaverseId = 1;
      let rocks = [];
      for (let i = 1; i <= maxRockByNFTColl + maxRockPublic; i++) {
        rocks.push(i.toString(16));
      }

      // rock by nft coll
      let rocksIdsNftColl = [];
      for (let i = 0; i < maxRockByNFTColl; i++) {
        rocksIdsNftColl.push(BigInt("0x" + rocks[i]));
      }
      // public rock
      let rocksIdsPublic = [];
      for (let i = rocksIdsNftColl.length; i < rocks.length; i++) {
        rocksIdsPublic.push(BigInt("0x" + rocks[i]));
      }

      await rockNFT.initMetaverse(
        metaverseId.toString(16),
        address0, // core team
        0, // core team size
        address0, // not erc721 user
        priceRockByNFTColl,
        rocksIdsNftColl.length, // rock by nft coll 0
        priceRockPublic, // public user
        rocksIdsPublic.length
      ); // rock public

      const balanceETHOfUserBeforeMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerBefore = await getEthBalance(nft_owner_address);
      // mint rock public
      for (let i = maxRockByNFTColl; i < mintRockPublic; i++) {
        let tokenID = BigInt(metaverseId * 10 ** 18) + rocksIdsPublic[i];
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          userMint,
          ETH("1"),
          "mintRock",
          [metaverseId.toString(16), userMint, rocksIdsPublic[i], apiUri, "0x0"],
          private_keys[1]
        );

        let balanceRockMinter = await rockNFT.balanceOf(userMint, tokenID);
        // console.log(rocksIdsPublic[i], userMint, balanceRockMinter);
        expect(balanceRockMinter).to.equal(1);

        // const uri = await parameterControl.get("ROCK_URI");
        // let tokenUri = await rockNFT.uri(rocksIdsPublic[i]);
        // console.log(tokenUri.replace("{id}", rocks[i]));
        // expect(tokenUri.replace("{id}", rocks[i])).to.equal(uri.replace("{id}", rocks[i]));
      }
      const balanceETHOfUserAfterMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerAfter = await getEthBalance(nft_owner_address);
      console.log("balance of:", balanceETHOfUserAfterMint, balanceETHOfNFTOwnerAfter);

      expect(balanceETHOfUserAfterMint).to.lessThanOrEqual(
        balanceETHOfUserBeforeMint - convertWeiToEth(priceRockPublic * mintRockPublic)
      );
      expect(balanceETHOfNFTOwnerAfter).to.equal(
        balanceETHOfNFTOwnerBefore + convertWeiToEth(priceRockPublic * mintRockPublic)
      );
    });

    it("- Test init metaverse with init fee", async () => {
      const metaverseId = 1;
      const INIT_IMO_FEE = ETH("0.01");
      await parameterControl.setUInt256("INIT_IMO_FEE", INIT_IMO_FEE);
      let rocks = [];
      for (let i = 1; i <= maxRockByNFTColl + maxRockPublic; i++) {
        rocks.push(i.toString(16));
      }

      // rock by nft coll
      let rocksIdsNftColl = [];
      for (let i = 0; i < maxRockByNFTColl; i++) {
        rocksIdsNftColl.push(BigInt("0x" + rocks[i]));
      }

      // public rock
      let rocksIdsPublic = [];
      for (let i = rocksIdsNftColl.length; i < rocks.length; i++) {
        rocksIdsPublic.push(BigInt("0x" + rocks[i]));
      }
      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        nft_owner_address,
        ETH("100"),
        "initMetaverse",
        [
          metaverseId.toString(16),
          address0, // core team
          0, // core team size
          address0, // not erc721 user
          priceRockByNFTColl,
          rocksIdsNftColl.length, // rock by nft coll 0
          priceRockPublic, // public user
          rocksIdsPublic.length,
        ],
        private_keys[0]
      );

      const balanceETHOfUserBeforeMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerBefore = await getEthBalance(nft_owner_address);

      for (let i = maxRockByNFTColl; i < mintRockPublic; i++) {
        let tokenID = BigInt(metaverseId * 10 ** 18) + rocksIdsPublic[i];
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          userMint,
          priceRockPublic,
          "mintRock",
          [metaverseId.toString(16), userMint, rocksIdsPublic[i], apiUri, "0x0"],
          private_keys[1]
        );
        let balanceRockMinter = await rockNFT.balanceOf(userMint, tokenID);
        expect(balanceRockMinter).to.equal(1);

        // const uri = await parameterControl.get("ROCK_URI");
        // let tokenUri = await rockNFT.uri(rocksIdsPublic[i]);
        // console.log(tokenUri.replace("{id}", rocks[i]));
        // expect(tokenUri.replace("{id}", rocks[i])).to.equal(uri.replace("{id}", rocks[i]));
      }

      const balanceETHOfUserAfterMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerAfter = await getEthBalance(nft_owner_address);

      expect(balanceETHOfUserAfterMint).to.lessThanOrEqual(
        balanceETHOfUserBeforeMint - convertWeiToEth(priceRockPublic * mintRockPublic)
      );
      expect(balanceETHOfNFTOwnerAfter).to.equal(
        balanceETHOfNFTOwnerBefore + convertWeiToEth(priceRockPublic * mintRockPublic)
      );

      const INIT_FEE = (maxRockByNFTColl + maxRockPublic) * INIT_IMO_FEE;
      const balanceOfRockNFTAdress = await getEthBalance(rockNFTAddress);
      expect(balanceOfRockNFTAdress).to.eq(convertWeiToEth(INIT_FEE));
    });

    it("- Test init metaverse for core team with size 0", async () => {
      const metaverseId = 1;
      const INIT_IMO_FEE = ETH("0.01");
      await parameterControl.setUInt256("INIT_IMO_FEE", INIT_IMO_FEE);
      let rocks = [];
      for (let i = 1; i <= maxRockByNFTColl + maxRockPublic; i++) {
        rocks.push(i.toString(16));
      }

      // rock by nft coll
      let rocksIdsNftColl = [];
      for (let i = 0; i < maxRockByNFTColl; i++) {
        rocksIdsNftColl.push(BigInt("0x" + rocks[i]));
      }

      // public rock
      let rocksIdsPublic = [];
      for (let i = rocksIdsNftColl.length; i < rocks.length; i++) {
        rocksIdsPublic.push(BigInt("0x" + rocks[i]));
      }

      try {
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          nft_owner_address,
          ETH("100"),
          "initMetaverse",
          [
            metaverseId.toString(16),
            coreTeamAddress, // core team
            0, // core team size
            address0, // not erc721 user
            priceRockByNFTColl,
            rocksIdsNftColl.length, // rock by nft coll 0
            priceRockPublic, // public user
            rocksIdsPublic.length,
          ],
          private_keys[0]
        );
      } catch (e) {
        expect(e.toString()).to.include("INV_CORE_TEAM");
      }
    });

    it("- Test init metaverse for core team size > 0", async () => {
      const metaverseId = 1;
      const INIT_IMO_FEE = ETH("0.01");
      await parameterControl.setUInt256("INIT_IMO_FEE", INIT_IMO_FEE);
      let rocks = [];
      for (let i = 1; i <= maxRockByNFTColl + maxRockPublic + maxRockCoreTeam; i++) {
        rocks.push(i.toString(16));
      }

      // rock by nft coll
      let rocksIdsNftColl = [];
      for (let i = 0; i < maxRockByNFTColl; i++) {
        rocksIdsNftColl.push(BigInt("0x" + rocks[i]));
      }

      // core team rock
      let rocksIdsCoreTeam = [];
      for (let i = rocksIdsNftColl.length; i < maxRockCoreTeam; i++) {
        rocksIdsCoreTeam.push(BigInt("0x" + rocks[i]));
      }

      // public rock
      let rocksIdsPublic = [];
      for (let i = rocksIdsCoreTeam.length; i < rocks.length; i++) {
        rocksIdsPublic.push(BigInt("0x" + rocks[i]));
      }

      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        nft_owner_address,
        ETH("150"),
        "initMetaverse",
        [
          metaverseId.toString(16),
          coreTeamAddress, // core team
          rocksIdsCoreTeam.length, // core team size
          address0, // not erc721 user
          priceRockByNFTColl,
          rocksIdsNftColl.length, // rock by nft coll 0
          priceRockPublic, // public user
          rocksIdsPublic.length,
        ],
        private_keys[0]
      );

      const balanceETHOfUserBeforeMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerBefore = await getEthBalance(nft_owner_address);

      // mint core team rock
      for (let i = maxRockByNFTColl; i < mintRockCoreTeam; i++) {
        let tokenID = BigInt(metaverseId * 10 ** 18) + rocksIdsCoreTeam[i];
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          coreTeamAddress,
          0, // core team mint with 0 eth
          "mintRock",
          [metaverseId.toString(16), coreTeamAddress, rocksIdsCoreTeam[i], apiUri, "0x0"],
          private_keys[2]
        );
        let balanceRockMinter = await rockNFT.balanceOf(coreTeamAddress, tokenID);
        expect(balanceRockMinter).to.equal(1);
      }

      // mint public rock
      for (let i = maxRockByNFTColl; i < mintRockPublic; i++) {
        let tokenID = BigInt(metaverseId * 10 ** 18) + rocksIdsPublic[i];
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          userMint,
          priceRockPublic,
          "mintRock",
          [metaverseId.toString(16), userMint, rocksIdsPublic[i], apiUri, "0x0"],
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

    it.only("- Test metaverse with erc721 collection", async () => {
      // collection
      const maxRockByNFTColl = 3000;
      const priceRockByNFTColl = ETH("0.1");
      const mintRockByNFTColl = 99;

      // core team
      const maxRockCoreTeam = 1000;
      const mintRockCoreTeam = 99;

      // public
      const maxRockPublic = 6000;
      const priceRockPublic = ETH("1");
      const mintRockPublic = 99;

      const metaverseId = 1;
      const INIT_IMO_FEE = ETH("0.01");
      await parameterControl.setUInt256("INIT_IMO_FEE", INIT_IMO_FEE);
      let rocks = [];
      for (let i = 1; i <= maxRockByNFTColl + maxRockPublic + maxRockCoreTeam; i++) {
        rocks.push(i.toString(16));
      }

      // core team rock
      let rocksIdsCoreTeam = [];
      for (let i = 0; i < maxRockCoreTeam; i++) {
        rocksIdsCoreTeam.push(BigInt("0x" + rocks[i]));
      }

      // rock by nft coll
      let rocksIdsNftColl = [];
      for (let i = rocksIdsCoreTeam.length; i < maxRockByNFTColl; i++) {
        rocksIdsNftColl.push(BigInt("0x" + rocks[i]));
      }

      // public rock
      let rocksIdsPublic = [];
      for (let i = rocksIdsNftColl.length; i < rocks.length; i++) {
        rocksIdsPublic.push(BigInt("0x" + rocks[i]));
      }

      await signAnotherContractThenExcuteFunctionWithValue(
        jsonFile,
        rockNFTAddress,
        nft_owner_address,
        ETH("200"),
        "initMetaverse",
        [
          metaverseId.toString(16),
          coreTeamAddress, // core team
          rocksIdsCoreTeam.length, // core team size
          erc721User, //  erc721 user
          priceRockByNFTColl,
          rocksIdsNftColl.length, // rock by nft coll 0
          priceRockPublic, // public user
          rocksIdsPublic.length,
        ],
        private_keys[0]
      );

      const balanceETHOfUserBeforeMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerBefore = await getEthBalance(nft_owner_address);
      // mint core team rock
      // for (let i = 0; i < mintRockCoreTeam; i++) {
      //   let tokenID = BigInt(metaverseId * 10 ** 18) + rocksIdsCoreTeam[i];
      //   await signAnotherContractThenExcuteFunctionWithValue(
      //     jsonFile,
      //     rockNFTAddress,
      //     coreTeamAddress,
      //     0, // core team mint with 0 eth
      //     "mintRock",
      //     [metaverseId.toString(16), coreTeamAddress, rocksIdsCoreTeam[i], apiUri, "0x0"],
      //     private_keys[2]
      //   );
      //   let balanceRockMinter = await rockNFT.balanceOf(coreTeamAddress, tokenID);
      //   console.log(balanceRockMinter);
      //   expect(balanceRockMinter).to.equal(1);
      // }
      // mint collection
      for (let i = 0; i < mintRockByNFTColl; i++) {
        let tokenID = BigInt(metaverseId * 10 ** 18) + rocksIdsNftColl[i];
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          erc721User,
          ETH("100"), // core team mint with 0 eth
          "mintRock",
          [metaverseId.toString(16), erc721User, rocksIdsNftColl[i], apiUri, "0x0"],
          private_keys[3]
        );
        let balanceRockMinter = await rockNFT.balanceOf(erc721User, tokenID);
        expect(balanceRockMinter).to.equal(1);
      }

      // // mint public rock
      // for (let i = maxRockByNFTColl; i < mintRockPublic; i++) {
      //   let tokenID = BigInt(metaverseId * 10 ** 18) + rocksIdsPublic[i];
      //   await signAnotherContractThenExcuteFunctionWithValue(
      //     jsonFile,
      //     rockNFTAddress,
      //     userMint,
      //     priceRockPublic,
      //     "mintRock",
      //     [metaverseId.toString(16), userMint, rocksIdsPublic[i], apiUri, "0x0"],
      //     private_keys[1]
      //   );
      //   let balanceRockMinter = await rockNFT.balanceOf(userMint, tokenID);
      //   expect(balanceRockMinter).to.equal(1);
      // }

      // const balanceETHOfUserAfterMint = await getEthBalance(userMint);
      // const balanceETHOfNFTOwnerAfter = await getEthBalance(nft_owner_address);

      // expect(balanceETHOfUserAfterMint).to.lessThanOrEqual(
      //   balanceETHOfUserBeforeMint - convertWeiToEth(priceRockPublic * mintRockPublic)
      // );
      // expect(balanceETHOfNFTOwnerAfter).to.equal(
      //   balanceETHOfNFTOwnerBefore + convertWeiToEth(priceRockPublic * mintRockPublic)
      // );

      // const INIT_FEE = (maxRockByNFTColl + maxRockPublic + maxRockCoreTeam) * INIT_IMO_FEE;
      // const balanceOfRockNFTAdress = await getEthBalance(rockNFTAddress);
      // expect(balanceOfRockNFTAdress).to.eq(convertWeiToEth(INIT_FEE));
    });
  });
});
