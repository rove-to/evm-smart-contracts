import {RockNFT721} from "./rockNFT";

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

        let priceNftColl: any = 0;
        if (process.argv.length >= 4) {
            priceNftColl = process.argv[4];
        }
        console.log("priceNftColl:", priceNftColl);

        let nftCollSize = 0;
        if (process.argv.length >= 5) {
            nftCollSize = parseInt(process.argv[5]);
        }
        console.log("nftCollSize:", nftCollSize);

        let eth_amount: any = "0.0";
        if (process.argv.length >= 8) {
            eth_amount = process.argv[8]
        }
        console.log("eth_amount:", eth_amount);

        let nftContract: any;
        nftContract = process.env.ENVIRONMENT_NFT_CONTRACT;
        if (process.argv.length > 9) {
            nftContract = process.argv[9];
        }
        console.log("nftContract:", nftContract);

        const nft = new RockNFT721(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const tx = await nft.initMetaverse(nftContract, metaverseId, erc721, priceNftColl, nftCollSize, eth_amount, 0);
        console.log("tx hash:", tx.transactionHash);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();