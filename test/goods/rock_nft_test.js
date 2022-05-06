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
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
let nft_owner_address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // default for local

describe("** NFTs erc-1155 contract", function () {
  let rockNFT;
  let rockNFTAddress;
  let parameterControl;
  let parameterControlAddress;
  let adminContract = addresses[0]; // default for local
  let userMint = addresses[1]; // default for local
  const maxRockByNFTColl = 0;
  const priceRockByNFTColl = ETH("0.1");
  const maxRockPublic = 10000;
  const priceRockPublic = ETH("1");
  const mintRockByNFTColl = 100;
  const mintRockPublic = 99;

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
        address0,
        priceRockByNFTColl,
        rocksIdsNftColl.length, // rock by nft coll
        priceRockPublic,
        rocksIdsPublic.length
      ); // rock public

      const balanceETHOfUserBeforeMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerBefore = await getEthBalance(nft_owner_address);
      // mint rock public
      for (let i = maxRockByNFTColl; i < mintRockPublic; i++) {
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          userMint,
          priceRockPublic,
          "mintRock",
          [metaverseId.toString(16), userMint, rocksIdsPublic[i], apiUri, "0x0"],
          private_keys[1]
        );
        let b = await rockNFT.balanceOf(userMint, rocksIdsPublic[i]);
        // console.log(rocksIdsPublic[i], userMint, b);
        expect(b).to.equal(1);

        const uri = await parameterControl.get("ROCK_URI");
        let tokenUri = await rockNFT.uri(rocksIdsPublic[i]);
        // console.log(tokenUri.replace("{id}", rocks[i]));
        expect(tokenUri.replace("{id}", rocks[i])).to.equal(uri.replace("{id}", rocks[i]));
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

    it.only("- Test init metaverse with init fee", async () => {
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
          address0,
          priceRockByNFTColl,
          rocksIdsNftColl.length, // rock by nft coll
          priceRockPublic,
          rocksIdsPublic.length,
        ],
        private_keys[0]
      );

      const balanceETHOfUserBeforeMint = await getEthBalance(userMint);
      const balanceETHOfNFTOwnerBefore = await getEthBalance(nft_owner_address);

      for (let i = maxRockByNFTColl; i < mintRockPublic; i++) {
        await signAnotherContractThenExcuteFunctionWithValue(
          jsonFile,
          rockNFTAddress,
          userMint,
          priceRockPublic,
          "mintRock",
          [metaverseId.toString(16), userMint, rocksIdsPublic[i], apiUri, "0x0"],
          private_keys[1]
        );
        let b = await rockNFT.balanceOf(userMint, rocksIdsPublic[i]);
        // console.log(rocksIdsPublic[i], userMint, b);
        expect(b).to.equal(1);

        const uri = await parameterControl.get("ROCK_URI");
        let tokenUri = await rockNFT.uri(rocksIdsPublic[i]);
        // console.log(tokenUri.replace("{id}", rocks[i]));
        expect(tokenUri.replace("{id}", rocks[i])).to.equal(uri.replace("{id}", rocks[i]));
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
  });
});
