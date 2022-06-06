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

        let toAddress: any;
        if (process.argv.length >= 3) {
            toAddress = process.argv[3];
            console.log("toAddress", toAddress)
        }

        const nft = new RockNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        if (toAddress.length > 0) {
            await nft.withdraw(contract, toAddress, 0, 'RockNFT');
        }
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();