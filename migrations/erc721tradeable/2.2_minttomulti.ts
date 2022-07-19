import {Erc721} from "./erc721";

(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }

        const marketplace = new Erc721(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const contractAddress = '0xae0C96BBD7733a1C7843af27e0683c74E182A3a7';
        const current = await marketplace.nextTokenId(contractAddress);
        const fromTokenId = current + 1;
        const x = 10;
        const toTokenId = fromTokenId - 1 + x;
        for (var i = fromTokenId; i <= toTokenId; i++) {
            const tx = await marketplace.mintTo(
                contractAddress,
                "0xEB39aFAdcf1CBC8266fa0f4c0F35BEeaE556C920",
                "", 0);
            console.log(i + ". Tx success on: ", tx?.transactionHash);
        }
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();