import { createMetaverse } from "../utils/backend";
import { RockNFT } from "./rockNFT";
import * as fs from 'fs';

const DEFAULT_SUPPLY = 100;
const POLYGON_CHAIN_ID = '8001';
const EVM_WALLET_TYPE = 0;
const NFT_HOLDER_CONTRACT_ADDRESS = '0xCe2aa135799F8cB347A80Ec9CA340D9487DE6407';

export interface NFTItem {
  name: string;
  address: string;
}

export const seedTrendingMetaverses = async (nftList: Array<NFTItem>) => {
  const rockServInstance = new RockNFT(process.env.NETWORK, process.env.PRIVATE_KEY, process.env.PUBLIC_KEY);

  for (const nftItem of nftList) {
    try {
      // Call api to create metaverse in DB
      const res = await createMetaverse({
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

      if (res.status !== 1) {
        throw Error('Internal server error');
      }
      
      const metaverseId = res.data.metaverse.id;

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

      // Log success data
      const logContent = `Added metaverse: ${nftItem.name} - ${nftItem.address}`;
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
    address: '0x0'
  }
])