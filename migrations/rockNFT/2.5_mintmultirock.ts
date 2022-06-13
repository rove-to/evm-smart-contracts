import {RockNFT} from "./rockNFT";

const {ethers} = require("hardhat");
(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }

        let metaverseId: any = 0;

        // set init owner
        let to: any = 0x0;

        let eth_amount: any = "0.0";

        // set zoneIndex
        let contractName = 'RockNFT';
        let zoneIndex: any = 3; // public zone

        // set rockUri
        let rockUri: string = "";

        let nftContract: any = 0x0;

        const nft = new RockNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const fromIndex = 2;
        const toIndex = 2;
        for (let i = fromIndex; i <= toIndex; i++) {
            const tx = await nft.mintRock(metaverseId, to, nftContract, zoneIndex, i, rockUri, eth_amount, 0, contractName);
            console.log("rockIndex: ", i, tx.hash);
        }
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();