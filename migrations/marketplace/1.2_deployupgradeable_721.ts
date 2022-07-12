import {Marketplace} from "./marketplace";

(async () => {
    try {
        if (process.env.NETWORK != "mumbai") {
            console.log("wrong network");
            return;
        }

        const marketplace = new Marketplace(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const address = await marketplace.deployErc721Upgradeable(
            "0xE55EAdE1B17BbA28A80a71633aF8C15Dc2D556A5",
            "0xFD8500cf6B98F37Bc1a287195d2537b72945a1e8");
        console.log("Marketplace 721 deployed address: ", address);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();