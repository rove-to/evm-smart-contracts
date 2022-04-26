var {solidity} = require("ethereum-waffle");
var chai = require('chai');
chai.use(solidity);
const {ethers} = require("hardhat");
const expect = chai.expect;
const {addresses} = require("../constants");
const hardhatConfig = require("../../hardhat.config");
let nft_owner_address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // default for local

describe.only("** NFTs erc-1155 contract", function () {
    let rockNFT;
    let rockNFTAddress;
    let parameterControl;
    let parameterControlAddress;
    let adminContract = addresses[0]; // default for local
    let initTokens = 1;
    
    let apiUri = "https://api.rove.to/api/v1/rock/";

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
        it("- Check balance is 1 for each of tokenId", async function () {
            let tokenUris = ['62624b0a01c2ee182dbc2f4c', '625d237cf8a81aa62257d4c1', '625d22b6f8a81aa62257d430'];
            let tokensIds = []
            tokenUris.forEach((v, i) => {
                tokensIds.push(BigInt(parseInt(v, 16)));
            });
            await rockNFT.createNFT(adminContract, initTokens, tokensIds, tokenUris, ethers.utils.parseEther("0.1"));

            for (let i = 0; i < initTokens; i++) {
                let b = await rockNFT.balanceOf(adminContract, tokensIds[i]);
                console.log(adminContract, b);
                expect(b).to.equal(1);
            }

            for (let i = 0; i < tokensIds.length; i++) {
                const uri = await parameterControl.get("ROCK_URI");
                let b = await rockNFT.uri(tokensIds[i]);
                console.log(tokensIds[i], tokenUris[i], b);
                expect(b).to.equal(uri + tokenUris[i] + "/json");
            }
        });

        it("- Call userMint", async function () {
            let tokenUris = ['62624b0a01c2ee182dbc2f4c', '625d237cf8a81aa62257d4c1', '625d22b6f8a81aa62257d430'];
            let tokensIds = []
            tokenUris.forEach((v, i) => {
                tokensIds.push(BigInt(parseInt(v, 16)));
            });
            console.log("Token Ids", tokensIds);
            await rockNFT.createNFT(adminContract, initTokens, tokensIds, tokenUris, ethers.utils.parseEther("0.0"));
            console.log("User mint", tokensIds[initTokens]);

            for (let i = initTokens; i < tokensIds.length; i++) {
                await rockNFT.userMint(adminContract, tokensIds[i], 1, "0x");

                let b = await rockNFT.balanceOf(adminContract, tokensIds[i]);
                console.log(tokensIds[i], adminContract, b);
                expect(b).to.equal(1);
            }
        });
    });
    describe("* Transactions", function () {

    });
});