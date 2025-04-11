const { encodeSqrtRatioX96, nearestUsableTick, NonfungiblePositionManager, Position, Pool } = require("@uniswap/v3-sdk");
const { ethers } = require("ethers");
const { UNISWAP_FACTOR_ABI, UNISWAP_V3_POOL_ABI } = require("./abi.js");
const { Percent, Token } = require("@uniswap/sdk-core");
const ERC20_ABI = require("../artifacts/contracts/Token.sol/Token.json").abi;
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = 5000;

app.use(express.json());
app.use(cors());

const token1Info = {
  celo: {
    NonfungiblePositionManager: "0x0eC9d3C06Bc0A472A80085244d897bb604548824",
    UniswapV3Factory: "0x229Fd76DA9062C1a10eb4193768E192bdEA99572"
  },
  arbSepolia: {
    NonfungiblePositionManager: "0x6b2937Bde17889EDCf8fbD8dE31C3C2a70Bc4d65",
    UniswapV3Factory: "0x248AB79Bbb9bC29bB72f7Cd42F17e054Fc40188e"
  }
};

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Encode sqrt price for pool init
function encodePriceSqrt(token1Price, token0Price) {
  return encodeSqrtRatioX96(token1Price, token0Price);
}

async function getPoolState(poolContract) {
  const liquidity = await poolContract.liquidity();
  const slot = await poolContract.slot0();
  return {
    liquidity,
    sqrtPriceX96: slot[0],
    tick: slot[1],
    observationIndex: slot[2],
    observationCardinality: slot[3],
    observationCardinalityNext: slot[4],
    feeProtocol: slot[5],
    unlocked: slot[6],
  };
}

async function mintAndApprove(amount0, amount1, token0Address, token1Address, npmca, nonce) {
  const token0 = new ethers.Contract(token0Address, ERC20_ABI, signer);
  const token1 = new ethers.Contract(token1Address, ERC20_ABI, signer);

  const bal0 = await token0.balanceOf(signer.address);
  const bal1 = await token1.balanceOf(signer.address);
  const allow0 = await token0.allowance(signer.address, npmca);
  const allow1 = await token1.allowance(signer.address, npmca);
  console.log("Token0 Balance:", bal0.toString(), "Allowance:", allow0.toString());
  console.log("Token1 Balance:", bal1.toString(), "Allowance:", allow1.toString());

  const tx1 = await token0.approve(npmca, amount0, { nonce: nonce++ });
  await tx1.wait();

  const tx2 = await token1.approve(npmca, amount1, { nonce: nonce++ });
  await tx2.wait();

  return nonce;
}

async function createPool(uniswapFactoryContract, token0Address, token1Address, fee, nonce) {
  console.log("Creating pool...");
  const tx = await uniswapFactoryContract.createPool(token0Address, token1Address, fee, {
    gasLimit: 10000000,
    nonce: nonce++
  });
  await tx.wait();
  const poolAddress = await uniswapFactoryContract.getPool(token0Address, token1Address, fee);
  return { poolAddress, nonce };
}

async function initializePool(poolAddress, price, nonce) {
  console.log("Initializing pool...");
  const poolContract = new ethers.Contract(poolAddress, UNISWAP_V3_POOL_ABI, signer);
  const tx = await poolContract.initialize(price.toString(), {
    gasLimit: 3000000,
    nonce: nonce++
  });
  await tx.wait();
  console.log("Pool initialized successfully.");
  return nonce;
}

