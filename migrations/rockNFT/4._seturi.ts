import {RockNFT} from "./rockNFT";

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

        let tokenUri: any = "";
        if (process.argv.length >= 4) {
            tokenUri = process.argv[4];
            console.log("tokenUri", tokenUri)
        }

        const nft = new RockNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        if (tokenUri.length > 0) {
            await nft.setCustomTokenUri(contract, tokenID, tokenUri, 0,
                'RockNFT');
        }
        console.log("token uri", await nft.uri(contract, tokenID, 'RockNFT'));
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();