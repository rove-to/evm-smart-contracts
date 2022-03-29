import {EnvironmentNFT} from "./environmentNFT";

const {ethers} = require("hardhat");
(async () => {
    try {
        if (process.env.NETWORK != "localhost") {
            console.log("wrong network");
            return;
        }

        // owner
        let to: any;
        if (process.argv.length >= 2) {
            to = process.argv[2];
        }
        console.log("to:", to);

        let nftContract: any;
        nftContract = process.env.ENVIRONMENT_NFT_CONTRACT;
        if (process.argv.length > 5) {
            nftContract = process.argv[5];
        }
        console.log("nftContract:", nftContract);

        const nft = new EnvironmentNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const tx = await nft.userBurnEnvironmentNFTs(to, nftContract, [], [], 0);
        console.log(tx);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();