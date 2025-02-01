"use client";

import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import React from "react";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "../../../../../wagmiConfig";
import '@rainbow-me/rainbowkit/styles.css';
const queryClient = new QueryClient();

export default function AppWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
