import { createPublicClient, http, parseAbi } from 'viem';

const client = createPublicClient({
  transport: http('https://polygon-bor-rpc.publicnode.com')
});

const contractAddress = '0xb14f5A7aB55e8C7687607bC39776fa97e983D934'; // Writer
const abi = parseAbi([
  'function Mint(uint256 tokenId, bytes memory _data) external',
  'function articleInfo(uint256) view returns (uint256 idnft, address publisher, string externalURI, bool fee, address creator, uint256 price, uint256 _MaxMinted, uint256 _Minted, string _Info, string _CID, uint256 userReward, uint256 creatorMintReward, uint256 creatorApproveReward, uint256 rewardPoolBalance)'
]);

async function main() {
  const account = '0x61e9762df403567e33b8e31666d9c9a061e24385';
  
  // Try querying token ID 2 since user mentioned it
  try {
    const info = await client.readContract({ address: contractAddress, abi, functionName: 'articleInfo', args: [BigInt(2)] });
    console.log("Token ID 2 info:", info);
    
    // Attempt simulate
    const { request } = await client.simulateContract({
      account,
      address: contractAddress,
      abi,
      functionName: 'Mint',
      args: [BigInt(2), '0x']
    });
    console.log("Simulation SUCCESS!");
  } catch(e) {
    console.log("Simulation FAILED!");
    console.error(e.shortMessage || e.message);
  }
}
main();
