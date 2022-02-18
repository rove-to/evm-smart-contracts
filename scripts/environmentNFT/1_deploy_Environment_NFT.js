// ethereum/scripts/deploy.js
const {ethers} = require("hardhat");

async function main(network) {
    let proxyRegistryAddress = "";
    if (network === 'rinkeby') {
        proxyRegistryAddress = "0xf57b2c51ded3a29e6891aba85459d600256cf317";
    } else {
        proxyRegistryAddress = "0xa5409ec958c83c3f309868babaca7c86dcb077c1";
    }

    const EnvironmentNFT = await ethers.getContractFactory("EnvironmentNFT");
    const EnvironmentNFTDeploy = await EnvironmentNFT.deploy(proxyRegistryAddress);

    console.log("Rove EnvironmentNFT deployed:", EnvironmentNFTDeploy.address);
}

main(process.env.NETWORK)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
