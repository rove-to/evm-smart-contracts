var {solidity} = require("ethereum-waffle");
var chai = require('chai');
chai.use(solidity);
const {ethers} = require("hardhat");
const expect = chai.expect;
const {addresses} = require("../constants");

const admin_address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

function addSeconds(date, seconds) {
    return new Date(date.getTime() + seconds * 1000);
}

function sleep(second) {
    return new Promise((resolve) => {
        setTimeout(resolve, second * 1000);
    });
}

/*`describe` is a Mocha function that allows you to organize your tests. It's
not actually needed, but having your tests organized makes debugging them
easier. All Mocha functions are available in the global scope.*/

/*`describe` receives the name of a section of your test suite, and a callback.
The callback must define the tests of that section. This callback can't be
an async function.*/
describe("Token contract", function () {
    /*Mocha has four functions that let you hook into the the test runner's
    lifecyle. These are: `before`, `beforeEach`, `after`, `afterEach`.*/

    /*They're very useful to setup the environment for tests, and to clean it
    up after they run.*/

    /*A common pattern is to declare some variables, and assign them in the
    `before` and `beforeEach` callbacks.*/

    let tokenContract;
    let roveToken;
    let owner;
    let addr1;
    let addr2;
    let addr3;
    let addr4;
    let addrs;

    // token time lock contract
    const now = new Date();
    let roveTokenlockTimeAddressArrays = [];
    let roveTokenlockTimeArrays = [];

    const releaseDeltaSeconds = 120;

    /*`beforeEach` will run before each test, re-deploying the contract every
    time. It receives a callback, which can be async.*/
    beforeEach(async function () {
        roveTokenlockTimeAddressArrays = [];
        roveTokenlockTimeArrays = [];
        // Get the ContractFactory and Signers here.
        tokenContract = await ethers.getContractFactory("RoveToken");
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

        /*To deploy our token contract, we just have to call Token.deploy() and await
        for it to be deployed(), which happens once its transaction has been
        mined.*/
        roveToken = await tokenContract.deploy(admin_address);
        console.log("Rove token contract address", roveToken.address);

        /*
        * Deploy our minting schedule
        * */
        for (let i = 1; i <= 4; i++) {
            let roveTokenTimelockContract = await ethers.getContractFactory("RoveTokenTimelock");
            let releaseTimeSecond = Math.floor(addSeconds(now, releaseDeltaSeconds * i).getTime() / 1000);
            let roveTokenTimelock = await roveTokenTimelockContract.deploy(
                roveToken.address,
                addresses,
                releaseTimeSecond,
            );
            console.log("Rove Time lock year %s deployed contract: %s", i, roveTokenTimelock.address, releaseTimeSecond);
            roveTokenlockTimeAddressArrays.push(roveTokenTimelock.address);
            roveTokenlockTimeArrays.push(roveTokenTimelock);
        }
    });

    // You can nest describe calls to create subsections.
    describe("** Deployment Rove Token", function () {
        /*`it` is another Mocha function. This is the one you use to define your
        tests. It receives the test name, and a callback function.*/

        // If the callback function is async, Mocha will `await` it.
        it("* Should set the right owner/admin", async function () {
            // Expect receives a value, and wraps it in an Assertion object. These
            // objects have a lot of utility methods to assert values.

            // This test expects the owner variable stored in the contract to be equal
            // to our Signer's owner.
            // expect(await roveToken.owner()).to.equal(admin_address);

            // This test expects the admin variable stored in the contract to be equal
            // to our admin address.
            expect(await roveToken.admin()).to.equal(admin_address);
        });

        it("* Should assign the total supply of tokens to the admin", async function () {
            const decimals = await roveToken.decimals();
            expect(decimals).to.equal(4);

            const adminBalance = await roveToken.balanceOf(admin_address);
            console.log("adminBalance", adminBalance);
            const totalSupply = await roveToken.totalSupply();
            console.log("totalSupply", totalSupply);
            expect(adminBalance).to.equal(totalSupply);
        });
    });
    describe("** Minting Schedule", function () {
        it("Should send token to 4 token time lock contract address", async function () {
            console.log("--- Minting Schedule on timelock contracts", roveTokenlockTimeAddressArrays);
            await roveToken.schedule_minting(roveTokenlockTimeAddressArrays);

            console.log("--- Check amount of admin address now is 0");
            const adminBalance = await roveToken.balanceOf(admin_address);
            console.log("adminBalance after token lock limit", adminBalance);
            expect(adminBalance).to.equal(0);

            console.log("--- Check amount of 'token time lock' address now is available");
            for (let i = 0; i < 4; i++) {
                await sleep(10);
                let lock = roveTokenlockTimeArrays[i];
                let balance = await lock.current_balance();
                console.log("balance of %s is %s", lock.address, balance);
                expect(balance).to.gt(0);
            }

            console.log("--- Call release for token locktime");
            for (let i = 0; i < 4; i++) {
                let lock = roveTokenlockTimeArrays[i];
                await sleep(releaseDeltaSeconds + 5);
                await lock.release();
                console.log("release for %s", lock.address);
            }

            console.log("--- Check balance of all address after release time");
            // var BigNumber = require('big-number');
            // let totalBalance = new BigNumber(0);
            for (let i = 0; i < addresses.length; i++) {
                let addr = addresses[i];
                let balance = await roveToken.balanceOf(addr);
                console.log("balance of %s is %s", addr, balance);
                // totalBalance = totalBalance.add(balance);
                // console.log("totalBalance: ", totalBalance);
            }
            // console.log("all address has total balance is %s", totalBalance);
            const totalSupply = await roveToken.totalSupply();
            console.log("totalSupply", totalSupply);
            // expect(totalBalance).to.equal(totalSupply);
        });
    });
    /*describe("Transactions", function () {
        it("Should transfer tokens between accounts", async function () {
            // Transfer 50 tokens from owner to addr1
            await roveToken.transfer(addr1.address, 50);
            const addr1Balance = await roveToken.balanceOf(addr1.address);
            expect(addr1Balance).to.equal(50);

            // Transfer 50 tokens from addr1 to addr2
            // We use .connect(signer) to send a transaction from another account
            await roveToken.connect(addr1).transfer(addr2.address, 50);
            const addr2Balance = await roveToken.balanceOf(addr2.address);
            expect(addr2Balance).to.equal(50);
        });

        it("Should fail if sender doesn’t have enough tokens", async function () {
            const initialOwnerBalance = await roveToken.balanceOf(owner.address);

            // Try to send 1 token from addr1 (0 tokens) to owner (1000000 tokens).
            // `require` will evaluate false and revert the transaction.
            await expect(
                roveToken.connect(addr1).transfer(owner.address, 1)
            ).to.be.revertedWith("Not enough tokens");

            // Owner balance shouldn't have changed.
            expect(await roveToken.balanceOf(owner.address)).to.equal(
                initialOwnerBalance
            );
        });

        it("Should update balances after transfers", async function () {
            const initialOwnerBalance = await roveToken.balanceOf(owner.address);

            // Transfer 100 tokens from owner to addr1.
            await roveToken.transfer(addr1.address, 100);

            // Transfer another 50 tokens from owner to addr2.
            await roveToken.transfer(addr2.address, 50);

            // Check balances.
            const finalOwnerBalance = await roveToken.balanceOf(owner.address);
            expect(finalOwnerBalance).to.equal(initialOwnerBalance.sub(150));

            const addr1Balance = await roveToken.balanceOf(addr1.address);
            expect(addr1Balance).to.equal(100);

            const addr2Balance = await roveToken.balanceOf(addr2.address);
            expect(addr2Balance).to.equal(50);
        });
    });*/
});