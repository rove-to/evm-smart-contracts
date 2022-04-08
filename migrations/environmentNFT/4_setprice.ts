import {EnvironmentNFT} from "./environmentNFT";

(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }

        let contract: any = process.env.ENVIRONMENT_NFT_CONTRACT;
        if (process.argv.length >= 2) {
            contract = process.argv[2];
            console.log("contract", contract)
        }

        let tokenID: any;
        if (process.argv.length >= 3) {
            tokenID = process.argv[3];
            console.log("tokenID", tokenID)
        }

        let price: any;
        if (process.argv.length >= 4) {
            price = process.argv[4];
            console.log("price", price)
        }

        const nft = new EnvironmentNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        await nft.changePriceToken(contract, tokenID, price, 5000);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();