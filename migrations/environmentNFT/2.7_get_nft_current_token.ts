import {EnvironmentNFT} from "./environmentNFT";

(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }

        const nft = new EnvironmentNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const currentInitTokenTo = await nft.newItemId('');
        console.log({tx: currentInitTokenTo});
        const maxSupply = await nft.getMaxSupply('', 0);
        console.log({maxSupply});
        const totalSupply = await nft.getTotalSupply('', 0)
        console.log({totalSupply});
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();