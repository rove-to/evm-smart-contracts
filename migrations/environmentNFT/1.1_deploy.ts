import * as dotenv from 'dotenv';

import {EnvironmentNFT} from "./environmentNFT";

(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }
        const nft = new EnvironmentNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const address = await nft.deploy('', '');
        console.log("%s EnvironmentNFT deployed address: %s", process.env.NETWORK, address);
        let admin, operator = await nft.getAdminAddress(address);
        console.log("admin %s, operator %s", admin, operator);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();