async function addLiquidityToPool(poolAddress, chainId, token0Address, token1Address, token0Decimals, token1Decimals, rawAmount0, rawAmount1, fee, npmca, nonce) {
  const amount0 = ethers.utils.parseUnits(rawAmount0.toString(), token0Decimals);
  const amount1 = ethers.utils.parseUnits(rawAmount1.toString(), token1Decimals);

  const poolContract = new ethers.Contract(poolAddress, UNISWAP_V3_POOL_ABI, signer);
  const state = await getPoolState(poolContract);

  const Token0 = new Token(chainId, token0Address, token0Decimals);
  const Token1 = new Token(chainId, token1Address, token1Decimals);

  const pool = new Pool(
    Token0,
    Token1,
    fee,
    state.sqrtPriceX96.toString(),
    state.liquidity.toString(),
    state.tick
  );

  const tickLower = nearestUsableTick(pool.tickCurrent, pool.tickSpacing) - pool.tickSpacing * 2;
  const tickUpper = nearestUsableTick(pool.tickCurrent, pool.tickSpacing) + pool.tickSpacing * 2;
  console.log("Tick range:", tickLower, "to", tickUpper);

  const position = Position.fromAmounts({
    pool,
    tickLower,
    tickUpper,
    amount0: amount0.toString(),
    amount1: amount1.toString(),
    useFullPrecision: true,
  });

  const mintOptions = {
    recipient: signer.address,
    deadline: Math.floor(Date.now() / 1000) + 60 * 20,
    slippageTolerance: new Percent(50, 10_000),
  };

  const { calldata, value } = NonfungiblePositionManager.addCallParameters(position, mintOptions);

  const tx = await signer.sendTransaction({
    data: calldata,
    to: npmca,
    value,
    from: signer.address,
    gasLimit: 10000000,
    nonce: nonce++
  });

  const receipt = await tx.wait();
  console.log("Liquidity add tx receipt:", receipt.transactionHash);

  // Confirm NFT minted
  const iface = new ethers.utils.Interface([
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
  ]);

  const logs = receipt.logs.map(log => {
    try {
      return iface.parseLog(log);
    } catch {
      return null;
    }
  }).filter(Boolean);

  if (logs.length === 0) {
    console.warn("⚠️ No NFT position minted! Something might be wrong.");
  } else {
    console.log("✅ NFT minted with tokenId:", logs[0].args.tokenId.toString());
  }

  const newLiquidity = await poolContract.liquidity();
  console.log("Pool liquidity after add:", newLiquidity.toString());

  return { receipt, nonce };
}

// Endpoint
app.post("/setup-uniswap", async (req, res) => {
  try {
    const {
      token0Address,
      token1Address,
      token0Decimals,
      token1Decimals,
      token0Amount,
      token1Amount,
      fee,
      chain,
      token0Price,
      token1Price,
      chainId
    } = req.body;

    const { NonfungiblePositionManager: npmca, UniswapV3Factory } = token1Info[chain];
    let nonce = await provider.getTransactionCount(signer.address, "latest");

    // Convert amounts first
    const parsedAmount0 = ethers.utils.parseUnits(token0Amount.toString(), token0Decimals);
    const parsedAmount1 = ethers.utils.parseUnits(token1Amount.toString(), token1Decimals);

    nonce = await mintAndApprove(parsedAmount0, parsedAmount1, token0Address, token1Address, npmca, nonce);

    const factoryContract = new ethers.Contract(UniswapV3Factory, UNISWAP_FACTOR_ABI, signer);
    let poolAddress = await factoryContract.getPool(token0Address, token1Address, fee);

    if (poolAddress === ethers.constants.AddressZero) {
      const result = await createPool(factoryContract, token0Address, token1Address, fee, nonce);
      poolAddress = result.poolAddress;
      nonce = result.nonce;

      const sqrtPrice = encodePriceSqrt(token1Price, token0Price);
      nonce = await initializePool(poolAddress, sqrtPrice, nonce);
    } else {
      console.log("Pool already exists:", poolAddress);
    }

    const result = await addLiquidityToPool(
      poolAddress,
      chainId,
      token0Address,
      token1Address,
      token0Decimals,
      token1Decimals,
      token0Amount,
      token1Amount,
      fee,
      npmca,
      nonce
    );

    res.json({ success: true, poolAddress });
  } catch (error) {
    console.error("Error in setup-uniswap:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
