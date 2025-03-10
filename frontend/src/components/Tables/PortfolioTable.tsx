import { TOKEN } from "@/types/token";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import TokenList from "./TokenList";

const PortfolioTable = () => {
  const { isConnected } = useAccount();
  const address = "CUY2VmyW7hG7wumtJdAfuFHht3AD96srQMcDHNhsqznc";
  const [tokens, setTokens] = useState<TOKEN[] | []>([]);
  const [networth, setNetworth] = useState<number>(0);
  const [hideRugs, setHideRugs] = useState(true);
  const hostUrl = process.env.NEXT_PUBLIC_HOST_URL;
  const [expandedRow, setExpandedRow] = useState(null);

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
            <div className="grid grid-cols-3 rounded-sm bg-gray-2 dark:bg-meta-4 sm:grid-cols-3">
              <div className="p-2.5 xl:p-5">
                <h5 className="text-sm font-medium uppercase xsm:text-base">
                  Token
                </h5>
              </div>
              <div className="p-2.5 text-center xl:p-5">
                <h5 className="text-sm font-medium uppercase xsm:text-base">
                  Supply
                </h5>
              </div>
              <div className="hidden p-2.5 text-center sm:block xl:p-5">
                <h5 className="text-sm font-medium uppercase xsm:text-base">
                  Liquidity / Mc
                </h5>
              </div>
            </div>

            <TokenList filteredTokens={filteredTokens} address={address} />
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
