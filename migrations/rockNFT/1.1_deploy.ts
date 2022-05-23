import * as dotenv from 'dotenv';

import {RockNFT} from "./rockNFT";

(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }
        const nft = new RockNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const address = await nft.deploy(
            '0xE55EAdE1B17BbA28A80a71633aF8C15Dc2D556A5',
            '0xF61234046A18b07Bf1486823369B22eFd2C4507F',
            '',
            "Metaverse powered by Rove",
            "RMs",
            // "RockNFT");
        "RockNFTCollectionHolder");
        console.log("%s RockNFT deployed address: %s", process.env.NETWORK, address);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();