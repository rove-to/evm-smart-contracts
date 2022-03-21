import * as dotenv from 'dotenv';

import {EnvironmentNFT} from "./environmentNFT";

(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }
        const nft = new EnvironmentNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        let admin, operator = await nft.getAdminAddress('');
        console.log("%s Environment admin address: %s", process.env.NETWORK, admin, operator);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();