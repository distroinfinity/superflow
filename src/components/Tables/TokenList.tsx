import React, { useState } from "react";
import Image from "next/image";
import { TOKEN } from "@/types/token";
const infoIcon = (
  <Image src={"/images/logo/info.svg"} alt="info icon" width={30} height={30} />
);
// Utility function to escape symbols like "$"
const escapeSymbol = (symbol: string) => {
  return symbol ? symbol.replace("$", "") : "";
};

type TokenListProps = {
  filteredTokens: TOKEN[];
};
enum SupportedChains {
  ETH = "Ethereum",
  MANTLE = "Mantle",
  ARB = "Arbitrum",
  SCROLL = "Scroll",
  BASE = "Base",
  OPTIMISM = "Optimism",
}
const imageUrls: Record<SupportedChains, string> = {
  [SupportedChains.ETH]:
    "https://assets.coingecko.com/coins/images/279/standard/ethereum.png?1696501628",
  [SupportedChains.MANTLE]:
    "https://assets.coingecko.com/coins/images/30980/standard/token-logo.png?1696529819",
  [SupportedChains.ARB]:
    "https://assets.coingecko.com/coins/images/16547/standard/arb.jpg?1721358242",
  [SupportedChains.SCROLL]:
    "https://assets.coingecko.com/coins/images/50571/standard/scroll.jpg?1728376125",
  [SupportedChains.BASE]:
    "https://assets.coingecko.com/asset_platforms/images/131/standard/base-network.png?1720533039",
  [SupportedChains.OPTIMISM]:
    "https://assets.coingecko.com/coins/images/25244/standard/Optimism.png?1696524385",
};

const getChildren = (tokenId: string) => {
  const childrenData = [
    {
      chain: SupportedChains.ARB,
      circulatingSupply: 1000000,
      liquidity: 1000000,
    },
    {
      chain: SupportedChains.MANTLE,
      circulatingSupply: 1000000,
      liquidity: 1000000,
    },
    {
      chain: SupportedChains.BASE,
      circulatingSupply: 1000000,
      liquidity: 1000000,
    },
    {
      chain: SupportedChains.ETH,
      circulatingSupply: 1000000,
      liquidity: 1000000,
    },
  ];

  // Map through the data to dynamically generate children with index-based IDs
  return childrenData.map((child, index) => ({
    id: `${tokenId}-child-${index + 1}`,
    chain: child.chain,
    chainLogoUrl: imageUrls[child.chain],
    circulatingSupply: child.circulatingSupply,
    liquidity: child.liquidity,
  }));
};

const TokenList: React.FC<TokenListProps> = ({ filteredTokens }) => {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  return (
    <>
      {filteredTokens
        .sort((a, b) => {
          const aValue =
            (a.token_info.price_info.price_per_token * a.token_info.balance) /
            Math.pow(10, a.token_info.decimals);
          const bValue =
            (b.token_info.price_info.price_per_token * b.token_info.balance) /
            Math.pow(10, b.token_info.decimals);
          return bValue - aValue;
        })
        .map((token, key) => {
          const name = token.content.metadata.name;
          const symbol = escapeSymbol(token.token_info.symbol);
          const balance = (
            token.token_info.balance / Math.pow(10, token.token_info.decimals)
          ).toFixed(0);
          const price = token.token_info.price_info
            ? token.token_info.price_info.price_per_token
            : 0;
          const value = price * Number(balance);
          const isExpanded = expandedRow === key;

          // Fetch children for the current token
          const children = getChildren(token.content.metadata.name);
          const childrenCount = children.length;

          // Calculate dynamic height based on the number of children
          const expandedHeight = isExpanded
            ? `calc(100% + ${childrenCount * 50}px)`
            : "auto";

          return (
            <div
              className={`grid grid-cols-3 sm:grid-cols-4 ${
                key === filteredTokens.length - 1
                  ? ""
                  : "border-b border-stroke dark:border-strokedark"
              } cursor-pointer overflow-hidden transition-all duration-300`}
              key={key}
              style={{
                height: expandedHeight,
                backgroundColor: isExpanded ? "#3260a8" : "transparent",
              }}
              onClick={() => setExpandedRow(isExpanded ? null : key)}
            >
              <div className="flex items-center gap-3 p-2.5 xl:p-5">
                <div className="flex-shrink-0">
                  <Image
                    src={token.content.links.image}
                    alt={token.content.metadata.name || "Token Image"}
                    width={48}
                    height={48}
                  />
                </div>
                <p className="hidden text-black dark:text-white sm:block">
                  {name} {symbol ? `(${symbol})` : ""}
                </p>
              </div>

              <div className="flex items-center justify-center p-2.5 xl:p-5">
                <p className="text-black dark:text-white">
                  {balance} {symbol}
                </p>
              </div>

              <div className="flex items-center justify-center p-2.5 xl:p-5">
                <p className="text-meta-3">${price.toFixed(4)}</p>
              </div>

              <div className="hidden items-center justify-center p-2.5 sm:flex xl:p-5">
                <p className="text-black dark:text-white">
                  ${value.toFixed(2)}
                </p>
              </div>

              {/* Expanded Section - Children */}
              {isExpanded && (
                <div className="bg-gray-100 dark:bg-gray-800 col-span-4 p-4">
                  {children.map((child) => (
                    <div
                      key={child.id}
                      className="grid grid-cols-4 items-center gap-4 border-b p-2 last:border-none dark:border-strokedark"
                    >
                      <div className="justify-left flex items-center gap-3">
                        <img
                          src={child.chainLogoUrl}
                          width={20}
                          height={20}
                          className="h-5 w-5 rounded-full object-cover"
                          alt={`${child.chain} logo`}
                        />
                        <p className="text-black dark:text-white">
                          {child.chain}
                        </p>
                      </div>

                      <p className="text-center text-black dark:text-white">
                        {child.circulatingSupply} {symbol}
                      </p>

                      <p className="text-center text-black dark:text-white">
                        1
                      </p>

                      <p className="text-center text-black dark:text-white">
                        ${child.liquidity.toLocaleString()} {infoIcon}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </>
  );
};

export default TokenList;
