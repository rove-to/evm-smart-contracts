const MetaverseNFT = artifacts.require("MetaverseNFT");
const ExperienceNFT = artifacts.require("ExperienceNFT");
const RockNFT = artifacts.require("RockNFT");
const TicketNFT = artifacts.require("TicketNFT");
const truffleAssert = require('truffle-assertions');
var Web3 = require('web3');
const web3 = new Web3();


/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("ExperienceNFT", function (accounts) {
  let metaverseNFT;
  let rockNFT;
  let experienceNFT;
  let experienceContractId;

  before("should init instance of contracts", async function () {
    metaverseNFT = await MetaverseNFT.deployed();
    const rockContractId = await metaverseNFT.getRockNFT();
    console.log({rockContractId});
    rockNFT = await RockNFT.at(rockContractId);
    experienceContractId = await rockNFT.getExperienceNFT();
    console.log({experienceContractId});
    experienceNFT = await ExperienceNFT.at(experienceContractId);
  });

  it('should not equal to zero', async () => {
    assert.notEqual(experienceContractId, '0x0000000000000000000000000000000000000000');
  });

  it("should fail cause address has no rove token", async () => {
    await truffleAssert.reverts(experienceNFT.mintExperience(
      10,
      accounts[1],
      web3.utils.toBN(1e18),
      web3.utils.toBN(1e18),
      Math.floor(Date.now() / 1000) + 200,
      Math.floor(Date.now() / 1000) + 500,
      10,
      'Im experience 1', {
    from: accounts[1]
  }))});
});
