import { createPublicClient, http, parseAbi } from 'viem';

const client = createPublicClient({ transport: http('https://polygon-bor-rpc.publicnode.com') });

const tokenAddress = '0x8D8d650Cd85eD72993Fc7ea03476FDa04a1bBD2C';
const writerAddress = '0xb14f5A7aB55e8C7687607bC39776fa97e983D934';
const abi = parseAbi(['function allowance(address,address) view returns (uint256)']);

async function main() {
  // We need the exact address. From the screenshot: 0x61E92...04385
  // I will try to guess the missing chars if I can, but I can't.
  // Wait, I can't check allowance without the exact address.
}
main();
