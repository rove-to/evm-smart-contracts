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

        let creatorAddress: any;
        if (process.argv.length >= 3) {
            creatorAddress = process.argv[3];
            console.log("creatorAddress", creatorAddress)
        }

        let tokenIDs: any;
        if (process.argv.length >= 4) {
            tokenIDs = process.argv[4];
            console.log("tokenID", tokenIDs)
        }

        const nft = new EnvironmentNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        await nft.setCreator(contract, creatorAddress, tokenIDs, 500000);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();