import * as dotenv from 'dotenv';

var mime = require('mime-types')
dotenv.config();
import config from '../../config';
import * as path from "path";
import {Buffer} from "buffer";
import env = require("hardhat");

var fs = require('fs');
const axios = require('axios').default;

class PinataIpfsStorage {
    accessToken: string;

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    async axiosPost(url: string, data: object) {
        try {
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

    async uploadObjectNFT(image2DPath: string, model3DPath: string, objectNFTJsonTemplatePath: string) {
        let fileFullPath;

        // upload 2D image file
        console.log("--- Upload 2D image ---");
        fileFullPath = path.resolve(image2DPath);// 
        let pinataUrl2DThumbnail = await this.uploadFilePinata(fileFullPath);
        pinataUrl2DThumbnail = this.pinataGatewateHash(pinataUrl2DThumbnail);
        console.log("2d image: ", pinataUrl2DThumbnail);

        // upload 3D model file
        console.log("--- Upload 3D model ---");
        fileFullPath = path.resolve(model3DPath); //"./metadatajson/corgi.arc"
        let pinataUrl3DModel = await this.uploadFilePinata(fileFullPath);
        pinataUrl3DModel = this.pinataGatewateHash(pinataUrl3DModel);
        console.log("3d model: ", pinataUrl3DModel);

        // pin json metadata
        console.log("--- Pin json metadata ---");
        fileFullPath = path.resolve(objectNFTJsonTemplatePath);//'./metadatajson/object_nft.json'
        const rawdata = await fs.promises.readFile(fileFullPath).catch((err: unknown) => console.error('Failed to read file', err));
        let objecNFTMetadataJson = JSON.parse(rawdata);
        objecNFTMetadataJson.image = pinataUrl2DThumbnail;
        objecNFTMetadataJson.attributes.forEach(function (item: any) {
            if (item.trait_type == "rove-asset-bundle") {
                item.value = pinataUrl3DModel;
            }
        });
        let jsonDataStr = JSON.stringify(objecNFTMetadataJson);
        // console.log("json metadata:", jsonDataStr);
        let pinataJsonMetadata = await this.pinJson(jsonDataStr);
        pinataJsonMetadata = this.pinataGatewateHash(pinataJsonMetadata);
        // console.log(pinataJsonMetadata);

        return pinataJsonMetadata;
    }

    pinataGatewateHash(hash: string) {
        return "http://gateway.pinata.cloud/ipfs/" + hash;
    }
}

export {PinataIpfsStorage};

(async () => {
    try {
        var pinataIpfsStorage = new PinataIpfsStorage(config.ACCESS_TOKEN);
        const pinatahashlink = await pinataIpfsStorage.uploadObjectNFT(
            "./metadatajson/Test-Drive-Unlimited-new-2-icon.png",
            "./metadatajson/corgi.arc",
            './metadatajson/object_nft.json');
        console.log("result: ", pinatahashlink);
    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();