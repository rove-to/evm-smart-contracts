import {Erc721} from "./erc721";

(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }

        const marketplace = new Erc721(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const address = await marketplace.deployUpgradeable(
            "AUTOREX",
            "ATR",
            "https://api.autonomous.ai/nft/metadata/",
            "0xE55EAdE1B17BbA28A80a71633aF8C15Dc2D556A5",
            "0xF61234046A18b07Bf1486823369B22eFd2C4507F");
        console.log("Autonomous ERC721 deployed address: ", address);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();