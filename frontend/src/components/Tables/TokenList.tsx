import React, { useState } from "react";
import Image from "next/image";
import { TOKEN } from "@/types/token";
import { formatNumber, formatSlug } from "@/utils/common";

const popOut = (
  <Image
    src={"/images/icon/popout.svg"}
    alt="info icon"
    width={10}
    height={10}
  />
);
const blockscoutLogo = (
  <Image
    src={"/images/icon/blockscoutlogo.svg"}
    alt="blockscout logo"
    width={20}
    height={20}
  />
);
// Utility function to escape symbols like "$"
const escapeSymbol = (symbol: string) => {
  return symbol ? symbol.replace("$", "") : "";
};

type TokenListProps = {
  filteredTokens: TOKEN[];
  address: string;
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
const explorerUrls: Record<SupportedChains, string> = {
  [SupportedChains.ETH]: "https://eth.blockscout.com/address",
  [SupportedChains.MANTLE]: "https://explorer.mantle.xyz/",
  [SupportedChains.ARB]: "https://arbitrum.blockscout.com/",
  [SupportedChains.SCROLL]: "https://l1sload-blockscout.scroll.io/",
  [SupportedChains.BASE]: "https:/base.blockscout.com/",
  [SupportedChains.OPTIMISM]: "https:/optimism.blockscout.com/",
};

const getChildren = (tokenId: string) => {
  const childrenData = [
    {
      chain: SupportedChains.ARB,
      circulatingSupply: 250000,
      price: 1.3,
      pairAddress: "0x1234567890",
      liquidity: 1000000,
    },
    {
      chain: SupportedChains.MANTLE,
      circulatingSupply: 250000,
      price: 1.3,
      pairAddress: "0x1234567890",
      liquidity: 1000000,
    },
    {
      chain: SupportedChains.BASE,
      circulatingSupply: 250000,
      price: 1.3,
      pairAddress: "0x8470820830",
      liquidity: 1000000,
    },
    {
      chain: SupportedChains.ETH,
      circulatingSupply: 250000,
      price: 1.3,
      pairAddress: "0x2930020930",
      liquidity: 1000000,
    },
  ];

  return childrenData.map((child, index) => ({
    id: `${tokenId}-child-${index + 1}`,
    chain: child.chain,
    chainLogoUrl: imageUrls[child.chain],
    circulatingSupply: child.circulatingSupply,
    liquidity: child.liquidity,
    price: child.price,
    pairAddress: child.pairAddress,
  }));
};

const TokenList: React.FC<TokenListProps> = ({ filteredTokens, address }) => {
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
          const balance =
            token.token_info.balance / Math.pow(10, token.token_info.decimals);
          const price = token.token_info.price_info
            ? token.token_info.price_info.price_per_token
            : 0;
          const value = price * Number(balance);
          const isExpanded = expandedRow === key;

          // Fetch children for the current token
          const children = getChildren(token.content.metadata.name);

          // Calculate dynamic height based on the number of children
          const expandedHeight = isExpanded ? "calc(100%)" : "auto";

          return (
            <div
              className={`grid grid-cols-3 sm:grid-cols-3 ${
                key === filteredTokens.length - 1
                  ? ""
                  : "border-b border-stroke dark:border-strokedark"
              } cursor-pointer overflow-hidden transition-all duration-300`}
              key={key}
              style={{
                height: expandedHeight,
                backgroundColor: isExpanded ? "#354454" : "transparent",
              }}
              onClick={() => setExpandedRow(isExpanded ? null : key)}
            >
              <div className="flex items-center gap-3 p-2.5 xl:p-5">
                <div className="flex-shrink-0">
                  <Image
                    src={token.content.links.image}
                    alt={token.content.metadata.name}
                    width={48}
                    height={48}
                  />
                </div>
                <p className="hidden text-black dark:text-white sm:block">
                  {name} {symbol ? `(${symbol})` : ""} {}
                  <p className="text-meta-3">${price.toFixed(4)}</p>
                </p>
              </div>

              <div className="flex items-center justify-center p-2.5 xl:p-5">
                <p className="text-black dark:text-white">
                  {formatNumber(balance)} {symbol}
                </p>
              </div>
              <div className="hidden items-center justify-center p-2.5 sm:flex xl:p-5">
                <p className="text-black dark:text-white">
                  ${value.toFixed(2)} / {formatNumber(price * balance)}
                </p>
              </div>

              {isExpanded && (
                <div className="bg-gray-100 dark:bg-gray-800 col-span-4 p-0.5">
                  {children.map((child) => (
                    <div
                      key={child.id}
                      className="grid grid-cols-3 items-center gap-4 border-b p-2 last:border-none dark:border-strokedark"
                    >
                      <div className="justify-left flex items-center gap-2 pl-5">
                        <img
                          src={child.chainLogoUrl}
                          width={20}
                          height={20}
                          className="h-5 w-5 rounded-full object-cover"
                          alt={`${child.chain} logo`}
                        />
                        <p className="text-black dark:text-white">
                          {child.chain}{" "}
                          <a
                            href={`${explorerUrls[child.chain]}/${formatSlug(child.pairAddress)}/${child.pairAddress}`}
                            className="text-center text-black hover:underline dark:text-white"
                          >
                            {`(${child.pairAddress.slice(0, 3)}...${child.pairAddress.slice(-3)})`}
                          </a>
                        </p>
                      </div>
                      <p className="text-center text-black dark:text-white">
                        {formatNumber(child.circulatingSupply)} {symbol}
                      </p>

                      <p className="flex items-center justify-center gap-3 text-center text-black dark:text-white">
                        ${formatNumber(child.liquidity)} / $
                        {formatNumber(child.price * child.circulatingSupply)}
                        <a
                          className="invert"
                          href={`${explorerUrls[child.chain]}/${formatSlug(address)}/(address)}`}
                          target="_blank"
                        >
                          {popOut}
                        </a>
                        {blockscoutLogo}
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
