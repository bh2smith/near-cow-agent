export const zerionKey = process.env.ZERION_API_KEY;

if (!zerionKey) {
  throw new Error("ZERION_API_KEY is not set!");
}

export const safeSaltNonce = process.env.SAFE_SALT_NONCE;
if (!safeSaltNonce) {
  throw new Error("SAFE_SALT_NONCE is not set");
}
