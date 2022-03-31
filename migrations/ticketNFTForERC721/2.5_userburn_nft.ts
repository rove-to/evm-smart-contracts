import {TicketNFTERC721} from "./ticketNFTERC721";

const {ethers} = require("hardhat");
(async () => {
    try {
        if (process.env.NETWORK != "localhost") {
            console.log("wrong network");
            return;
        }

        // owner
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

        // token id
        let tokenId: any;
        if (process.argv.length >= 4) {
            tokenId = process.argv[4];
        }
        console.log("tokenId:", tokenId);

        let nftContract: any;
        nftContract = process.env.ENVIRONMENT_NFT_CONTRACT;
        if (process.argv.length > 5) {
            nftContract = process.argv[5];
        }
        console.log("nftContract:", nftContract);

        const nft = new TicketNFTERC721(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const tx = await nft.userBurnTicketNFT(to, nftContract, tokenId, amount, 0);
        console.log(tx);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();