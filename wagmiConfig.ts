import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrum, base, mainnet, optimism, polygon } from 'viem/chains';

export const wagmiConfig = getDefaultConfig({
    appName: 'Eth Bangkok',
    projectId: 'b1e7cb52f9096d683fc1ed66e74c3e48',
    chains: [mainnet, polygon, optimism, arbitrum, base],
    ssr: false,
});