import * as dotenv from 'dotenv';

import {TicketNFT} from "./ticketNFT";

(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }
        const nft = new TicketNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        let admin, operator = await nft.getAdminAddress('');
        console.log("%s Environment admin address: %s", process.env.NETWORK, admin, operator);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();