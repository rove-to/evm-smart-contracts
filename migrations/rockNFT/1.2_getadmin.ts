import * as dotenv from 'dotenv';

import {RockNFT} from "./rockNFT";

(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }
        const nft = new RockNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        let admin, operator, control = await nft.getAdminAddress('');
        console.log("%s RockNFT admin address: %s", process.env.NETWORK, admin, operator, control);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();