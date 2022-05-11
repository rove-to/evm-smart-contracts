import {RockNFT, Zone} from "./rockNFT";

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

        let zoneIndex: any;
        if (process.argv.length >= 3) {
            zoneIndex = process.argv[3];
        }
        console.log("zoneIndex:", zoneIndex);

        let nftContract: any;
        nftContract = process.env.ENVIRONMENT_NFT_CONTRACT;
        if (process.argv.length > 4) {
            nftContract = process.argv[4];
        }
        console.log("nftContract:", nftContract);

        const nft = new RockNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);

        const owner = await nft.getMetaverseZones(nftContract, metaverseId, zoneIndex);
        console.log("owner:", owner);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();