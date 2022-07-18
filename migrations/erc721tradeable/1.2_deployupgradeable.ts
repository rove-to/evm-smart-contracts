import {Erc721} from "./erc721";

(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }

        const marketplace = new Erc721(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const address = await marketplace.deployUpgradeable(
            "",
            "",
            "",
            "",
            "");
        console.log("Autonomous ERC721 deployed address: ", address);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();