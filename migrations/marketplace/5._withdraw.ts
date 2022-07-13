import {Marketplace} from "./marketplace";

(async () => {
    try {
        if (process.env.NETWORK != "fantom_testnet") {
            console.log("wrong network");
            return;
        }

        let contract: any = process.env.ENVIRONMENT_NFT_CONTRACT;
        if (process.argv.length >= 2) {
            contract = process.argv[2];
            console.log("contract", contract)
        }

        const c = new Marketplace(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        await c.withdrawBalance('0x0000000000000000000000000000000000000000', contract, 'RoveMarketPlaceUpgradeable', 0);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();