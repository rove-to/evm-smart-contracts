import {RockNFT} from "./rockNFT";

(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }

        const nft = new RockNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const data: string = '305361548844863662461173535141200x00000000000000000000000000000000000000000x659a4bdaaacc62d2bd9cb18225d9c89b5b697a5a22501';
        const signData: string = '0x6065d18df5591da658af2825a376d3100bd174b983599f0d027110c4ce8088355237f2c5c2ffda9deeb51d840c7f8e58dce531d16561433ad046a747058ea62d1b';
        let tx = await nft.verifySignData('0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', data, signData, 'RockNFTCollectionHolderCrossChain');
        console.log("tx hash", tx?.transactionHash);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();