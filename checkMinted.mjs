import { createPublicClient, http, parseAbi } from 'viem';
const client = createPublicClient({ transport: http('https://polygon-bor-rpc.publicnode.com') });
const contractAddress = '0xb14f5A7aB55e8C7687607bC39776fa97e983D934'; // Writer
const abi = parseAbi([
  'function hasMinted(address, uint256) view returns (bool)'
]);

async function main() {
  const account = '0x61E9237DF403567E33b8e31666d9c9a061E24385'; // I can't guess the middle part! 
  // Wait, I can't check without the exact address!
}
main();
