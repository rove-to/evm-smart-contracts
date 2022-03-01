import * as dotenv from 'dotenv';

import {EnvironmentNFT} from "./environmentNFT";
import {PinataIpfsStorage, PinataData} from "../utils/pinataIpfsStorage";

(async () => {
    try {
        // set init owner
        let initOwnerAddress: any;
        if (process.argv.length < 3) {
            console.log("miss init owner nft");
            return;
        }
        initOwnerAddress = process.argv[2];
        console.log("init owner:", initOwnerAddress);

        let initSupply: any;
        if (process.argv.length < 4) {
            console.log("miss init supply");
            return;
        }
        initSupply = process.argv[3];
        console.log("initSupply:", initSupply);
        
        // set metadata
        let tokenURI: any;
        if (process.argv.length < 5) {
            console.log("miss init owner nft");
            return;
        }
        initOwnerAddress = process.argv[4];
        console.log("tokenUri:", initOwnerAddress);
        
        let nftContract:any = process.env.ENVIRONMENT_NFT_CONTRACT;
        
        const objectNFT = new EnvironmentNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const tx = await objectNFT.mintEnvironmentNFT(initOwnerAddress, nftContract, initSupply, tokenURI, 500000);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();