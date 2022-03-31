import {TicketNFT} from "./ticketNFT";

(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }
        

        let receiver: any;
        if (process.argv.length >= 2) {
            receiver = process.argv[2];
            console.log("receiver", receiver)
        }

        let contract: any = process.env.ENVIRONMENT_NFT_CONTRACT;
        if (process.argv.length >= 3) {
            contract = process.argv[3];
            console.log("contract", contract)
        }

        let tokenID: any;
        if (process.argv.length >= 4) {
            tokenID = process.argv[4];
            console.log("tokenID", tokenID)
        }
        let amount: any;
        if (process.argv.length >= 5) {
            amount = process.argv[5];
            console.log("amount", amount)
        }

        const nft = new TicketNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        await nft.transfer(receiver, contract, tokenID, amount, 500000);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();