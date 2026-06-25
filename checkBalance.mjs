import { createPublicClient, http, parseAbi } from 'viem';

const client = createPublicClient({
  transport: http('https://polygon-bor-rpc.publicnode.com')
});

const tokenAddress = '0x8D8d650Cd85eD72993Fc7ea03476FDa04a1bBD2C';
const abi = parseAbi(['function balanceOf(address) view returns (uint256)']);

async function main() {
  const account = '0x61e9762df403567e33b8e31666d9c9a061e24385';
  const balance = await client.readContract({ address: tokenAddress, abi, functionName: 'balanceOf', args: [account] });
  console.log("User LITE Balance:", balance);
  
  const writerBalance = await client.readContract({ address: tokenAddress, abi, functionName: 'balanceOf', args: ['0xb14f5A7aB55e8C7687607bC39776fa97e983D934'] });
  console.log("Writer Contract LITE Balance:", writerBalance);
}
main();
