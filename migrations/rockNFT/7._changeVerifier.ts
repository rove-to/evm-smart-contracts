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

        let verifier: any = process.env.ENVIRONMENT_NFT_CONTRACT;
        if (process.argv.length >= 3) {
            verifier = process.argv[3];
            console.log("verifier", verifier)
        }

        const nft = new RockNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        let tx = await nft.changeSigner(contract, verifier, 'RockNFTCollectionHolderCrossChain', 0);
        console.log("tx hash", tx?.transactionHash);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();