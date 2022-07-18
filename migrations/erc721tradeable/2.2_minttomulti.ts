import {Erc721} from "./erc721";

(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }

        const marketplace = new Erc721(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        const current = await marketplace.nextTokenId("");
        const fromTokenId = current + 1;
        const x = -1;
        const toTokenId = fromTokenId + x;
        for (var i = fromTokenId; i <= toTokenId; i++) {
            const tx = await marketplace.mintTo(
                "",
                "",
                "", 0);
            console.log("Tx success on : ", tx?.transactionHash);
        }
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();