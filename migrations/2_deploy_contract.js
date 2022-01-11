const Migrations = artifacts.require("Migrations");

// NFTs
const MetaverseNFT = artifacts.require("MetaverseNFT");
const NameNFT = artifacts.require("NameNFT");
// these nft below will be deployed by metaverse contract
const RockNFT = artifacts.require("RockNFT");
const ExperienceNFT = artifacts.require("ExperienceNFT");

// params
const ParameterControl = artifacts.require("ParameterControl");

// token
const Rove = artifacts.require("Rove");

// todo: proxy

// configurations
const adminDefault = "0xD3605808CcdFd0e61515D53a0D2E13c3c9107505";
const ROCK_BREEDING_FEE = '1000000000000000000';
const ROCK_RENTING_FEE = '1000000000000000000';
const ROCK_TIME_COST_UNIT = '3600';
const HOSTING_FEE = '10000';
const GLOBAL_ROVE_DAO = adminDefault;
const GLOBAL_SALES_TAX = '1000';

module.exports = async function(deployer, network, accounts) {
  // todo: update accordingly to the network
  let adminDefault = accounts[0];
  await deployer.deploy(Rove, adminDefault);
  const roveIns = await Rove.deployed();
  await deployer.deploy(NameNFT, adminDefault);
  await deployer.deploy(ParameterControl, adminDefault, ROCK_BREEDING_FEE, ROCK_RENTING_FEE, ROCK_TIME_COST_UNIT, HOSTING_FEE, GLOBAL_ROVE_DAO, GLOBAL_SALES_TAX);
  const parameterControlIns = await ParameterControl.deployed();
  await deployer.deploy(MetaverseNFT, parameterControlIns.address, roveIns.address);
}