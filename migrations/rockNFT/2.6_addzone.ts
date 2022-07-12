import {RockNFT, Zone} from "./rockNFT";

const {ethers} = require("hardhat");

(async () => {
    try {
        if (process.env.NETWORK != "mumbai") {
            console.log("wrong network");
            return;
        }

        // set metaverdse id
        let metaverseId: any;
        if (process.argv.length >= 2) {
            metaverseId = process.argv[2];
        }
        console.log("metaverseId:", metaverseId);


        let nftContract: any;
        nftContract = process.env.ENVIRONMENT_NFT_CONTRACT;
        if (process.argv.length > 3) {
            nftContract = process.argv[3];
        }
        console.log("nftContract:", nftContract);

        const nft = new RockNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        let zone1: Zone = new Zone(1, 1);
        zone1.zoneIndex = 4;
        zone1.typeZone = 3;
        zone1.chainId = 250;
        zone1.rockIndexFrom = 602;
        zone1.rockIndexTo = 605;
        zone1.price = ethers.utils.parseEther("0.001").toNumber();
        // zone1.coreTeamAddr = "0x0000000000000000000000000000000000000000";
        // zone1.coreTeamAddr = "0x0000000000000000000000000000000000000000";

        const tx = await nft.addZone(nftContract, metaverseId, zone1, "0.001", 0, 'RockNFTCollectionHolderCrossChain');
        console.log("tx hash:", tx.transactionHash);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();