import * as dotenv from 'dotenv';

import {TicketNFT} from "./ticketNFT";

(async () => {
    try {
        if (process.env.NETWORK != "rinkeby") {
            console.log("wrong network");
            return;
        }
        const nft = new TicketNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const address = await nft.deploy(process.env.PUBLIC_KEY, process.env.PUBLIC_KEY, '0x87e3A224cc55569664A1097A0293B3d48d731299');
        console.log("%s TicketNFT deployed address: %s", process.env.NETWORK, address);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();