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

        const nft = new TicketNFTERC721(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        let temp = await nft.getProxyRegisterAddress(contract);
        console.log("%s Environment getProxyRegisterAddress: %s", process.env.NETWORK, temp);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();