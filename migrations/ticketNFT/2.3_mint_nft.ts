import {TicketNFT} from "./ticketNFT";

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

        // set init supply
        let amount: any;
        if (process.argv.length >= 3) {
            amount = process.argv[3];
        }
        console.log("amount:", amount);

        // set metadata
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

        const nft = new TicketNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const tx = await nft.mintTicketNFT(to, nftContract, tokenId, amount, 500000);
        console.log(tx);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();