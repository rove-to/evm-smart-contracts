import {RockNFT} from "./rockNFT";

(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }

        // set init owner
        let initOwnerAddress: any;
        if (process.argv.length >= 2) {
            initOwnerAddress = process.argv[2];
        }
        console.log("init owner:", initOwnerAddress);

        // set init supply
        let initSupply: any;
        if (process.argv.length >= 3) {
            initSupply = process.argv[3];
        }
        console.log("initSupply:", initSupply);

        let price: any = 0;
        if (process.argv.length >= 4) {
            price = process.argv[4];
        }
        console.log("price:", price);

        let max: any = 100000;
        if (process.argv.length >= 5) {
            max = process.argv[5];
        }
        console.log("max:", max);

        // set metadata
        let tokenIds: any;
        if (process.argv.length >= 6) {
            tokenIds = process.argv[6];
        }
        console.log("tokenIds:", tokenIds);

        let nftContract: any;
        nftContract = process.env.ENVIRONMENT_NFT_CONTRACT;
        if (process.argv.length > 7) {
            nftContract = process.argv[7];
        }
        console.log("nftContract:", nftContract);

        const nft = new RockNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const tx = await nft.createNFT(initOwnerAddress, nftContract, initSupply, price, max, tokenIds, 0,);
        console.log(tx);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();