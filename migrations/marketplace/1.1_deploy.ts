import {Marketplace} from "./marketplace";

(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }

        const marketplace = new Marketplace(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const address = await marketplace.deploy(
            "",
            "");
        console.log("Marketplace deployed address: ", address);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();