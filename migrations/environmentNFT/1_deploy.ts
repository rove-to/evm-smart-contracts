import * as dotenv from 'dotenv';

import {EnvironmentNFT} from "./environmentNFT";

(async () => {
    try {
        const nft = new EnvironmentNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const address = await nft.deploy();
        console.log("EnvironmentNFT deployed address: ", address);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();