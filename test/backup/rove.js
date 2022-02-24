// const Rove = artifacts.require("Rove");
// const truffleAssert = require('truffle-assertions');
// var Web3 = require('web3');
// const web3 = new Web3();
//
// /*
//  * uncomment accounts to access the test accounts made available by the
//  * Ethereum client
//  * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
//  */
// contract("Rove", function (accounts) {
//   let roveToken;
//   before("should init instance of contracts", async function () {
//     roveToken = await Rove.deployed();
//   });
//
//   it("should fail cause only minter can mint", async () => {
//     await truffleAssert.reverts(roveToken.mint(accounts[1], web3.utils.toBN(1e18), {
//     from: accounts[1]
//   }))});
//
//   it('should mint the token', async () => {
//     await roveToken.mint(accounts[0], web3.utils.toBN(1e18), {from: accounts[0]});
//     const value = await roveToken.balanceOf(accounts[0]);
//     const totalSupply = await roveToken.totalSupply();
//
//     assert.equal(0, web3.utils.toBN(1e18).cmp(value));
//     assert.equal(0, web3.utils.toBN(1e18).cmp(totalSupply));
//   });
// });
