import {EnvironmentNFT} from "./environmentNFT";

(async () => {
    try {
        let contract: any = process.env.ENVIRONMENT_NFT_CONTRACT;
        if (process.argv.length >= 2) {
            contract = process.argv[2];
            console.log("contract", contract)
        }

        let owner: any = process.env.PublicKey;
        if (process.argv.length >= 3) {
            owner = process.argv[3];
            console.log("owner", owner)
        }

        let operator: any = process.env.PublicKey;
        if (process.argv.length >= 4) {
            operator = process.argv[4];
            console.log("operator", operator)
        }

        const nft = new EnvironmentNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        let temp = await nft.isApprovedForAll(contract, owner, operator);
        console.log("%s Environment isApprovedForAll %s: %s", process.env.NETWORK, operator, temp);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();