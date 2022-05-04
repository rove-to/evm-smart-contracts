var {solidity} = require("ethereum-waffle");
var chai = require('chai');
chai.use(solidity);
const {ethers} = require("hardhat");
const expect = chai.expect;
const {addresses, private_keys} = require("../constants");
const hardhatConfig = require("../../hardhat.config");
const {signAnotherContractThenExcuteFunctionWithValue} = require("../common_libs");
const {createAlchemyWeb3} = require("@alch/alchemy-web3");
let nft_owner_address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // default for local

describe("** NFTs erc-1155 contract", function () {
    let rockNFT;
    let rockNFTAddress;
    let parameterControl;
    let parameterControlAddress;
    let adminContract = addresses[0]; // default for local
    let userMint = addresses[1]; // default for local
    const maxRockByNFTColl = 0;
    const priceRockByNFTColl = 0.001;
    const maxRockPublic = 10000;
    const priceRockPublic = 0.01;
    const mintRockByNFTColl = 100;
    const mintRockPublic = 999;

    const address0 = "0x0000000000000000000000000000000000000000"; // ETH
    const web3 = createAlchemyWeb3(hardhatConfig.networks[hardhatConfig.defaultNetwork].url);

    let apiUri = "https://rove-dev.moshwithme.io/api/v1/rock/{id}/json";

    beforeEach(async function () {
        console.log("Hardhat network", hardhatConfig.defaultNetwork)

        if (hardhatConfig.defaultNetwork !== 'local') {
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
        it.only("- Check init metaverse", async function () {
            const metaverseId = 1;
            let rocks = [];
            for (let i = 1; i <= maxRockByNFTColl + maxRockPublic; i++) {
                rocks.push(i.toString(16));
            }

            // rock by nft coll
            let rocksIdsNftColl = []
            for (let i = 0; i < maxRockByNFTColl; i++) {
                rocksIdsNftColl.push(BigInt(parseInt(rocks[i], 16)));
            }

            // public rock
            let rocksIdsPublic = []
            for (let i = rocksIdsNftColl.length; i < rocks.length; i++) {
                rocksIdsPublic.push(BigInt(parseInt(rocks[i], 16)));
            }
            await rockNFT.initMetaverse(metaverseId.toString(16),
                address0, ethers.utils.parseEther(priceRockByNFTColl.toString()), rocksIdsNftColl.length, // rock by nft coll
                ethers.utils.parseEther(priceRockPublic.toString()), rocksIdsPublic.length); // rock public


            // mint rock public
            for (let i = maxRockByNFTColl; i < mintRockPublic; i++) {
                const jsonFile = "./artifacts/contracts/goods/RockNFT.sol/RockNFT.json";
                await signAnotherContractThenExcuteFunctionWithValue(
                    jsonFile,
                    rockNFTAddress,
                    userMint,
                    ethers.utils.parseEther(priceRockPublic.toString()),
                    "mintRock",
                    [metaverseId.toString(16), userMint, rocksIdsPublic[i], "0x0"],
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
            let temp = await web3.eth.getBalance(rockNFTAddress);
            console.log("----", ethers.utils.formatEther(temp));
            expect(temp).to.equal(ethers.utils.parseEther((priceRockPublic * mintRockPublic).toString()));
        });
    });
    describe("* Transactions", function () {

    });
});
99900000000000000000
9990000000000000000