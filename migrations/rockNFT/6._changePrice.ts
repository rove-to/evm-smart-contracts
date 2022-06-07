import {RockNFT} from "./rockNFT";

(async () => {
    try {
        if (process.env.NETWORK != "mumbai") {
            console.log("wrong network");
            return;
        }

        let contract: any = process.env.ENVIRONMENT_NFT_CONTRACT;
        if (process.argv.length >= 2) {
            contract = process.argv[2];
            console.log("contract", contract)
        }

        let metaverseId: any;
        if (process.argv.length >= 3) {
            metaverseId = process.argv[3];
            console.log("metaverseId", metaverseId)
        }

        let zoneId: any = "";
        if (process.argv.length >= 4) {
            zoneId = process.argv[4];
            console.log("zoneId", zoneId)
        }

        let price: any = "";
        if (process.argv.length >= 5) {
            zoneId = process.argv[5];
            console.log("tokenUri", zoneId)
        }

        const nft = new RockNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        let tx = await nft.changeZonePrice(contract, metaverseId, zoneId, price, 'RockNFT', 0);
        console.log("token uri", tx?.transactionHash);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();