var {solidity} = require("ethereum-waffle");
var chai = require('chai');
chai.use(solidity);
const {ethers} = require("hardhat");
const expect = chai.expect;
const {addresses} = require("../constants");
const hardhatConfig = require("../../hardhat.config");

function sleep(second) {
    return new Promise((resolve) => {
        setTimeout(resolve, second * 1000);
    });
}

describe("** NFTs erc-1155 contract", function () {
    let parameterControl;
    let admin_contract = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // default for local

    beforeEach(async function () {
        console.log("Hardhat network", hardhatConfig.defaultNetwork);
        let ParameterControlContract = await ethers.getContractFactory("ParameterControl");
        parameterControl = await ParameterControlContract.deploy(admin_contract);
        console.log("ParameterControl deploy address", parameterControl.address);
    });

    describe("* Check admin ", function () {
        it("- Check admin", async function () {
            let admin = await parameterControl.admin();
            console.log("expect admin: ", admin_contract);
            console.log("contract admin: ", admin);
            expect(admin).to.equal(admin_contract);
        });

        it("- Change admin", async function () {
            const changedAdmin = process.env.PUBLIC_KEY;
            await parameterControl.updateAdmin(changedAdmin);
            await sleep(10);
            console.log("expect admin: ", changedAdmin);
            let admin = await parameterControl.admin();
            console.log("contract admin: ", admin);
            expect(admin).to.equal(changedAdmin);
        });
    });

    describe("* Get/Set with admin ", function () {
        it("- Get ", async function () {
            const temp = {
                "key": 'NFT_MINTER_PERCENT_PROFIT',
                "value": "10"
            };
            await parameterControl.set(temp.key, temp.value);
            await sleep(10);
            let value = await parameterControl.get(temp.key);
            expect(value).to.equal(temp.value);
        });
    });
});