var {solidity} = require("ethereum-waffle");
var chai = require('chai');
chai.use(solidity);
const {ethers} = require("hardhat");
const expect = chai.expect;
const {addresses} = require("../constants");
const hardhatConfig = require("../../hardhat.config");
const operator_address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // default for local
function sleep(second) {
    return new Promise((resolve) => {
        setTimeout(resolve, second * 1000);
    });
}

describe("Marketplace contract", function () {
    let roveToken;
    let roveTokenContractAddress;

    let roveMarketplace;
    let roveMarketplaceAddress;

    beforeEach(async function () {
        // deploy rove token
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        let roveTokenContract = await ethers.getContractFactory("RoveToken");
        roveToken = await roveTokenContract.deploy(operator_address);
        roveTokenContractAddress = roveToken.address;
        console.log("Rove token contract address", roveTokenContractAddress);

        let marketContract = await ethers.getContractFactory("RoveMarketPlace");
        roveMarketplace = await marketContract.deploy(operator_address, roveTokenContractAddress);
        roveMarketplaceAddress = roveMarketplace.address;
        console.log("Rove Market place contract address", roveMarketplaceAddress);
    });

    describe("** Deployment Rove Market place", function () {
        it("* Should set the right operator", async function () {
            expect(await roveMarketplace.operator()).to.equal(operator_address);
        });

        it("* Should set the right rove token", async function () {
            expect(await roveMarketplace.roveToken()).to.equal(roveTokenContractAddress);
        });
    });

    describe("** Deployment Rove Market place", function () {
        
    });
});