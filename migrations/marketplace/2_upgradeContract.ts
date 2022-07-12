import {Marketplace} from "./marketplace";

(async () => {
    try {
        if (process.env.NETWORK != "mumbai") {
            console.log("wrong network");
            return;
        }

        const marketplace = new Marketplace(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const address = await marketplace.upgradeContract(
            "0x3a498e9599A1977925015d7440162e4320900139",
            "RoveMarketPlaceUpgradeable");
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();