import axios from 'axios';

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
  Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2MjE1OTg2OTk2ZDBmMGExOTIyMTJmYjciLCJpYXQiOjE2NTMyOTQyOTcsImV4cCI6MTY1NTg4NjI5N30.fJhjndEDbrPJ0dXB92Kx-6RyDaCvLsXm_RFYsIFaQZ0`
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
