import { createPublicClient, http, parseAbi } from 'viem';
const client = createPublicClient({ transport: http('https://polygon-bor-rpc.publicnode.com') });
const literaAddress = '0x753b9F10ACF325310323C86b8BdD1C5A1C00691c';
const writerAddress = '0xb14f5A7aB55e8C7687607bC39776fa97e983D934';
const abi = parseAbi([
  'function _writerAddress() view returns (address)',
  'function writerContract() view returns (address)'
]);

async function main() {
  try {
    const p1 = await client.readContract({ address: literaAddress, abi, functionName: '_writerAddress' });
    console.log("_writerAddress:", p1);
  } catch(e) { console.log("_writerAddress fail"); }

  try {
    const p2 = await client.readContract({ address: literaAddress, abi, functionName: 'writerContract' });
    console.log("writerContract:", p2);
  } catch(e) { console.log("writerContract fail"); }
}
main();
