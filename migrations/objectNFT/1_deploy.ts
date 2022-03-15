import * as dotenv from 'dotenv';

import {ObjectNFT} from "./objectNFT";

(async () => {
    try {
        const nft = new ObjectNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const address = await nft.deploy();
        console.log("ObjectNFT deployed address: ", address);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();