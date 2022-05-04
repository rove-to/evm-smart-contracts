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

        // set erc721
        let erc721: any;
        if (process.argv.length >= 3) {
            erc721 = process.argv[3];
        }
        console.log("erc721:", erc721);

        let priceNftColl: any;
        if (process.argv.length >= 4) {
            priceNftColl = process.argv[4];
        }
        console.log("priceNftColl:", priceNftColl);

        let nftCollSize: any;
        if (process.argv.length >= 5) {
            nftCollSize = process.argv[5];
        }
        console.log("nftCollSize:", nftCollSize);

        let pricePublic: any;
        if (process.argv.length >= 6) {
            pricePublic = process.argv[6];
        }
        console.log("pricePublic:", pricePublic);

        let sizePublic: any;
        if (process.argv.length >= 7) {
            sizePublic = process.argv[7];
        }
        console.log("publicSize:", sizePublic);

        let nftContract: any;
        nftContract = process.env.ENVIRONMENT_NFT_CONTRACT;
        if (process.argv.length > 8) {
            nftContract = process.argv[8];
        }
        console.log("nftContract:", nftContract);

        const nft = new RockNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const tx = await nft.initMetaverse(nftContract, metaverseId, erc721, priceNftColl, nftCollSize, pricePublic, sizePublic, 0);
        console.log(tx);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();