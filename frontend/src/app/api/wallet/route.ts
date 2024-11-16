import { NextResponse } from "next/server";

const apiUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
if (!apiUrl) {
  throw new Error("Missing environment variable NEXT_PUBLIC_SOLANA_RPC_URL");
}

const getAssetsByOwner = async (
  address: string,
  page: number,
  limit: number,
) => {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "my-id",
      method: "searchAssets",
      params: {
        tokenType: "fungible",
        ownerAddress: address,
        page: page || 1,
        limit: limit || 50,
      },
    }),
  });
  const { result } = await response.json();
  return result;
};

export async function GET(request: any) {
  try {
    const { searchParams } = request.nextUrl;
    const address = searchParams.get("address");
    const page = parseInt(searchParams.get("page"));
    const limit = parseInt(searchParams.get("limit"));
    const required = [address, page, limit];
    if (required.some((param) => !param)) {
      throw new Error("Missing required parameters");
    }
    const data = await getAssetsByOwner(address, page, limit);
    return NextResponse.json(
      { message: "Assets fetched successfully", data: data },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error fetching assets:", error);
    return NextResponse.json(
      { message: "Failed to fetch assets", error: error.message },
      { status: 500 },
    );
  }
}
