/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require("dotenv").config();
require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: "0.8.1",
  defaultNetwork: "rinkeby",
  networks: {
    hardhat: {},
    rinkeby: {
      url: process.env.RINKEBY_API_URL,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
    ropsten: {
      url: process.env.ROPSTEN_API_URL,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
    mainnet: {
      url: process.env.MAINNET_API_URL,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
  },
};
