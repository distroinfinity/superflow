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
        NonfungiblePositionManager: "0x6b2937Bde17889EDCf8fbD8dE31C3C2a70Bc4d65",
        UniswapV3Factory: "0x248AB79Bbb9bC29bB72f7Cd42F17e054Fc40188e"
    },
};

// Function to validate Ethereum addresses
function isValidAddress(address) {
    return ethers.utils.isAddress(address);
}

// Function to validate numeric inputs
function isValidNumber(value, allowFloat = false) {
    if (allowFloat) return !isNaN(parseFloat(value)) && parseFloat(value) > 0;
    return !isNaN(parseInt(value)) && parseInt(value) > 0;
}

// Function to validate fee
function isValidFee(fee) {
    const validFees = [0.05, 0.3, 1, 0.01];
    return validFees.includes(parseFloat(fee));
}

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

    try {
        console.log("Prompting user for input...");

        let token0Address, token1Address, fee, baseTokenAmount, quoteTokenAmount, token1Price, token0Price;

        // Validate base token address
        do {
            token0Address = await askQuestion("Enter the base token address: ");
            if (!isValidAddress(token0Address)) console.log("Invalid Ethereum address. Please enter a valid address.");
        } while (!isValidAddress(token0Address));

        // Validate collateral token address
        do {
            token1Address = await askQuestion("Enter the collateral token address: ");
            if (!isValidAddress(token1Address)) console.log("Invalid Ethereum address. Please enter a valid address.");
        } while (!isValidAddress(token1Address));

        // Validate pool fee
        do {
            fee = parseFloat(await askQuestion("Enter the pool fee among these 0.05, 0.3, 1, 0.01 (e.g., 0.05 for 5%): "));
            if (!isValidFee(fee)) console.log("Invalid fee. Please enter one of: 0.05, 0.3, 1, 0.01");
        } while (!isValidFee(fee));

        fee *= 10000; // Convert fee into proper format

        // Validate base token amount
        do {
            baseTokenAmount = await askQuestion("Enter the base token amount: ");
            if (!isValidNumber(baseTokenAmount)) console.log("Invalid amount. Please enter a positive number.");
        } while (!isValidNumber(baseTokenAmount));

        // Validate quote token amount
        do {
            quoteTokenAmount = await askQuestion("Enter the quote token amount: ");
            if (!isValidNumber(quoteTokenAmount)) console.log("Invalid amount. Please enter a positive number.");
        } while (!isValidNumber(quoteTokenAmount));

        // Validate token1 price
        do {
            token1Price = await askQuestion("Enter the price of token1 relative to token0 (e.g., 1.5): ");
            if (!isValidNumber(token1Price, true)) console.log("Invalid price. Please enter a positive number.");
        } while (!isValidNumber(token1Price, true));

        // Validate token0 price
        do {
            token0Price = await askQuestion("Enter the price of token0 relative to token1 (e.g., 1): ");
            if (!isValidNumber(token0Price, true)) console.log("Invalid price. Please enter a positive number.");
        } while (!isValidNumber(token0Price, true));

        rl.close();

        const price = encodePriceSqrt(token1Price, token0Price);
        const token0Decimals = 18;
        const token1Decimals = 18;

        const npmca = token1Info.celo.NonfungiblePositionManager;
        const uniswapFactoryAddress = token1Info.celo.UniswapV3Factory;
        const amount0 = ethers.utils.parseUnits(baseTokenAmount.toString(), 18);
        const amount1 = ethers.utils.parseUnits(quoteTokenAmount.toString(), 18);

        // Chain ID can be configured
        const chainID = 44787;

        const uniswapFactoryContract = await getContract(uniswapFactoryAddress, UNISWAP_FACTOR_ABI);
        const token0 = await getContract(token0Address, ERC20_ABI);
        const token1 = await getContract(token1Address, ERC20_ABI);

        await mintAndApprove(amount0, amount1, token0Address, token1Address, npmca);

        console.log("Checking for existing pool...");
        let poolAddress = await uniswapFactoryContract.getPool(token0Address, token1Address, fee);
        console.log(`Pool Address Before Creation: ${poolAddress}`);

        const deployer = await hreEthers.getSigner();
        if (poolAddress === ethers.constants.AddressZero) {
            console.log("Pool does not exist. Creating pool...");
            poolAddress = await createPool(uniswapFactoryContract, token0Address, token1Address, fee);
            console.log(`Pool Address After Creation: ${poolAddress}`);
            await initializePool(poolAddress, price, deployer);
        }

        console.log("Adding liquidity to the pool...");
        await addLiquidityToPool(poolAddress, deployer, chainID, token0Decimals, token1Decimals, token0, token1, amount0, amount1, fee, npmca);
        console.log("Liquidity added successfully.");
    } catch (error) {
        console.error("Error occurred during execution:", error.message || error);
    }
}

function encodePriceSqrt(token1Price, token0Price) {
    return encodeSqrtRatioX96(token1Price, token0Price);
}

async function getContract(address, abi) {
    const deployer = await hreEthers.getSigner();
    return new ethers.Contract(address, abi, deployer);
}

async function mintAndApprove(amount0, amount1, token0Address, token1Address, npmca) {
    const deployer = await hreEthers.getSigner();
    const token0 = new ethers.Contract(token0Address, ERC20_ABI, deployer);
    const token1 = new ethers.Contract(token1Address, ERC20_ABI, deployer);

    await token0.approve(npmca, amount0);
    await token1.approve(npmca, amount1);
}

async function createPool(uniswapFactoryContract, token0Address, token1Address, fee) {
    const tx = await uniswapFactoryContract.createPool(
        token0Address.toLowerCase(),
        token1Address.toLowerCase(),
        fee,
        { gasLimit: 10000000 }
    );
    await tx.wait();

    return await uniswapFactoryContract.getPool(token0Address, token1Address, fee);
}

async function initializePool(poolAddress, price, signer) {
    const poolContract = new ethers.Contract(poolAddress, UNISWAP_V3_POOL_ABI, signer);
    const tx = await poolContract.initialize(price.toString(), { gasLimit: 3000000 });
    await tx.wait();
}

main().catch(console.log);
