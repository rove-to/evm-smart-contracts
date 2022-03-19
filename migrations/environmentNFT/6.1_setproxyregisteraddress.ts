import {EnvironmentNFT} from "./environmentNFT";

(async () => {
    try {
        let contract: any = process.env.ENVIRONMENT_NFT_CONTRACT;
        if (process.argv.length >= 2) {
            contract = process.argv[2];
            console.log("contract", contract)
        }

        let proxyAddress: any;
        if (process.argv.length >= 3) {
            proxyAddress = process.argv[3];
            console.log("proxy address", proxyAddress)
        }

        const nft = new EnvironmentNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        await nft.setProxyRegisterAddress(contract, proxyAddress, 500000);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();