import * as dotenv from 'dotenv';

import {TicketNFTERC721} from "./ticketNFTERC721";

(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }
        const nft = new TicketNFTERC721(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const address = await nft.deploy('', 'process.env.PUBLIC_KEY', '');
        console.log("%s TicketNFT deployed address: %s", process.env.NETWORK, address);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();