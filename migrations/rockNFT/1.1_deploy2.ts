import * as dotenv from 'dotenv';

import {RockNFT} from "./rockNFT";

(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }
        const nft = new RockNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const address = await nft.deploy2(
            '0xE55EAdE1B17BbA28A80a71633aF8C15Dc2D556A5',
            '0xF61234046A18b07Bf1486823369B22eFd2C4507F',
            '0xae0d1e38B696ee0Ac5Ce6B9b746aa793e1485a9e',
            '0xFD8500cf6B98F37Bc1a287195d2537b72945a1e8',
            "Metaverse powered by Rove",
            "RMs",
            "RockNFTCollectionHolderCrossChain");
        console.log("%s RockNFT deployed address: %s", process.env.NETWORK, address);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();