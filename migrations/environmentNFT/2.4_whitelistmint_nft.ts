import {EnvironmentNFT} from "./environmentNFT";

(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }

        let nftContract: any;
        nftContract = process.env.ENVIRONMENT_NFT_CONTRACT;
        if (process.argv.length >= 2) {
            nftContract = process.argv[2];
        }
        console.log("nftContract:", nftContract);

        const nft = new EnvironmentNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        // const tx = await nft.changeWhiteListMintTokenIds(nftContract, [1, 2], 500000);
        // console.log(tx);
        const temp = await nft.getWhiteListMintTokenIds(nftContract, 1);
        console.log(temp);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();