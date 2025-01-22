/* eslint-disable prettier/prettier */
/* eslint-disable camelcase */
/* eslint-disable no-var */
/* eslint-disable prefer-const */
/* eslint-disable prettier/prettier */
const { encodeSqrtRatioX96, nearestUsableTick, NonfungiblePositionManager, Position, Pool } = require("@uniswap/v3-sdk");
const { ethers } = require("ethers");
const { ethers: hreEthers } = require("hardhat");
const { UNISWAP_FACTOR_ABI, UNISWAP_V3_POOL_ABI } = require("./abi.js");
const { Percent, Token } = require("@uniswap/sdk-core");
const ERC20_ABI = require("../artifacts/contracts/Token.sol/Token.json").abi;
require("dotenv").config();

const readline = require('readline');

const token1Info = {
    celo: {
        NonfungiblePositionManager: "0x3d79EdAaBC0EaB6F08ED885C05Fc0B014290D95A",
        UniswapV3Factory: "0xAfE208a311B21f13EF87E33A90049fC17A7acDEc",
        token1Address: ""
    },
};

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

    const token0Address = await askQuestion("Enter the base token address: ");
    const token1Address = await askQuestion("Enter the collateral token address: ");
    const fee = parseFloat(await askQuestion("Enter the pool fee among these 0.05, 0.3, 1, 0.01 (e.g., 0.05 for 5%): ")) * 1000;
    const basetokenAmount = await askQuestion("Enter the base token amount: ");
    const quoteTokenAmount = await askQuestion("Enter the quote token amount: ");
    const token1Price = parseFloat(await askQuestion("Enter the price of token1 relative to token0 (e.g., 1.5): "));
    const token0Price = parseFloat(await askQuestion("Enter the price of token0 relative to token1 (e.g., 1): "));
    
    rl.close();

    const price = encodePriceSqrt(token1Price, token0Price);

    var token0Decimals = 18;
    var token1Decimals = 18;

    var npmca = token1Info.celo.NonfungiblePositionManager; // NonfungiblePositionManager
    var uniswapFactoryAddress = token1Info.celo.UniswapV3Factory; // UniswapV3Factory
    const amount0 = ethers.utils.parseUnits(basetokenAmount.toString(), 18);
    const amount1 = ethers.utils.parseUnits(quoteTokenAmount.toString(), 18);
    var chainID = 42220;

    const uniswapFactoryContract = await getContract(uniswapFactoryAddress, UNISWAP_FACTOR_ABI);
    const token0 = await getContract(token0Address, ERC20_ABI);
    const token1 = await getContract(token1Address, ERC20_ABI);

    await mintAndApprove(amount0, amount1, token0Address, token1Address, npmca);

    var poolAddress = await uniswapFactoryContract.getPool(token0Address, token1Address, fee);
    var deployer = await hreEthers.getSigner();
    if (poolAddress === '0x0000000000000000000000000000000000000000') {
        poolAddress = await createPool(uniswapFactoryContract, token0Address, token1Address, fee);
        await initializePool(poolAddress, price, deployer);
    }
    console.log("Pool Address:", poolAddress);

    await addLiquidityToPool(poolAddress, deployer, chainID, token0Decimals, token1Decimals, token0, token1, amount0, amount1, fee, npmca);
}

function encodePriceSqrt(token1Price, token0Price) {
    return encodeSqrtRatioX96(token1Price, token0Price);
}

async function getPoolState(poolContract) {
    const liquidity = await poolContract.liquidity();
    const slot = await poolContract.slot0();

    const PoolState = {
        liquidity,
        sqrtPriceX96: slot[0],
        tick: slot[1],
        observationIndex: slot[2],
        observationCardinality: slot[3],
        observationCardinalityNext: slot[4],
        feeProtocol: slot[5],
        unlocked: slot[6],
    };

    return PoolState;
}

async function getContract(address, abi) {
    var deployer = await hreEthers.getSigner();
    let contract = new ethers.Contract(address, abi, deployer);
    return contract;
}

async function mintAndApprove(amount0, amount1, token0Address, token1Address, npmca) {
    var deployer = await hreEthers.getSigner();
    var token0 = new ethers.Contract(token0Address, ERC20_ABI, deployer);
    var token1 = new ethers.Contract(token1Address, ERC20_ABI, deployer);

    await token0.approve(npmca, amount0);
    await token1.approve(npmca, amount1);
}

async function createPool(uniswapFactoryContract, token1Address, token2Address, fee) {
    var txs = await uniswapFactoryContract.createPool(
        token1Address.toLowerCase(),
        token2Address.toLowerCase(),
        fee,
        { gasLimit: 10000000 }
    );
    await txs.wait();

    const poolAdd = await uniswapFactoryContract.getPool(token1Address, token2Address, fee, {
        gasLimit: 3000000,
    });
    return poolAdd;
}

async function initializePool(poolAdd, price, signer) {
    const poolContract = new ethers.Contract(poolAdd, UNISWAP_V3_POOL_ABI, signer);
    var txs = await poolContract.initialize(price.toString(), {
        gasLimit: 3000000,
    });
    await txs.wait();
}

async function addLiquidityToPool(
    poolAdd,
    deployer,
    chainId,
    Token1_decimals,
    Token2_decimals,
    token_contract1,
    token_contract2,
    amount0,
    amount1,
    fee,
    npmca
) {
    const poolContract = new ethers.Contract(poolAdd, UNISWAP_V3_POOL_ABI, deployer);
    var state = await getPoolState(poolContract);

    const Token1 = new Token(chainId, token_contract1.address, Token1_decimals);
    const Token2 = new Token(chainId, token_contract2.address, Token2_decimals);

    const configuredPool = new Pool(
        Token1,
        Token2,
        fee,
        state.sqrtPriceX96.toString(),
        state.liquidity.toString(),
        state.tick
    );

    const position = Position.fromAmounts({
        pool: configuredPool,
        tickLower: nearestUsableTick(configuredPool.tickCurrent, configuredPool.tickSpacing) -
        configuredPool.tickSpacing * 2,
        tickUpper: nearestUsableTick(configuredPool.tickCurrent, configuredPool.tickSpacing) +
        configuredPool.tickSpacing * 2,
        amount0: amount0.toString(),
        amount1: amount1.toString(),
        useFullPrecision: false,
    });

    const mintOptions = {
        recipient: deployer.address,
        deadline: Math.floor(Date.now() / 1000) + 60 * 20,
        slippageTolerance: new Percent(50, 10_000),
    };

    const { calldata, value } = NonfungiblePositionManager.addCallParameters(position, mintOptions);

    const transaction = {
        data: calldata,
        to: npmca,
        value: value,
        from: deployer.address,
        gasLimit: 10000000,
    };

    const txRes = await deployer.sendTransaction(transaction);
    await txRes.wait();
}

main().catch(console.log);
