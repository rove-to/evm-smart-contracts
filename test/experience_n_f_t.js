const MetaverseNFT = artifacts.require("MetaverseNFT");
const ExperienceNFT = artifacts.require("ExperienceNFT");
const RockNFT = artifacts.require("RockNFT");
const TicketNFT = artifacts.require("TicketNFT");
const Rove = artifacts.require("Rove");
const ParameterControl = artifacts.require("ParameterControl");
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
  let roveToken;
  let experienceContractId;
  let revenue = [web3.utils.toBN(1e18), web3.utils.toBN(1e3), web3.utils.toBN(1e3)]; // 1e3 ~ 10%
  let rentalFees = [web3.utils.toBN(1e18), web3.utils.toBN(1e18)];
  let rockTokenURIs = ['Im rock 1', 'Im rock 2'];
  let metaverURI = 'Im metaverse 1';
  let parameterControlIns;

  before("should init instance of contracts", async function () {
    metaverseNFT = await MetaverseNFT.deployed();
    roveToken = await Rove.deployed();
    const rockContractId = await metaverseNFT.getRockNFT();
    console.log({rockContractId});
    rockNFT = await RockNFT.at(rockContractId);
    experienceContractId = await rockNFT.getExperienceNFT();
    console.log({experienceContractId});
    experienceNFT = await ExperienceNFT.at(experienceContractId);
    parameterControlIns = await ParameterControl.deployed();
  });

  it('should not equal to zero', async () => {
    assert.notEqual(experienceContractId, '0x0000000000000000000000000000000000000000');
  });

  it("should fail cause address has no rove token", async () => {
    await truffleAssert.reverts(experienceNFT.mintExperience(
      10,
      web3.utils.toBN(1e18),
      Math.floor(Date.now() / 1000) + 200,
      Math.floor(Date.now() / 1000) + 500,
      10,
      'Im experience 1', {
    from: accounts[1]
  }))});

  it("mint new nft experience", async () => {
    await roveToken.mint(accounts[0], web3.utils.toBN(100e18));
    await roveToken.approve(metaverseNFT.address, web3.utils.toBN('100000000000000000000'));
    await metaverseNFT.mintMetaverse(accounts[0], accounts[0], rentalFees, rockTokenURIs, revenue, metaverURI);
    let roveBeforeEvent = await roveToken.balanceOf(accounts[0]);
    await experienceNFT.mintExperience(
      1,
      web3.utils.toBN(1e18),
      Math.floor(Date.now() / 1000) + 200,
      Math.floor(Date.now() / 1000) + 500,
      10,
      'Im ticket 1',
      'Im experience 1', 
      {from: accounts[0]},
    );
    let roveAfterEvent = await roveToken.balanceOf(accounts[0]);
    assert.equal(0, roveBeforeEvent.cmp(roveAfterEvent));
    await truffleAssert.reverts(experienceNFT.mintExperience(
      1,
      web3.utils.toBN(1e18),
      Math.floor(Date.now() / 1000) + 200,
      Math.floor(Date.now() / 1000) + 500,
      10,
      'Im ticket 1',
      'Im experience 1', 
      {from: accounts[0]}),
    );
  });

  it('user another host to create event', async () => {
    const mintAmount = web3.utils.toBN(100e18);
    await roveToken.mint(accounts[1], mintAmount);
    await roveToken.approve(experienceNFT.address, mintAmount, {from: accounts[1]});
    const approved = await roveToken.allowance(accounts[1], experienceNFT.address);
    console.log('approved ', approved.toString());
    assert.equal(true, approved.toString() === mintAmount.toString());

    await truffleAssert.reverts(experienceNFT.mintExperience(
      1,
      web3.utils.toBN(1e18),
      Math.floor(Date.now() / 1000) + 200,
      Math.floor(Date.now() / 1000) + 500,
      10,
      'Im ticket 2',
      'Im experience 2', 
      {from: accounts[1]}
      )
);
    let roveBeforeEvent = await roveToken.balanceOf(accounts[1]);
    console.log(roveBeforeEvent.toString());

    const start = Math.floor(Date.now() / 1000) + 700;
    const end = Math.floor(Date.now() / 1000) + 900;

    await experienceNFT.mintExperience(
      1,
      web3.utils.toBN(1e18),
      start,
      end,
      10,
      'Im ticket 2',
      'Im experience 2', 
      { from: accounts[1] },
    );
    let roveAfterEvent = await roveToken.balanceOf(accounts[1]);
    console.log(roveAfterEvent.toString());
    assert.equal(1, roveBeforeEvent.cmp(roveAfterEvent));
    const bal = await experienceNFT.balanceOf(accounts[1]);
    assert.equal(1, bal.cmp(0));
  });

});
