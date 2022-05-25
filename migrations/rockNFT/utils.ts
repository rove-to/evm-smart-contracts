import { createMetaverse, getRocks } from "../utils/backend";
import { RockNFT } from "./rockNFT";
import * as fs from 'fs';

const DEFAULT_SUPPLY = 500;
const POLYGON_CHAIN_ID = '8001';
const EVM_WALLET_TYPE = 0;
const NFT_HOLDER_CONTRACT_ADDRESS = '0xCe2aa135799F8cB347A80Ec9CA340D9487DE6407';

export interface NFTItem {
  name: string;
  address: string;
}

export const transformMetaverseIdToTokenID = (metaverseId: string): BigInt => {
  return (((BigInt('0x' + metaverseId) * BigInt("1000000000")) + BigInt("1")) * BigInt("1000000000")) + BigInt("1");
}

export const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const seedTrendingMetaverses = async (nftList: Array<NFTItem>) => {
  const rockServInstance = new RockNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);

  for (const nftItem of nftList) {
    try {
      // Call api to create metaverse in DB
      const createMetaverseRes = await createMetaverse({
        name: nftItem.name,
        description: '',
        publicPrice: 0,
        publicSupply: 0,
        coreTeamWalletAddress: "",
        coreTeamSupply: 0,
        holderPrice: 0,
        holderSupply: DEFAULT_SUPPLY,
        collectionWalletAddress: nftItem.address,
        logoUrl: '',
        coverUrl: '',
        chainId: POLYGON_CHAIN_ID,
        networkType: EVM_WALLET_TYPE,
        contractAddress: NFT_HOLDER_CONTRACT_ADDRESS,
      });

      if (createMetaverseRes.status !== 1) {
        throw Error('Internal server error');
      }

      const metaverseId = createMetaverseRes.data.metaverse.id;
      console.log('metaverseId', metaverseId);
      console.log('address', nftItem.address);


      if (!metaverseId) {
        throw Error('Internal server error');
      }

      // Interact with smart contract
      await rockServInstance.initNFTHolderMetaverse(
        NFT_HOLDER_CONTRACT_ADDRESS,
        metaverseId,
        {
          collAddr: nftItem.address,
          coreTeamAddr: "0x0000000000000000000000000000000000000000",
          price: 0,
          rockIndexFrom: 2,
          rockIndexTo: 101,
          typeZone: 2,
          zoneIndex: 2
        },
        "0",
        0,
        'RockNFTCollectionHolder'
      );

      await delay(5);

      const rockResponse = await getRocks('628de5c456e9cd13f5f1a70f', undefined, undefined, undefined, 1);
      const firstRock = rockResponse?.data?.rocks?.[0];
      console.log(firstRock.id);

      await rockServInstance.setCustomTokenUri(
        NFT_HOLDER_CONTRACT_ADDRESS,
        transformMetaverseIdToTokenID(metaverseId),
        `https://rove.to/api/v1/rock/${firstRock.id}/metadata`,
        0,
        'RockNFTCollectionHolder'
      );

      // Log success data
      const logContent = `Added metaverse: ${metaverseId} - ${nftItem.name} - ${nftItem.address} \r\n`;
      fs.writeFileSync('./logs/log.txt', logContent, { flag: 'a+' });
    } catch (error: any) {
      // Log error
      fs.writeFileSync('./logs/error.txt', error.toString(), { flag: 'a+' });
      console.log(error);
    }
  }
}

seedTrendingMetaverses([
  {
    name: 'test',
    address: '0x2953399124f0cbb46d2cbacd8a89cf0599974963'
  }
])
