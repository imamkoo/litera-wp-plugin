import { usePublicClient, useChainId } from 'wagmi';
import { parseGwei } from 'viem';

// ----------------------------------------------------
// GAS POLICIES PER CHAIN
// ----------------------------------------------------
// Future-proof policy definition for scalability
interface GasPolicy {
  minGwei?: bigint;
  bufferPercent: bigint;
  fallbackGwei: bigint;
}

const GAS_POLICIES: Record<number, GasPolicy> = {
  // Polygon Amoy (Testnet) - Has strict 25 Gwei minimum
  80002: {
    minGwei: parseGwei('25.5'), // 25.5 Gwei just to be safe above 25
    bufferPercent: BigInt(110),        // 10% buffer
    fallbackGwei: parseGwei('30') // Safe fallback
  },
  // Polygon Mainnet
  137: {
    bufferPercent: BigInt(115),        // 15% buffer
    fallbackGwei: parseGwei('40') // Safe fallback for polygon
  },
  // Ethereum Mainnet
  1: {
    bufferPercent: BigInt(110),
    fallbackGwei: parseGwei('15')
  }
};

const DEFAULT_POLICY = {
  bufferPercent: BigInt(110), // Default 10% buffer
  fallbackGwei: parseGwei('10') // Generic 10 Gwei fallback
};

export const useSafeGas = () => {
  const publicClient = usePublicClient();
  const chainId = useChainId();

  const getSafeGasParams = async () => {
    const policy = GAS_POLICIES[chainId] || DEFAULT_POLICY;

    let maxFeePerGas: bigint | undefined;
    let maxPriorityFeePerGas: bigint | undefined;
    let source = 'estimated';

    try {
      if (!publicClient) throw new Error("PublicClient not available");

      const fees = await publicClient.estimateFeesPerGas();
      maxFeePerGas = fees.maxFeePerGas || BigInt(0);
      maxPriorityFeePerGas = fees.maxPriorityFeePerGas || BigInt(0);

      // 1. Apply Buffer Multiplier
      maxFeePerGas = (maxFeePerGas * policy.bufferPercent) / BigInt(100);
      maxPriorityFeePerGas = (maxPriorityFeePerGas * policy.bufferPercent) / BigInt(100);

      // 2. Enforce Hard Minimums (if any)
      if (policy.minGwei) {
        if (maxFeePerGas < policy.minGwei) {
            maxFeePerGas = policy.minGwei;
            source = 'enforced_minimum';
        }
        if (maxPriorityFeePerGas < policy.minGwei) {
            maxPriorityFeePerGas = policy.minGwei;
        }
      }

    } catch (error) {
      console.warn("[SafeGas] RPC failed to estimate gas. Using failsafe fallback.", error);
      maxFeePerGas = policy.fallbackGwei;
      maxPriorityFeePerGas = policy.fallbackGwei;
      source = 'failsafe_fallback';
    }

    const estimatedAt = new Date().toISOString();

    const params = {
      maxFeePerGas,
      maxPriorityFeePerGas,
      source,
      chainId,
      estimatedAt
    };

    const telemetryData = {
        maxFeeGwei: maxFeePerGas ? (Number(maxFeePerGas) / 1e9).toFixed(2) : "0",
        maxPriorityGwei: maxPriorityFeePerGas ? (Number(maxPriorityFeePerGas) / 1e9).toFixed(2) : "0",
        source,
        chainId,
        estimatedAt
    };

    // Lightweight logging for QA/Observability (can be wrapped in __DEV__ flag later)
    console.info("[SafeGas] Generated Tx Params:", telemetryData);

    // Global Telemetry for Debugging (QA can inspect window.__literaGasDebug)
    if (typeof window !== 'undefined') {
      const win = window as any;
      if (!win.__literaGasDebug) {
        win.__literaGasDebug = [];
      }
      win.__literaGasDebug.push(telemetryData);
    }

    return params;
  };

  return { getSafeGasParams };
};
