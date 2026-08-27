const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BASE = BigInt(ALPHABET.length);

export function encodeBase62(num: bigint): string {
  if (num === 0n) return ALPHABET[0];

  let n = num;
  let result = "";
  while (n > 0n) {
    const remainder = n % BASE;
    result = ALPHABET[Number(remainder)] + result;
    n = n / BASE;
  }
  return result;
}
