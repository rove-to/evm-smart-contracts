const MetaverseNFT = artifacts.require("MetaverseNFT");
const Rove = artifacts.require("Rove");
const RockNFT = artifacts.require("RockNFT");
const truffleAssert = require('truffle-assertions');

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("MetaverseNFT", function (accounts) {
  let metaverseNFT;
  let rove;

  before("should init instance of contracts", async function () {
    metaverseNFT = await MetaverseNFT.deployed();
    rove = await Rove.deployed();
  });

  let revenue = [web3.utils.toBN(1e18), web3.utils.toBN(1e18), web3.utils.toBN(1e18)];
  let rentalFees = [web3.utils.toBN(1e18), web3.utils.toBN(1e18)];
  let rockTokenURIs = ['Im rock 1', 'Im rock 2'];
  let metaverURI = 'Im metaverse 1';

  it("should fail", async () => {
    await truffleAssert.reverts(metaverseNFT.mintMetaverse(accounts[0], rentalFees, rockTokenURIs, revenue, metaverURI));
  });
  
  it('should mint the token', async () => {
    await roveToken.mint(accounts[0], web3.utils.toBN(100e18), {from: accounts[0]});
    const value = await roveToken.balanceOf(accounts[0]);
    const totalSupply = await roveToken.totalSupply();

    assert.equal(0, web3.utils.toBN(100e18).cmp(value));
    assert.equal(0, web3.utils.toBN(100e18).cmp(totalSupply));
  });

  it('create new metaverse', async () => {
    await roveToken.approve(metaverseNFT.address, web3.utils.toBN(1000e18), {from: accounts[0]});
    await metaverseNFT.mintMetaverse(accounts[0], accounts[0], [web3.utils.toBN(1e18), web3.utils.toBN(1e18)], ['Im rock 1', 'Im rock 2'], 'Im metaverse 1');

    assert.equal(0, web3.utils.toBN(100e18).cmp(value));
    assert.equal(0, web3.utils.toBN(100e18).cmp(totalSupply));
  });
});
