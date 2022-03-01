import * as dotenv from 'dotenv';

var mime = require('mime-types')
dotenv.config();
import * as path from "path";
import {Buffer} from "buffer";

var fs = require('fs');
const axios = require('axios').default;

class PinataData {
    image2DPath: string;
    model3DPath: string;
    assetBundlePath: string;
    assetAddressablePath: string;
    nftJsonTemplatePath: string;
    name: string;
    description: string;
    attributes: any;

    constructor(image2DPath: string, model3DPath: string,
                assetBundlePath: string,
                assetAddressablePath: string,
                nftJsonTemplatePath: string,
                name: string,
                description: string,
                attributes: any) {
        this.image2DPath = image2DPath;
        this.model3DPath = model3DPath;
        this.assetBundlePath = assetBundlePath;
        this.assetAddressablePath = assetAddressablePath;
        this.nftJsonTemplatePath = nftJsonTemplatePath;
        this.name = name;
        this.description = description;
        this.attributes = attributes;
    }
}

class PinataIpfsStorage {
    accessToken: string;

    constructor(accessToken: any) {
        this.accessToken = accessToken;
    }

    async axiosPost(url: string, data: object) {
        try {
            console.log(this.accessToken);
            const resp = await axios.post(url, data, {
                headers: {
                    Authorization: 'Bearer ' + this.accessToken
                }
            });
            return resp.data;
        } catch (error) {
            console.log(error.request.res.statusCode);
            console.log(error.data);
            throw new Error(error);
        }
    }

    async axiosPutBinaryData(url: string, data: Buffer, contentType: string) {
        try {
            await axios.put(url, data, {
                headers: {"Content-Type": contentType}
            });
        } catch (error) {
            console.log(error.request.res.statusCode);
            throw new Error(error);
        }
    }

    async axiosGet(url: string) {
        try {
            const resp = await axios.get(url, {
                headers: {
                    Authorization: 'Bearer ' + this.accessToken
                }
            });
            return resp.data;
        } catch (Error) {
            console.log(Error.request.res.statusCode);
            throw new Error(Error);
        }
    }

    async step1(filePath: string) {
        console.log("* Start step 1");
        let fileName = path.basename(filePath);
        console.log("basename: " + fileName)
        let url = process.env.BE_URL_API + "file-storage/generate-upload-url";
        console.log(url);
        let generateUploadURLResp = await this.axiosPost(url, {fileName: fileName});
        if (generateUploadURLResp == null) {
            console.log("Call api error");
        }
        console.log("end Step 1");
        return generateUploadURLResp.data;
    }

    async step2(urlGeneratedUpload: string, filePath: string) {
        console.log("* Start step 2");
        const data = await fs.promises.readFile(filePath).catch((err: unknown) => console.error('Failed to read file', err));
        await this.axiosPutBinaryData(urlGeneratedUpload, data, mime.lookup(filePath));
        console.log("end step 2");
    }

    async step3PinFile(fileUploadedLink: string) {
        console.log("* Start step 3");
        let url = process.env.BE_URL_API + "pinata/pinFile";
        let piantaFile = await this.axiosPost(url, {fileUrl: fileUploadedLink});
        if (piantaFile == null) {
            console.log("Call api error");
        }
        console.log("end step 3");
        return piantaFile.data.IpfsHash;
    }

    async pinJson(dataJson: string) {
        let piantaFile = await this.axiosPost(process.env.BE_URL_API + "pinata/pinJson", {data: dataJson});
        if (piantaFile == null) {
            console.log("Call api error");
        }
        // console.log(piantaFile.data);
        return piantaFile.data.IpfsHash;
    }

    async uploadFilePinata(filePath: string) {
        // step 1
        let fileUrlGenerated = await this.step1(filePath);
        console.log(fileUrlGenerated);

        // step 2
        await this.step2(fileUrlGenerated, filePath);

        // step 3
        let pinataHash = this.step3PinFile(fileUrlGenerated);

        return pinataHash;
    }

