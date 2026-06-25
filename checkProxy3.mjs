import { createPublicClient, http, parseAbi } from 'viem';
const client = createPublicClient({ transport: http('https://polygon-bor-rpc.publicnode.com') });
const literaAddress = '0x753b9F10ACF325310323C86b8BdD1C5A1C00691c';
const writerAddress = '0xb14f5A7aB55e8C7687607bC39776fa97e983D934';
const abi = parseAbi([
  'function proxyOwner() view returns (address)'
]);

async function main() {
  try {
    const p1 = await client.readContract({ address: literaAddress, abi, functionName: 'proxyOwner' });
    console.log("Current ProxyOwner in Litera.sol:", p1);
    console.log("Expected Writer.sol:", writerAddress);
    console.log("Match?", p1.toLowerCase() === writerAddress.toLowerCase());
  } catch(e) { console.log("proxyOwner fail", e); }
}
main();
