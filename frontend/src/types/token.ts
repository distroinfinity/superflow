export type TOKEN = {
  interface: "FungibleToken";
  id: string;
  content: {
    $schema: string;
    json_uri: string;
    files: {
      uri: string;
      cdn_uri: string;
      mime: string;
    }[];
    metadata: {
      description: string;
      name: string;
      symbol: string;
      token_standard: string;
    };
    links: {
      image: string;
    };
  };
  authorities: {
    address: string;
    scopes: string[];
  }[];
  compression: {
    eligible: boolean;
    compressed: boolean;
    data_hash: string;
    creator_hash: string;
    asset_hash: string;
    tree: string;
    seq: number;
    leaf_id: number;
  };
  grouping: any[]; // Replace `any` with the specific type if known
  royalty: {
    royalty_model: string;
    target: string | null;
    percent: number;
    basis_points: number;
    primary_sale_happened: boolean;
    locked: boolean;
  };
  creators: any[]; // Replace `any` with the specific type if known
  ownership: {
    frozen: boolean;
    delegated: boolean;
    delegate: string | null;
    ownership_model: string;
    owner: string;
  };
  supply: number | null;
  mutable: boolean;
  burnt: boolean;
  token_info: {
    symbol: string;
    balance: number;
    supply: number;
    decimals: number;
    token_program: string;
    associated_token_address: string;
    price_info: {
      price_per_token: number;
      total_price: number;
      currency: string;
    };
  };
};
