import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

// Type definitions
export interface ICreateMetaverseParams {
  name: string;
  alias?: string;
  type?: number;
  description: string;
  publicPrice: number;
  publicSupply: number;
  coreTeamWalletAddress: string;
  coreTeamSupply: number;
  collectionWalletAddress: string;
  holderSupply: number;
  holderPrice: number;
  logoUrl: string;
  coverUrl: string;
  chainId: string;
  networkType: number;
  contractAddress: string;
}

export interface IResponsePayload {
  data: any;
  status: number;
  message: string;
  error?: string;
}

const headers: any = {
  Authorization: `Bearer ${process.env.ACCESS_TOKEN}`
};

const instance = axios.create({
  baseURL:
    process.env.BE_URL_API || "https://rove-dev.moshwithme.io/api/v1",
  headers,
  timeout: 30000,
});

// Functions
export const createMetaverse = async (
  params: ICreateMetaverseParams
): Promise<IResponsePayload> => {
  try {
    const response = await instance.post<IResponsePayload>(
      '/metaverse/imo',
      params
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return {
      status: 0,
      message: "",
      data: {},
    };
  }
};

export const getRocks = async (
  metaverseId?: string,
  hostId?: string,
  ownerId?: string,
  keyword?: string,
  limit?: number
): Promise<IResponsePayload> => {
  try {
    let url = `/rock/list?limit=${limit || 10000}`;
    if (metaverseId) url += `&metaverseId=${metaverseId}`;
    if (hostId) url += `&hostId=${hostId}`;
    if (ownerId) url += `&ownerId=${ownerId}`;
    if (keyword) url += `&keywords=${keyword}`;
    const response = await instance.get(url);
    return response.data;
  } catch (error) {
    console.log(error);
    return {
      status: 0,
      message: "",
      data: {},
    };
  }
};
