import {RockNFT} from "./rockNFT";

const {ethers} = require("hardhat");
(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }

        let metaverseId: any;
        if (process.argv.length >= 2) {
            metaverseId = process.argv[2];
        }
        console.log("metaverseId:", metaverseId);

        // set init owner
        let to: any;
        if (process.argv.length >= 3) {
            to = process.argv[3];
        }
        console.log("to:", to);

        let eth_amount: any;
        if (process.argv.length >= 4) {
            eth_amount = process.argv[4]
        }
        console.log("eth_amount:", eth_amount);

        // set rockIdHexa
        let rockIdHexa: string = "";
        if (process.argv.length >= 5) {
            rockIdHexa = process.argv[5];
        }
        console.log("rockIdHexa:", rockIdHexa);

        // set rockUri
        let rockUri: string = "";
        if (process.argv.length >= 6) {
            rockUri = process.argv[6];
        }
        console.log("rockUri:", rockUri);

        let nftContract: any;
        nftContract = process.env.ENVIRONMENT_NFT_CONTRACT;
        if (process.argv.length > 7) {
            nftContract = process.argv[7];
        }
        console.log("nftContract:", nftContract);

        const nft = new RockNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const tx = await nft.mintRock(metaverseId, to, nftContract, rockIdHexa, rockUri, eth_amount, 0);
        console.log(tx);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();