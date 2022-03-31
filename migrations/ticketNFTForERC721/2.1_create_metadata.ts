import {PinataIpfsStorage, PinataData} from "../utils/pinataIpfsStorage";

(async () => {
    try {
        // set image
        let image2DPath: string = "";
        if (process.argv.length >= 2) {
            image2DPath = process.argv[2];
        }

        // 
        let model3DPath: string = "";
        if (process.argv.length >= 3) {
            model3DPath = process.argv[3];
        }


        //
        let assetBundlePath: string = "";
        if (process.argv.length >= 4) {
            assetBundlePath = process.argv[4];
        }


        //
        let assetAddressablePath: string = "";
        if (process.argv.length >= 5) {
            assetAddressablePath = process.argv[5];
        }


        let jsonTemplate: string = './metadatajson/environment_nft.json';
        if (process.argv.length >= 6) {
            jsonTemplate = process.argv[6];
        }

        // set name
        let name: string = '';
        if (process.argv.length >= 7) {
            name = process.argv[7];
        }

        // set description 
        let description: string = '';
        if (process.argv.length >= 8) {
            description = process.argv[8];
        }

        // set attributes
        let attributes: any;
        if (process.argv.length >= 9) {
            attributes = process.argv[9];
        }

        let data = new PinataData(image2DPath, model3DPath, assetBundlePath, assetAddressablePath, jsonTemplate, name, description, attributes)
        console.log(data);

        let pinata = new PinataIpfsStorage(process.env.ACCESS_TOKEN);
        const tokenURI = await pinata.uploadObjectNFT(data);
        console.log("result: ", tokenURI);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();