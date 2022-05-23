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

        // set zoneIndex
        let zoneIndex: any = 0;
        if (process.argv.length >= 5) {
            zoneIndex = process.argv[5];
        }
        console.log("rockIndex:", zoneIndex);

        // set rockIndex
        let rockIndex: any = 0;
        if (process.argv.length >= 6) {
            rockIndex = process.argv[6];
        }
        console.log("rockIndex:", rockIndex);

        // set rockUri
        let rockUri: string = "";
        if (process.argv.length >= 7) {
            rockUri = process.argv[7];
        }
        console.log("rockUri:", rockUri);

        let nftContract: any;
        nftContract = process.env.ENVIRONMENT_NFT_CONTRACT;
        if (process.argv.length > 8) {
            nftContract = process.argv[8];
        }
        console.log("nftContract:", nftContract);

        const nft = new RockNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const tx = await nft.mintRock(metaverseId, to, nftContract, zoneIndex, rockIndex, rockUri, eth_amount, 0,
            'RockNFT');
        console.log(tx.hash);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();