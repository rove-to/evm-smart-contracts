// ethereum/scripts/deploy.js
const {ethers} = require("hardhat");

async function main(network) {
    let proxyRegistryAddress = "";
    if (network === 'rinkeby') {
        proxyRegistryAddress = "0xf57b2c51ded3a29e6891aba85459d600256cf317";
    } else {
        proxyRegistryAddress = "0xa5409ec958c83c3f309868babaca7c86dcb077c1";
    }
    
    const ObjectNFT = await ethers.getContractFactory("ObjectNFT");
    const ObjectNFTDeploy = await ObjectNFT.deploy(proxyRegistryAddress);

    console.log("Rove ObjectNFT deployed:", ObjectNFTDeploy.address);
}

main(process.env.NETWORK)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
