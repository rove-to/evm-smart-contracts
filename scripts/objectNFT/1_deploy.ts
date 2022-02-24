import config from "../../config";
import {ObjectNFT} from "./objectNFT";

(async () => {
    try {
        const objectNFT = new ObjectNFT(config.ACCESS_TOKEN, config.PUBLIC_KEY, config.PRIVATE_KEY);
        const address = await objectNFT.deploy();
        console.log("ObjectNFT deployed address: ", address);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();