    async uploadObjectNFT(pinnataData: PinataData) {
        let fileFullPath;

        // upload 2D image file
        let pinataUrl2DThumbnail: string = '';
        if (pinnataData.image2DPath.length > 0) {
            console.log("--- Upload 2D image ---");
            fileFullPath = path.resolve(pinnataData.image2DPath);// 
            pinataUrl2DThumbnail = await this.uploadFilePinata(fileFullPath);
            pinataUrl2DThumbnail = this.pinataGatewateHash(pinataUrl2DThumbnail);
            console.log("2d image: ", pinataUrl2DThumbnail);
        }

        // upload 3D model file glb/gltf
        let pinataUrl3DModel: string = '';
        if (pinnataData.model3DPath.length > 0) {
            console.log("--- Upload 3D model glb/gltf ---");
            fileFullPath = path.resolve(pinnataData.model3DPath); //"./metadatajson/corgi.glb"
            pinataUrl3DModel = await this.uploadFilePinata(fileFullPath);
            pinataUrl3DModel = this.pinataGatewateHash(pinataUrl3DModel);
            console.log("3d model: ", pinataUrl3DModel);
        }

        // upload asset bundle
        let pinataUrlAssetBundle: string = '';
        if (pinnataData.assetBundlePath.length) {
            console.log("--- Upload asset bundle ---");
            fileFullPath = path.resolve(pinnataData.assetBundlePath); //"./metadatajson/corgi.glb"
            pinataUrlAssetBundle = await this.uploadFilePinata(fileFullPath);
            pinataUrlAssetBundle = this.pinataGatewateHash(pinataUrlAssetBundle);
            console.log("asset bundle: ", pinataUrlAssetBundle);
        }

        // upload asset addressable
        let pinataUrlAssetAddressable: string = '';
        if (pinnataData.assetAddressablePath.length > 0) {
            console.log("--- Upload asset addressable ---");
            fileFullPath = path.resolve(pinnataData.assetAddressablePath); //"./metadatajson/corgi.glb"
            pinataUrlAssetAddressable = await this.uploadFilePinata(fileFullPath);
            pinataUrlAssetAddressable = this.pinataGatewateHash(pinataUrlAssetAddressable);
            console.log("Asset Addressable: ", pinataUrlAssetAddressable);
        }

        // pin json metadata
        console.log("--- Pin json metadata ---");
        fileFullPath = path.resolve(pinnataData.nftJsonTemplatePath);//'./metadatajson/object_nft.json'
        const rawdata = await fs.promises.readFile(fileFullPath).catch((err: unknown) => console.error('Failed to read file', err));
        let objecNFTMetadataJson = JSON.parse(rawdata);
        if (pinnataData.name.length > 0) {
            objecNFTMetadataJson.name = pinnataData.name;
        }
        if (pinnataData.description.length > 0) {
            objecNFTMetadataJson.description = pinnataData.description;
        }
        try {
            pinnataData.attributes = JSON.parse(pinnataData.attributes);
            if (pinnataData.attributes.length > 0) {
                for (let i = 0; i < pinnataData.attributes.length; i++) {
                    objecNFTMetadataJson.attributes.push(pinnataData.attributes[i]);
                }
            }
        } catch {
            console.log("can not parse attributes")
        }
        objecNFTMetadataJson.image = pinataUrl2DThumbnail;
        objecNFTMetadataJson.animation_url = pinataUrl3DModel
        objecNFTMetadataJson.attributes.forEach(function (item: any) {
            if (item.trait_type == "rove-asset-bundle") {
                item.value = pinataUrlAssetBundle;
            }
            if (item.trait_type == "rove-asset-addressable") {
                item.value = pinataUrlAssetAddressable;
            }
        });
        let jsonDataStr = JSON.stringify(objecNFTMetadataJson);
        let pinataJsonMetadata = await this.pinJson(jsonDataStr);
        pinataJsonMetadata = this.pinataGatewateHash(pinataJsonMetadata);

        return pinataJsonMetadata;
    }

    pinataGatewateHash(hash: string) {
        return "http://gateway.pinata.cloud/ipfs/" + hash;
    }
}

export {PinataIpfsStorage, PinataData};

/*(async () => {
    try {
        var pinataIpfsStorage = new PinataIpfsStorage(process.env.ACCESS_TOKEN);
        const pinatahashlink = await pinataIpfsStorage.uploadObjectNFT(
            "./metadatajson/Test-Drive-Unlimited-new-2-icon.png",
            "./metadatajson/corgi.arc",
            './metadatajson/object_nft.json');
        console.log("result: ", pinatahashlink);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();*/
