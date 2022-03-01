import {PinataIpfsStorage, PinataData} from "../utils/pinataIpfsStorage";

(async () => {
    try {
        // set image
        let image2DPath: string = "";
        if (process.argv.length < 3) {
            console.log("miss image");
            return;
        }
        image2DPath = process.argv[2];

        // 
        let model3DPath: string = "";
        if (process.argv.length < 4) {
            console.log("miss 3d model");
            return;
        }
        model3DPath = process.argv[3];

        //
        let assetBundlePath: string = "";
        if (process.argv.length < 5) {
            console.log("miss asset bundle");
            return;
        }
        assetBundlePath = process.argv[4];

        //
        let assetAddressablePath: string = "";
        if (process.argv.length < 6) {
            console.log("miss asset addressable");
            return;
        }
        assetAddressablePath = process.argv[5];

        let jsonTemplate: string = './metadatajson/environment_nft.json';
        if (process.argv.length < 7) {
            console.log("miss json template");
            return;
        }
        jsonTemplate = process.argv[6];

        // set name
        let name: string = '';
        if (process.argv.length < 8) {
            console.log("miss name");
            return;
        }
        name = process.argv[7];

        // set description 
        let description: string = '';
        if (process.argv.length < 9) {
            console.log("miss description");
            return;
        }
        description = process.argv[8];
        // set attributes
        let attributes: any;
        if (process.argv.length < 10) {
            console.log("miss attributes");
            return;
        }
        attributes = process.argv[9];

        let data = new PinataData(image2DPath, model3DPath, assetBundlePath, assetAddressablePath, jsonTemplate, name, description, attributes)
        console.log(data);
        const nftContract = process.env.ENVIRONMENT_NFT_CONTRACT;
        console.log("nft contract", nftContract);

        let pinata = new PinataIpfsStorage(process.env.ACCESS_TOKEN);
        const tokenURI = await pinata.uploadObjectNFT(data);
        console.log("result: ", tokenURI);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();