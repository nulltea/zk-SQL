export interface LocalAccountInstance {
  address: string;
  balance: string;
  nonce: number;
}

export interface Login {
  callbackRoute?: string;
  token?: string;
}
