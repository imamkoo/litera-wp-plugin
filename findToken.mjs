import { createPublicClient, http, parseAbi } from 'viem';
const client = createPublicClient({ transport: http('https://polygon-bor-rpc.publicnode.com') });
const contractAddress = '0xb14f5A7aB55e8C7687607bC39776fa97e983D934';
const abi = parseAbi([
  'function articleInfo(uint256) view returns (uint256 idnft, address publisher, string externalURI, bool fee, address creator, uint256 price, uint256 _MaxMinted, uint256 _Minted, string _Info, string _CID, uint256 userReward, uint256 creatorMintReward, uint256 creatorApproveReward, uint256 rewardPoolBalance)'
]);

async function main() {
  for(let i=1; i<=20; i++) {
    try {
      const info = await client.readContract({ address: contractAddress, abi, functionName: 'articleInfo', args: [BigInt(i)] });
      if (info[0] !== 0n && info[2].includes('mengapa-minimalisme-membawa-kebahagiaan')) {
         console.log("FOUND TOKEN ID:", i, "INFO:", info);
      }
    } catch(e) {}
  }
}
main();
