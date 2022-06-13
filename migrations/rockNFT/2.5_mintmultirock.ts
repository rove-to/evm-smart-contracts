import {RockNFT} from "./rockNFT";
import {PinataIpfsStorage} from "../utils/pinataIpfsStorage";

const {ethers} = require("hardhat");
(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }

        let metaverseId: any = "";

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
        const toIndex = 5;
        const request = new PinataIpfsStorage(process.env.ACCESS_TOKEN);
        for (let i = fromIndex; i <= toIndex; i++) {
            let data = await request.axiosGet(process.env.BE_URL_API + "rock/list?metaverseId=" + metaverseId + "&rockIndex=" + i + "&zoneIndex=" + zoneIndex);
            if (data.status == 1 && data.data.total == 1) {
                const rockID = data.data.rocks[0].id;
                console.log("---- \nMinting rockId: ", rockID);
                rockUri = process.env.BE_URL_API + "rock/" + rockID + "/metadata";

                // call contract
                // const tx = await nft.mintRock(metaverseId, to, nftContract, zoneIndex, i, rockUri, eth_amount, 0, contractName);

                console.log("Minted rock: \n", "index: " + i, "id: " + rockID, "uri: " + rockUri, "hash: " + "", "to:" + to);
                console.log("----\n")
            } else {
                console.log("missing data for rockIndex " + i);
                break;
            }
        }
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();