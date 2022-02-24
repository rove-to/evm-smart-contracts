import config from "../../config";
import {ObjectNFT} from "./objectNFT";
import {PinataIpfsStorage} from "../utils/pinata_upload";

(async () => {
    try {
        const objectNFT = new ObjectNFT(config.ACCESS_TOKEN, config.PRIVATE_KEY, config.PUBLIC_KEY);

        var pinataIpfsStorage = new PinataIpfsStorage(config.ACCESS_TOKEN);
        const pinatahashlink = await pinataIpfsStorage.uploadObjectNFT(
            "./metadatajson/Test-Drive-Unlimited-new-2-icon.png",
            "./metadatajson/corgi.arc",
            './metadatajson/object_nft.json');
        console.log("result: ", pinatahashlink);

        const tx = await objectNFT.mintObjectNFT(config.PUBLIC_KEY, config.OBJECT_NFT_CONTRACT, 1, pinatahashlink, 500000);
        console.log("tx hash: ", tx);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();