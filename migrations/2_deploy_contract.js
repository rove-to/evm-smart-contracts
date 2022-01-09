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
const METAVERSE_MINTING_FEE = '1000000000000000000';

module.exports = async function(deployer) {
  await deployer.deploy(Rove, adminDefault);
  const roveIns = await Rove.deployed();
  await deployer.deploy(NameNFT, adminDefault);
  await deployer.deploy(ParameterControl, adminDefault, ROCK_BREEDING_FEE, METAVERSE_MINTING_FEE);
  const parameterControlIns = await ParameterControl.deployed();
  await deployer.deploy(MetaverseNFT, parameterControlIns.address, roveIns.address);
}