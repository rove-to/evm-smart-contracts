import * as path from "path";
import {Buffer} from "buffer";
import {string} from "hardhat/internal/core/params/argumentTypes";

var fs = require('fs');

(async () => {
    try {
        const testFolder = process.argv[2];
        const fs = require('fs');
        var dir = './tmp';

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        await fs.readdir(testFolder, (err: Error, fileNames: string[]) => {
            fileNames.forEach(async (fileName) => {
                let fileFullPath = path.resolve(testFolder + "/" + fileName);
                const rawdata = await fs.promises.readFile(fileFullPath).catch((err: unknown) => console.error('Failed to read file', err));
                let objecNFTMetadataJson = JSON.parse(rawdata);
                if (fileName.indexOf("10000") >= 0) {
                    objecNFTMetadataJson.image = "https://ipfs.rove.to/ipfs/xxx/AutoRex" + fileName.replace(".json", "") + ".jpg"
                } else {
                    objecNFTMetadataJson.image = "https://ipfs.rove.to/ipfs/xxx/AutoRex" + fileName.replace(".json", "")
                        .padStart(4, '0') + ".jpg"
                }

                await fs.promises.writeFile(dir + "/" + fileName, JSON.stringify(objecNFTMetadataJson, null, 2));
            });
        });

    } catch (e) {
        // Deal with the fact the chain failed
        console.log(e);
    }
})();