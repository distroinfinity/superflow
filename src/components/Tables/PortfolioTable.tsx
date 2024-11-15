import { TOKEN } from "@/types/token";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

const escapeSymbol = (symbol: string) => {
  return symbol ? symbol.replace("$", "") : "";
};

const PortfolioTable = () => {
  const { isConnected } = useAccount()
  const address = "CUY2VmyW7hG7wumtJdAfuFHht3AD96srQMcDHNhsqznc"
  const [tokens, setTokens] = useState<TOKEN[] | []>([]);
  const [networth, setNetworth] = useState<number>(0);
  const [hideRugs, setHideRugs] = useState(true);
  const hostUrl = process.env.NEXT_PUBLIC_HOST_URL;

  useEffect(() => {
    if (address) {
      const fetchTokens = async (page = 1, limit = 1000) => {
        try {
          const response = await fetch(
            `${hostUrl}/api/wallet?address=${address}&page=${page}&limit=${limit}`,
          );
          const { data } = await response.json();
          if (data && data.items) {
            setTokens(data.items);
          } else {
            console.error("No items found in the response");
            setTokens([]);
          }
        } catch (error) {
          console.error("Error fetching tokens:", error);
          setTokens([]);
        }
      };
      fetchTokens();
    }
  }, [address]);
  useEffect(() => {
    const calculateNetWorth = async () => {
      const total = tokens.reduce((acc, token) => {
        const balance =
          token.token_info.balance / Math.pow(10, token.token_info.decimals);
        const price = token.token_info.price_info
          ? token.token_info.price_info.price_per_token
          : 0;
        return acc + balance * price;
      }, 0);
      setNetworth(total);
    };

    calculateNetWorth();
  }, [tokens]);
  const filteredTokens = hideRugs
    ? tokens.filter(
        (item: TOKEN) =>
          item.token_info.price_info &&
          (item.token_info.price_info.price_per_token *
            item.token_info.balance) /
            Math.pow(10, item.token_info.decimals) >
            5,
      )
    : tokens;

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      {isConnected ? (
        <>
          <div className="mb-6 flex items-center justify-between">
            <h4 className="text-xl font-semibold text-black dark:text-white">
              Overview
            </h4>

            <h3 className="text-lg text-black dark:text-white">
              Net Value : ${networth.toFixed(2)}
            </h3>

          </div>

          <div className="flex flex-col">
            <div className="grid grid-cols-3 rounded-sm bg-gray-2 dark:bg-meta-4 sm:grid-cols-4">
              <div className="p-2.5 xl:p-5">
                <h5 className="text-sm font-medium uppercase xsm:text-base">
                  Token
                </h5>
              </div>
              <div className="p-2.5 text-center xl:p-5">
                <h5 className="text-sm font-medium uppercase xsm:text-base">
                  Holding
                </h5>
              </div>
              <div className="p-2.5 text-center xl:p-5">
                <h5 className="text-sm font-medium uppercase xsm:text-base">
                  Price
                </h5>
              </div>
              <div className="hidden p-2.5 text-center sm:block xl:p-5">
                <h5 className="text-sm font-medium uppercase xsm:text-base">
                  Value
                </h5>
              </div>
            </div>

            {filteredTokens
              .sort((a, b) => {
                const aValue =
                  (a.token_info.price_info.price_per_token *
                    a.token_info.balance) /
                  Math.pow(10, a.token_info.decimals);
                const bValue =
                  (b.token_info.price_info.price_per_token *
                    b.token_info.balance) /
                  Math.pow(10, b.token_info.decimals);
                return bValue - aValue;
              })
              .map((token, key) => {
                const name = token.content.metadata.name;
                const symbol = escapeSymbol(token.token_info.symbol);
                const balance = (
                  token.token_info.balance /
                  Math.pow(10, token.token_info.decimals)
                ).toFixed(0);
                const price = token.token_info.price_info
                  ? token.token_info.price_info.price_per_token
                  : 0;
                const value = price * Number(balance);
                return (
                  <div
                    className={`grid grid-cols-3 sm:grid-cols-4 ${
                      key === filteredTokens.length - 1
                        ? ""
                        : "border-b border-stroke dark:border-strokedark"
                    }`}
                    key={key}
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
                  </div>
                );
              })}
          </div>
        </>
      ) : (
        <div className="flex h-100 w-full items-center justify-center">
          <h4 className="text-xl text-black dark:text-white">
            Connect wallet to proceed
          </h4>
        </div>
      )}
    </div>
  );
};

export default PortfolioTable;
