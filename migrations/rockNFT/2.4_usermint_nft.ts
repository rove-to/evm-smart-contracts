import {RockNFT} from "./rockNFT";

const {ethers} = require("hardhat");
(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }

        // set init owner
        let to: any;
        if (process.argv.length >= 2) {
            to = process.argv[2];
        }
        console.log("to:", to);

        // set quantity
        let amount: any = 0;
        if (process.argv.length >= 3) {
            amount = process.argv[3];
        }
        console.log("amount:", amount);

        let eth_amount: any;
        if (process.argv.length >= 4) {
            eth_amount = process.argv[4];
        }
        console.log("eth_amount:", eth_amount);

        // set metadata
        let tokenId: any;
        if (process.argv.length >= 5) {
            tokenId = process.argv[5];
        }
        console.log("tokenId:", tokenId);

        let nftContract: any;
        nftContract = process.env.ENVIRONMENT_NFT_CONTRACT;
        if (process.argv.length > 6) {
            nftContract = process.argv[6];
        }
        console.log("nftContract:", nftContract);

        const nft = new RockNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const maxSupply = await nft.getMaxSupply(nftContract, tokenId);
        console.log(maxSupply);
        const price = await nft.getPriceToken(nftContract, tokenId);
        console.log(ethers.utils.formatEther(price));
        const tx = await nft.userMintNFT(to, nftContract, tokenId, amount, eth_amount, 0);
        console.log(tx);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();