import { createPublicClient, http, parseAbi } from 'viem';

const client = createPublicClient({ transport: http('https://polygon-bor-rpc.publicnode.com') });

const tokenAddress = '0x8D8d650Cd85eD72993Fc7ea03476FDa04a1bBD2C';
const writerAddress = '0xb14f5A7aB55e8C7687607bC39776fa97e983D934';
const userAddress = '0x61E92388044EDe0fC19C4204A4C6A68d16604385';
const tokenId = 2n;

const abi = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
  'function hasMinted(address,uint256) view returns (bool)',
  'function Mint(uint256,bytes) external'
]);

async function main() {
  console.log("--- START DEEP CHECK ---");
  
  try {
    const bal = await client.readContract({ address: tokenAddress, abi, functionName: 'balanceOf', args: [userAddress] });
    console.log("User LITE Balance:", bal);
  } catch(e) { console.log("Balance fetch error", e); }

  try {
    const allow = await client.readContract({ address: tokenAddress, abi, functionName: 'allowance', args: [userAddress, writerAddress] });
    console.log("User Allowance for Writer:", allow);
  } catch(e) { console.log("Allowance fetch error", e); }

  try {
    const minted = await client.readContract({ address: writerAddress, abi, functionName: 'hasMinted', args: [userAddress, tokenId] });
    console.log("Has user already minted Token 2?", minted);
  } catch(e) { console.log("hasMinted fetch error", e); }

  console.log("\n--- SIMULATING MINT TRANSACTION ---");
  try {
    await client.simulateContract({
      account: userAddress,
      address: writerAddress,
      abi,
      functionName: 'Mint',
      args: [tokenId, '0x']
    });
    console.log("✅ SIMULATION SUCCESSFUL! Transaction should not revert.");
  } catch (e) {
    console.log("❌ SIMULATION REVERTED!");
    console.log("Reason:", e.shortMessage || e.message);
  }
}
main();
