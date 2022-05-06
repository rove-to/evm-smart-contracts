import {RockNFT} from "./rockNFT";

const {ethers} = require("hardhat");

(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }

        // set metaverdse id
        let metaverseId: any;
        if (process.argv.length >= 2) {
            metaverseId = process.argv[2];
        }
        console.log("metaverseId:", metaverseId);

        let pricePublic: any = 0;
        if (process.argv.length >= 3) {
            pricePublic = process.argv[3];
        }
        console.log("pricePublic:", pricePublic);

        let sizePublic = 0;
        if (process.argv.length >= 4) {
            sizePublic = parseInt(process.argv[4]);
        }
        console.log("publicSize:", sizePublic);

        let eth_amount: any = "0.0";
        if (process.argv.length >= 5) {
            eth_amount = process.argv[5]
        }
        console.log("eth_amount:", eth_amount);

        let nftContract: any;
        nftContract = process.env.ENVIRONMENT_NFT_CONTRACT;
        if (process.argv.length > 6) {
            nftContract = process.argv[6];
        }
        console.log("nftContract:", nftContract);

        const nft = new RockNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const tx = await nft.initMetaverse(nftContract, metaverseId, pricePublic, sizePublic, eth_amount, 0);
        console.log("tx hash:", tx.transactionHash);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();