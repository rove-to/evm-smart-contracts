import * as dotenv from 'dotenv';

import {ObjectNFT} from "./objectNFT";
import {PinataIpfsStorage} from "../utils/pinataIpfsStorage";

(async () => {
    try {
        let pinata = new PinataIpfsStorage(process.env.ACCESS_TOKEN);
        const tokenURI = await pinata.uploadObjectNFT(
            "./metadatajson/Test-Drive-Unlimited-new-2-icon.png",
            "./metadatajson/corgi.arc",
            './metadatajson/object_nft.json');
        console.log("result: ", tokenURI);

        const objectNFT = new ObjectNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const tx = await objectNFT.mintObjectNFT(process.env.PUBLIC_KEY, process.env.OBJECT_NFT_CONTRACT, 1, tokenURI, 500000);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();