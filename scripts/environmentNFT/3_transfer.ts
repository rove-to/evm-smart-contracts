import * as dotenv from 'dotenv';

import {EnvironmentNFT} from "./environmentNFT";
import {PinataIpfsStorage} from "../utils/pinataIpfsStorage";

(async () => {
    try {
        const nft = new EnvironmentNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        await nft.transfer('0xF61234046A18b07Bf1486823369B22eFd2C4507F', process.env.OBJECT_NFT_CONTRACT, 1, 1, 500000);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();