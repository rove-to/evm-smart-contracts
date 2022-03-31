import {TicketNFTERC721} from "./ticketNFTERC721";

(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }


        let contract: any = process.env.ENVIRONMENT_NFT_CONTRACT;
        if (process.argv.length >= 2) {
            contract = process.argv[2];
            console.log("contract", contract)
        }

        let owner: any = process.env.PublicKey;
        if (process.argv.length >= 3) {
            owner = process.argv[3];
            console.log("owner", owner)
        }

        let operator: any = process.env.PublicKey;
        if (process.argv.length >= 4) {
            operator = process.argv[4];
            console.log("operator", operator)
        }

        const nft = new TicketNFTERC721(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        let temp = await nft.setApprovalForAll(contract, operator, 500000);
        console.log("%s Environment setApprovalForAll %s: %s", process.env.NETWORK, owner, operator);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();