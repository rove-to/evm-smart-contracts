import config from "../../config";
import {ObjectNFT} from "./objectNFT";

(async () => {
    try {
        const objectNFT = new ObjectNFT(config.ACCESS_TOKEN, config.PRIVATE_KEY, config.PUBLIC_KEY);
        const address = await objectNFT.deploy();
        console.log("ObjectNFT deployed address: ", address);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();