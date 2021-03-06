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

        let coreTeamAddr: any;
        if (process.argv.length >= 3) {
            coreTeamAddr = process.argv[3];
        }
        console.log("coreTeamAddr:", coreTeamAddr);

        let coreTeamCollSize = 0;
        if (process.argv.length >= 4) {
            coreTeamCollSize = parseInt(process.argv[4]);
        }
        console.log("coreTeamCollSize:", coreTeamCollSize);

        // set erc721
        let erc721: any;
        if (process.argv.length >= 5) {
            erc721 = process.argv[5];
        }
        console.log("erc721:", erc721);

        let priceNftColl: any = 0;
        if (process.argv.length >= 6) {
            priceNftColl = process.argv[6];
        }
        console.log("priceNftColl:", priceNftColl);

        let nftCollSize = 0;
        if (process.argv.length >= 7) {
            nftCollSize = parseInt(process.argv[7]);
        }
        console.log("nftCollSize:", nftCollSize);

        let pricePublic: any = 0;
        if (process.argv.length >= 8) {
            pricePublic = process.argv[8];
        }
        console.log("pricePublic:", pricePublic);

        let sizePublic = 0;
        if (process.argv.length >= 9) {
            sizePublic = parseInt(process.argv[9]);
        }
        console.log("publicSize:", sizePublic);

        let eth_amount: any = "0.0";
        if (process.argv.length >= 10) {
            eth_amount = process.argv[10]
        }
        console.log("eth_amount:", eth_amount);

        let nftContract: any;
        nftContract = process.env.ENVIRONMENT_NFT_CONTRACT;
        if (process.argv.length > 11) {
            nftContract = process.argv[11];
        }
        console.log("nftContract:", nftContract);

        const nft = new RockNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        let zone1: Zone = new Zone(1, 1);
        if (coreTeamCollSize > 0) {
            zone1.coreTeamAddr = coreTeamAddr;
            zone1.rockIndexFrom = 1;
            zone1.rockIndexTo = coreTeamCollSize;
        }

        let zone2: Zone = new Zone(2, 2);
        if (nftCollSize > 0) {
            zone2.rockIndexFrom = coreTeamCollSize + 1;
            zone2.rockIndexTo = coreTeamCollSize + nftCollSize;
            zone2.price = ethers.utils.parseEther(priceNftColl).toNumber();
            zone2.collAddr = erc721;
        }

        let zone3: Zone = new Zone(3, 3);
        if (sizePublic > 0) {
            zone3.rockIndexFrom = coreTeamCollSize + nftCollSize + 1;
            zone3.rockIndexTo = coreTeamCollSize + nftCollSize + sizePublic;
            zone3.price = ethers.utils.parseEther(pricePublic).toNumber();
        }

        const tx = await nft.initMetaverse(nftContract, metaverseId, zone1, zone2, zone3, eth_amount, 0,
            'RockNFT'
        );
        console.log("tx hash:", tx.transactionHash);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();