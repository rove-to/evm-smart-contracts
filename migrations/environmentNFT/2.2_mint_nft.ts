import {EnvironmentNFT} from "./environmentNFT";

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

        // set metadata
        let tokenURI: any;
        if (process.argv.length >= 4) {
            tokenURI = process.argv[4];
        }
        console.log("tokenUri:", tokenURI);

        let nftContract: any;
        nftContract = process.env.ENVIRONMENT_NFT_CONTRACT;
        if (process.argv.length > 5) {
            nftContract = process.argv[5];
        }
        console.log("nftContract:", nftContract);

        const nft = new EnvironmentNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const tx = await nft.mintEnvironmentNFT(initOwnerAddress, nftContract, initSupply, tokenURI, 500000);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();