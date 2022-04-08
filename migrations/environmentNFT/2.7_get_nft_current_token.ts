import {EnvironmentNFT} from "./environmentNFT";

(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }

        const nft = new EnvironmentNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const tx = await nft.newItemId('');
        console.log(tx);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();