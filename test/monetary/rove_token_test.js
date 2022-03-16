var { solidity } = require("ethereum-waffle");
var chai = require("chai");
chai.use(solidity);
const { ethers } = require("hardhat");
const expect = chai.expect;
const { addresses, private_keys } = require("../constants");
const { signAnotherContractThenExcuteFunction } = require("../common_libs");
const admin_address = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

function addSeconds(date, seconds) {
  return new Date(date.getTime() + seconds * 1000);
}

function sleep(second) {
  return new Promise(resolve => {
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
      let roveTokenTimelockContract = await ethers.getContractFactory(
        "RoveTokenTimelock"
      );
      let releaseTimeSecond = Math.floor(
        addSeconds(now, releaseDeltaSeconds * i).getTime() / 1000
      );
      let roveTokenTimelock = await roveTokenTimelockContract.deploy(
        roveToken.address,
        addresses,
        releaseTimeSecond
      );
      console.log(
        "Rove Time lock year %s deployed contract: %s",
        i,
        roveTokenTimelock.address,
        releaseTimeSecond
      );
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
      const _admin = await roveToken.admin();
      expect(_admin.toUpperCase()).to.equal(admin_address.toUpperCase());
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
      console.log(
        "--- Minting Schedule on timelock contracts",
        roveTokenlockTimeAddressArrays
      );
      await roveToken.schedule_minting(roveTokenlockTimeAddressArrays);

      console.log("--- Check amount of admin address now is 0");
      const adminBalance = await roveToken.balanceOf(admin_address);
      console.log("adminBalance after token lock limit", adminBalance);
      expect(adminBalance).to.equal(0);

      console.log(
        "--- Check amount of 'token time lock' address now is available"
      );
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

  it("-- Test schedule minting with total supply is 0", async () => {
    console.log(
      "--- Minting Schedule on timelock contracts",
      roveTokenlockTimeAddressArrays
    );
    await roveToken.schedule_minting(roveTokenlockTimeAddressArrays);

    console.log("--- Check amount of admin address now is 0");
    const adminBalance = await roveToken.balanceOf(admin_address);
    console.log("adminBalance after token lock limit", adminBalance);
    expect(adminBalance).to.equal(0);

    console.log("--- Schedule minting with amount is 0");
    try {
      await roveToken.schedule_minting(roveTokenlockTimeAddressArrays);
    } catch (error) {
      expect(error.toString()).to.include("transfer amount exceeds balance");
    }
  });

  it("-- Test mint to admin after schedule minting", async () => {
    const newAmount = 5000;
    console.log(
      "--- Minting Schedule on timelock contracts",
      roveTokenlockTimeAddressArrays
    );
    await roveToken.schedule_minting(roveTokenlockTimeAddressArrays);

    console.log("--- Check amount of admin address now is 0");
    const adminBalance = await roveToken.balanceOf(admin_address);
    console.log("adminBalance after token lock limit", adminBalance);
    expect(adminBalance).to.equal(0);

    console.log("--- Minting new amount to admin");
    await roveToken.mint(admin_address, newAmount);
    const adminBalance1 = await roveToken.balanceOf(admin_address);
    console.log("adminBalance after mint new amount", adminBalance1);
    expect(adminBalance1).to.equal(newAmount);
  });

  it("-- Test mint to admin before schedule minting", async () => {
    const newAmount = 50000000;
    console.log("--- Minting new amount to admin");
    await roveToken.mint(admin_address, newAmount);
    const adminBalance1 = await roveToken.balanceOf(admin_address);
    console.log("adminBalance befire schedule mint", adminBalance1);
    // expect(adminBalance1).to.equal(newAmount);
    console.log(
      "--- Minting Schedule on timelock contracts",
      roveTokenlockTimeAddressArrays
    );
    try {
      await roveToken.schedule_minting(roveTokenlockTimeAddressArrays);
    } catch (error) {
      expect(error.toString()).to.include(
        "RoveToken: schedule minting first_year 400000000 is invalid"
      );
    }
  });

  it("-- Test mint without admin role", async () => {
    const newAmount = 50000000;
    console.log("--- Minting new amount to admin");
    try {
      await signAnotherContractThenExcuteFunction(
        "./artifacts/contracts/monetary/RoveToken.sol/RoveToken.json",
        roveToken.address,
        addresses[1],
        "mint",
        [admin_address, newAmount],
        private_keys[1]
      );
    } catch (error) {
      expect(error.toString()).to.include("Caller is not a admin");
    }
  });

  it("-- Test community transfer direct to member after release first times", async () => {
    const menberContract = "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199";
    const transferAmount = 1;
    console.log(
      "--- Minting Schedule on timelock contracts",
      roveTokenlockTimeAddressArrays
    );
    await roveToken.schedule_minting(roveTokenlockTimeAddressArrays);

    console.log("--- Check amount of admin address now is 0");
    const adminBalance = await roveToken.balanceOf(admin_address);
    console.log("adminBalance after token lock limit", adminBalance);
    expect(adminBalance).to.equal(0);

    console.log(
      "--- Check amount of 'token time lock' address now is available"
    );
    for (let i = 0; i < 4; i++) {
      await sleep(10);
      let lock = roveTokenlockTimeArrays[i];
      let balance = await lock.current_balance();
      console.log("balance of %s is %s", lock.address, balance);
      expect(balance).to.gt(0);
    }

    console.log("--- Call release for token locktime");
    let lock = roveTokenlockTimeArrays[0];
    await sleep(releaseDeltaSeconds + 5);
    await lock.release();
    console.log("release for %s", lock.address);
    console.log("--- Check balance of all address after release firsttime");
    // community:  2600000000000
    // team:  800000000000
    // sales:  400000000000
    // liquidity:  200000000000
    for (let i = 0; i < addresses.length; i++) {
      let addr = addresses[i];
      let balance = await roveToken.balanceOf(addr);
      console.log("balance of %s is %s", addr, balance);
    }
    // transfer direct from community to member
    let communityBalanceBeforeTransfer = await roveToken.balanceOf(
      addresses[0]
    );
    console.log(
      "Community balance before transfer: ",
      communityBalanceBeforeTransfer
    );
    await roveToken.transfer(menberContract, transferAmount);
    let memberBalance = await roveToken.balanceOf(menberContract);
    let communityBalanceAfterTransfer = await roveToken.balanceOf(addresses[0]);
    console.log("Member balance after transfer: ", memberBalance);
    console.log(
      "Community balance after transfer: ",
      communityBalanceAfterTransfer
    );
    expect(memberBalance).to.equal(transferAmount);
    expect(communityBalanceBeforeTransfer).to.equal(
      communityBalanceAfterTransfer.add(memberBalance)
    );
  });

  it("-- Test team transfer to member", async () => {
    const menberContract = "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199";
    const transferAmount = 1;
    console.log(
      "--- Minting Schedule on timelock contracts",
      roveTokenlockTimeAddressArrays
    );
    await roveToken.schedule_minting(roveTokenlockTimeAddressArrays);

    console.log("--- Check amount of admin address now is 0");
    const adminBalance = await roveToken.balanceOf(admin_address);
    console.log("adminBalance after token lock limit", adminBalance);
    expect(adminBalance).to.equal(0);

    console.log(
      "--- Check amount of 'token time lock' address now is available"
    );
    for (let i = 0; i < 4; i++) {
      await sleep(10);
      let lock = roveTokenlockTimeArrays[i];
      let balance = await lock.current_balance();
      console.log("balance of %s is %s", lock.address, balance);
      expect(balance).to.gt(0);
    }

    console.log("--- Call release for token locktime");
    let lock = roveTokenlockTimeArrays[0];
    await sleep(releaseDeltaSeconds + 5);
    await lock.release();
    console.log("release for %s", lock.address);
    console.log("--- Check balance of all address after release firsttime");
    // community:  2600000000000
    // team:  800000000000
    // sales:  400000000000
    // liquidity:  200000000000
    for (let i = 0; i < addresses.length; i++) {
      let addr = addresses[i];
      let balance = await roveToken.balanceOf(addr);
      console.log("balance of %s is %s", addr, balance);
    }
    // transfer direct from team to member
    let teamBalanceBeforeTransfer = await roveToken.balanceOf(addresses[1]);
    console.log(
      "Community balance before transfer: ",
      teamBalanceBeforeTransfer
    );
    await signAnotherContractThenExcuteFunction(
      "./artifacts/contracts/monetary/RoveToken.sol/RoveToken.json",
      roveToken.address,
      addresses[1],
      "transfer",
      [menberContract, transferAmount],
      private_keys[1]
    );

    let memberBalance = await roveToken.balanceOf(menberContract);
    let teamBalanceAfterTransfer = await roveToken.balanceOf(addresses[1]);
    console.log("Member balance after transfer: ", memberBalance);
    console.log("Team balance after transfer: ", teamBalanceAfterTransfer);
    expect(memberBalance).to.equal(transferAmount);
    expect(teamBalanceBeforeTransfer).to.equal(
      teamBalanceAfterTransfer.add(memberBalance)
    );
  });

  it("-- Test community transfer by approval to member after release first times", async () => {
    const menberContract = "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199";
    const transferAmount = 1;
    console.log(
      "--- Minting Schedule on timelock contracts",
      roveTokenlockTimeAddressArrays
    );
    await roveToken.schedule_minting(roveTokenlockTimeAddressArrays);

    console.log("--- Check amount of admin address now is 0");
    const adminBalance = await roveToken.balanceOf(admin_address);
    console.log("adminBalance after token lock limit", adminBalance);
    expect(adminBalance).to.equal(0);

    console.log(
      "--- Check amount of 'token time lock' address now is available"
    );
    for (let i = 0; i < 4; i++) {
      await sleep(10);
      let lock = roveTokenlockTimeArrays[i];
      let balance = await lock.current_balance();
      console.log("balance of %s is %s", lock.address, balance);
      expect(balance).to.gt(0);
    }

    console.log("--- Call release for token locktime");
    let lock = roveTokenlockTimeArrays[0];
    await sleep(releaseDeltaSeconds + 5);
    await lock.release();
    console.log("release for %s", lock.address);
    console.log("--- Check balance of all address after release firsttime");
    // community:  2600000000000
    // team:  800000000000
    // sales:  400000000000
    // liquidity:  200000000000
    for (let i = 0; i < addresses.length; i++) {
      let addr = addresses[i];
      let balance = await roveToken.balanceOf(addr);
      console.log("balance of %s is %s", addr, balance);
    }
    let communityBalanceBeforeTransfer = await roveToken.balanceOf(
      addresses[0]
    );
    console.log(
      "Community balance before transfer: ",
      communityBalanceBeforeTransfer
    );
    // community transfer to team member by approval
    await roveToken.approve(addresses[1], transferAmount);
    await signAnotherContractThenExcuteFunction(
      "./artifacts/contracts/monetary/RoveToken.sol/RoveToken.json",
      roveToken.address,
      addresses[1],
      "transferFrom",
      [addresses[0], menberContract, transferAmount],
      private_keys[1]
    );

    let memberBalance = await roveToken.balanceOf(menberContract);
    let communityBalanceAfterTransfer = await roveToken.balanceOf(addresses[0]);
    console.log("Member balance after transfer: ", memberBalance);
    console.log(
      "Community balance after transfer: ",
      communityBalanceAfterTransfer
    );
    expect(memberBalance).to.equal(transferAmount);
    expect(communityBalanceBeforeTransfer).to.equal(
      communityBalanceAfterTransfer.add(memberBalance)
    );
  });

  it("-- Test release at current time before release time", async () => {
    console.log(
      "--- Minting Schedule on timelock contracts",
      roveTokenlockTimeAddressArrays
    );
    await roveToken.schedule_minting(roveTokenlockTimeAddressArrays);

    console.log("--- Check amount of admin address now is 0");
    const adminBalance = await roveToken.balanceOf(admin_address);
    console.log("adminBalance after token lock limit", adminBalance);
    expect(adminBalance).to.equal(0);

    console.log(
      "--- Check amount of 'token time lock' address now is available"
    );
    for (let i = 0; i < 4; i++) {
      await sleep(10);
      let lock = roveTokenlockTimeArrays[i];
      let balance = await lock.current_balance();
      console.log("balance of %s is %s", lock.address, balance);
      expect(balance).to.gt(0);
    }

    console.log("--- Call release for token locktime before release time");
    let lock = roveTokenlockTimeArrays[0];
    try {
      await lock.release();
    } catch (error) {
      expect(error.toString()).to.include(
        "TokenTimelock: current time is before release time"
      );
    }
  });

  it("-- Test old admin schedule minting", async () => {
    console.log(
      "--- Minting Schedule on timelock contracts",
      roveTokenlockTimeAddressArrays
    );
    // change admin
    await roveToken.changeAdmin(newAdminContract);
    const newAdmin = await roveToken.admin();
    console.log("New admin: ", newAdmin);
    try {
      await roveToken.schedule_minting(roveTokenlockTimeAddressArrays);
    } catch (error) {
      expect(error.toString()).to.include("Caller is not admin");
    }
  });

  it("-- Test New admin own 0 token schedule minting", async () => {
    const newAdminContract = "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199";
    const newAdminContractPrivateKey =
      "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";

    console.log(
      "--- Minting Schedule on timelock contracts",
      roveTokenlockTimeAddressArrays
    );
    // change admin
    await roveToken.changeAdmin(newAdminContract);
    const newAdmin = await roveToken.admin();
    console.log("New admin: ", newAdmin);
    // new admin schedule minting
    try {
      await signAnotherContractThenExcuteFunction(
        "./artifacts/contracts/monetary/RoveToken.sol/RoveToken.json",
        roveToken.address,
        newAdminContract,
        "schedule_minting",
        [roveTokenlockTimeAddressArrays],
        newAdminContractPrivateKey
      );
    } catch (error) {
      expect(error.toString()).to.include(
        "ERC20: transfer amount exceeds balance"
      );
    }
  });

  it("-- Test transfer token to new admin then schedule minting", async () => {
    const newAdminContract = "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199";
    const newAdminContractPrivateKey =
      "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";
    const totalSupply = await roveToken.totalSupply();
    console.log("balance totalSupply: ", totalSupply);

    console.log(
      "--- Minting Schedule on timelock contracts",
      roveTokenlockTimeAddressArrays
    );
    // change admin
    await roveToken.changeAdmin(newAdminContract);
    const newAdmin = await roveToken.admin();
    console.log("New admin: ", newAdmin);
    expect(newAdmin.toLowerCase()).to.equal(newAdminContract.toLowerCase());
    // old admin transfers token to new admin
    await roveToken.transfer(newAdmin, totalSupply);
    const balanceOfNewAdmin = await roveToken.balanceOf(newAdmin);
    console.log("balance Of New Admin: ", balanceOfNewAdmin);
    expect(balanceOfNewAdmin).to.equal(totalSupply);
    // new admin schedule minting
    await signAnotherContractThenExcuteFunction(
      "./artifacts/contracts/monetary/RoveToken.sol/RoveToken.json",
      roveToken.address,
      newAdminContract,
      "schedule_minting",
      [roveTokenlockTimeAddressArrays],
      newAdminContractPrivateKey
    );
    console.log("--- Call release for token locktime");
    for (let i = 0; i < 4; i++) {
      await sleep(10);
      let lock = roveTokenlockTimeArrays[i];
      let balance = await lock.current_balance();
      console.log("balance of %s is %s", lock.address, balance);
      expect(balance).to.gt(0);
    }
  });
});
