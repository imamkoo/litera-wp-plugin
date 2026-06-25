import { createPublicClient, http, parseAbi } from 'viem';
const client = createPublicClient({ transport: http('https://polygon-bor-rpc.publicnode.com') });
const literaAddress = '0x753b9F10ACF325310323C86b8BdD1C5A1C00691c';
const writerAddress = '0xb14f5A7aB55e8C7687607bC39776fa97e983D934';
const abi = parseAbi([
  'function writerContract() view returns (address)',
  'function adminProxy() view returns (address)',
  'function isApprovedForAll(address,address) view returns (bool)'
]);

async function main() {
  try {
    const proxy = await client.readContract({ address: literaAddress, abi, functionName: 'writerContract' });
    console.log("Writer Proxy:", proxy);
  } catch(e) { console.log("writerContract fail", e.shortMessage); }
  
  try {
    const admin = await client.readContract({ address: literaAddress, abi, functionName: 'adminProxy' });
    console.log("Admin Proxy:", admin);
  } catch(e) { console.log("adminProxy fail", e.shortMessage); }
}
main();
