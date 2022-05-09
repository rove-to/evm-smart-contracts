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

        let coreTeamCollSize = 0;
        if (process.argv.length >= 3) {
            coreTeamCollSize = parseInt(process.argv[3]);
        }
        console.log("nftCollSize:", coreTeamCollSize);

        // set erc721
        let erc721: any;
        if (process.argv.length >= 4) {
            erc721 = process.argv[4];
        }
        console.log("erc721:", erc721);

        let priceNftColl: any = 0;
        if (process.argv.length >= 5) {
            priceNftColl = process.argv[5];
        }
        console.log("priceNftColl:", priceNftColl);

        let nftCollSize = 0;
        if (process.argv.length >= 6) {
            nftCollSize = parseInt(process.argv[6]);
        }
        console.log("nftCollSize:", nftCollSize);

        let pricePublic: any = 0;
        if (process.argv.length >= 7) {
            pricePublic = process.argv[7];
        }
        console.log("pricePublic:", pricePublic);

        let sizePublic = 0;
        if (process.argv.length >= 8) {
            sizePublic = parseInt(process.argv[8]);
        }
        console.log("publicSize:", sizePublic);

        let eth_amount: any = "0.0";
        if (process.argv.length >= 9) {
            eth_amount = process.argv[9]
        }
        console.log("eth_amount:", eth_amount);

        let nftContract: any;
        nftContract = process.env.ENVIRONMENT_NFT_CONTRACT;
        if (process.argv.length > 10) {
            nftContract = process.argv[10];
        }
        console.log("nftContract:", nftContract);

        const nft = new RockNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const tx = await nft.initMetaverse(nftContract, metaverseId, coreTeamCollSize, erc721, priceNftColl, nftCollSize, pricePublic, sizePublic, eth_amount, 0);
        console.log("tx hash:", tx.transactionHash);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();