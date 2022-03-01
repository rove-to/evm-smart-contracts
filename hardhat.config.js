/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require("dotenv").config();
// require("@nomiclabs/hardhat-ethers");

module.exports = {
    solidity: "0.8.1",
    defaultNetwork: process.env.NETWORK,
    networks: {
        hardhat: {},
        local: {
            url: process.env.LOCAL_API_URL,
            accounts: [`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`],
            // gas: 5000000000,
        },
        rinkeby: {
            url: process.env.RINKEBY_API_URL,
            accounts: [`0x${process.env.PRIVATE_KEY}`],
        },
        ropsten: {
            url: process.env.ROPSTEN_API_URL,
            accounts: [`0x${process.env.PRIVATE_KEY}`],
            gas: 500000,
        },
        mainnet: {
            url: process.env.MAINNET_API_URL,
            accounts: [`0x${process.env.PRIVATE_KEY}`],
        },
        polygon: {
            url: process.env.POLYGON_MAINNET_API_URL,
            accounts: [`0x${process.env.PRIVATE_KEY}`],
        },
        mumbai: {
            url: process.env.POLYGON_MUMBAI_API_URL,
            accounts: [`0x${process.env.PRIVATE_KEY}`],
        }
    },
    mocha: {
        timeout: 4000000
    }
};
