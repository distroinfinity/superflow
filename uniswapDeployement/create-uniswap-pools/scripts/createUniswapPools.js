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
// require("dotenv").config();

const token1Info = {
    arbitrumsepolia : {
        NonfungiblePositionManager: "0x6b2937Bde17889EDCf8fbD8dE31C3C2a70Bc4d65",
        UniswapV3Factory: "0x248AB79Bbb9bC29bB72f7Cd42F17e054Fc40188e",
        token1Address: "0xFE8348081Fe38B20ECd971c708a8471F4Dc88D09"
    },
    basesepolia: {
        NonfungiblePositionManager: "0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2",
        UniswapV3Factory: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24",
        token1Address:"0x65AC665a2E700A7D53ec16c864D92cebb8926635"
    },
    optimismsepolia: {
        NonfungiblePositionManager: "0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2",
        UniswapV3Factory: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24",
        token1Address: "0x65AC665a2E700A7D53ec16c864D92cebb8926635"
    },
    alfajores: {
        NonfungiblePositionManager: "",
        UniswapV3Factory: "",
        token1Address: ""
    },
}

async function main() {
    var token0Address = process.env.BASETOKEN; // tge token
    var token1Address = token1Info[process.env.CHAIN_NAME].token1Address; // collateral token TODO: MANU
    // (0.05, 0.3, 1, 0.01)
    var fee = (process.env.POOL_FEE) * 1000;
    var token0Decimals = 18;
    var token1Decimals = 18;

    var price = encodePriceSqrt(1, 1);
    // TODO : MANU
    var npmca = token1Info[process.env.CHAIN_NAME].NonfungiblePositionManager;             // NonfungiblePositionManager
    var uniswapFactoryAddress = token1Info[process.env.CHAIN_NAME].UniswapV3Factory;       // UniswapV3Factory
    var amount0 = ethers.utils.parseUnits(process.env.BASETOKEN_AMOUNT.toString(), 18);
    var amount1 = ethers.utils.parseUnits(process.env.QUOTE_TOKEN_AMOUNT.toString(), 18);
    var chainID = Number(process.env.CHAINID)

    // console.log("Started");
    const uniswapFactoryContract = await getContract(uniswapFactoryAddress, UNISWAP_FACTOR_ABI);
    const token0 = await getContract(token0Address, ERC20_ABI);
    const token1 = await getContract(token1Address, ERC20_ABI);

    await mintAndApprove(amount0, amount1, token0Address, token1Address, npmca);

    var poolAddress = await uniswapFactoryContract.getPool(token0Address, token1Address, fee);
    console.log(poolAddress);
    var deployer = await hreEthers.getSigner();
    if (poolAddress === '0x0000000000000000000000000000000000000000') {
        // console.log("Creating pool");
        poolAddress = await createPool(uniswapFactoryContract, token0Address, token1Address, fee);

        await initializePool(poolAddress, price, deployer);
    }
    await addLiquidityToPool(poolAddress, deployer, chainID, token0Decimals, token1Decimals, token0, token1, amount0, amount1, fee, npmca);
    // console.log("Added liquidity");

    // console.log("Creating pool done");
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

    // await token0.mint(amount0);
    // await token1.mint(amount1);

    await token0.approve(npmca, amount0);

    await token1.approve(npmca, amount1);
}

async function createPool(uniswapFactory_contract, token1Address, token2Address, fee) {
    var txs;
    txs = await uniswapFactory_contract.createPool(
        token1Address.toLowerCase(),
        token2Address.toLowerCase(),
        fee,
        {
            gasLimit: 10000000,
        }
    );
    await txs.wait();

    const poolAdd = await uniswapFactory_contract.getPool(token1Address, token2Address, fee, {
        gasLimit: 3000000,
    });
    // console.log('Pool address', poolAdd);
    return poolAdd;
}

async function initializePool(poolAdd, price, signer) {
    const poolContract = new ethers.Contract(poolAdd, UNISWAP_V3_POOL_ABI, signer);

    var txs = await poolContract.initialize(price.toString(), {
        gasLimit: 3000000,
    });
    await txs.wait();
    // console.log('Pool Initialized');
}

async function addLiquidityToPool(
    poolAdd,
    deployer,
    chainId,
    Token1_decimals,
    Token2_decimals,
    token_contract1,
    token_contract2,
    amount0, amount1,
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
        tickLower:
            nearestUsableTick(configuredPool.tickCurrent, configuredPool.tickSpacing) -
            configuredPool.tickSpacing * 2,
        tickUpper:
            nearestUsableTick(configuredPool.tickCurrent, configuredPool.tickSpacing) +
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
        gasLimit: 10000000
    };
    // console.log('Transacting');
    const txRes = await deployer.sendTransaction(transaction);
    await txRes.wait();
    // console.log('Added liquidity');
}

main().catch(console.log);