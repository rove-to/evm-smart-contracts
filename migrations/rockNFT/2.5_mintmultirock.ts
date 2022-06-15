import {RockNFT} from "./rockNFT";
import {PinataIpfsStorage} from "../utils/pinataIpfsStorage";

const {ethers} = require("hardhat");
(async () => {
    try {
        if (process.env.NETWORK != "polygon") {
            console.log("wrong network");
            return;
        }

        let metaverseId: any = "";

        // set init owner
        let to: any = '0x00';

        let eth_amount: any = "0.0001";

        // set zoneIndex
        let contractName = 'RockNFT';
        let zoneIndex: any = 3; // public zone

        // set rockUri
        let rockUri: string = "";

        let nftContract: any = '0xC87826375fe21f56BF00E9B4dba4396F7ff667b6';

        const nft = new RockNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const fromIndex = 455;
        const toIndex = 501;
        const request = new PinataIpfsStorage(process.env.ACCESS_TOKEN);
        for (let i = fromIndex; i <= toIndex; i++) {
            let data = await request.axiosGet(process.env.BE_URL_API + "rock/list?metaverseId=" + metaverseId + "&rockIndex=" + i + "&zoneIndex=" + zoneIndex);
            if (data.status == 1 && data.data.total == 1 && data.data.rocks[0].owner == undefined) {
                const rockID = data.data.rocks[0].id;
                console.log("---- \nMinting rockId: ", rockID);
                rockUri = process.env.BE_URL_API + "rock/" + rockID + "/metadata";

                // call contract
                const tx = await nft.mintRock(metaverseId, to, nftContract, zoneIndex, i, rockUri, eth_amount, 200000, contractName);

                console.log("Minted rock: \n", "index: " + i, "id: " + rockID, "uri: " + rockUri, "hash: " + "", "to:" + to, "hash: " + tx?.transactionHash);
                console.log("----\n")
            } else {
                console.log("missing data for rockIndex " + i);
                // break;
                
            }
        }
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();