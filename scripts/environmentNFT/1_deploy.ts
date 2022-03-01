import * as dotenv from 'dotenv';

import {EnvironmentNFT} from "./environmentNFT";

(async () => {
    try {
        const objectNFT = new EnvironmentNFT(process.env.ACCESS_TOKEN, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const address = await objectNFT.deploy();
        console.log("ObjectNFT deployed address: ", address);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();