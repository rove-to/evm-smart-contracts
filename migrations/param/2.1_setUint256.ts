import * as dotenv from 'dotenv';

import {ParamControl} from "./paramControl";
import {ethers} from "ethers";

(async () => {
    try {
        if (process.env.NETWORK != "local") {
            console.log("wrong network");
            return;
        }
        const contract = '0x87e3A224cc55569664A1097A0293B3d48d731299';
        const key = 'INIT_IMO_FEE';
        const nft = new ParamControl(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);
        // let admin = await nft.setUInt256(contract, key, ethers.utils.parseEther("0.00001"), 0);
        // console.log("%s ParamControl admin address: %s", process.env.NETWORK, admin);

        const val:any = await nft.getUInt256(contract, key);
        console.log("val", val);
        console.log("val", ethers.utils.formatEther(val.value));
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();