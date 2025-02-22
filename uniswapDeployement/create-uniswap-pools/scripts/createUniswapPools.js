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
    //for testing using arbsepolia address.
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

        let token0Address, token1Address, fee, baseTokenAmount, quoteTokenAmount, token1Price, token0Price, token0Decimals, token1Decimals;

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

        // Validate token0 decimals (default 18)
        do {
            let input = await askQuestion("Enter the decimals for base token (default 18): ");
            token0Decimals = input === "" ? 18 : parseInt(input);
            if (!isValidNumber(token0Decimals)) console.log("Invalid decimals. Please enter a positive number.");
        } while (!isValidNumber(token0Decimals));

        // Validate token1 decimals (default 18)
        do {
            let input = await askQuestion("Enter the decimals for collateral token (default 18): ");
            token1Decimals = input === "" ? 18 : parseInt(input);
            if (!isValidNumber(token1Decimals)) console.log("Invalid decimals. Please enter a positive number.");
        } while (!isValidNumber(token1Decimals));

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

        const npmca = token1Info.celo.NonfungiblePositionManager;
        const uniswapFactoryAddress = token1Info.celo.UniswapV3Factory;
        const amount0 = ethers.utils.parseUnits(baseTokenAmount.toString(), token0Decimals);
        const amount1 = ethers.utils.parseUnits(quoteTokenAmount.toString(), token1Decimals);

        // Chain ID can be configured
        const chainID = 421614;

        console.log("Getting Uniswap factory contract...");
        const uniswapFactoryContract = await getContract(uniswapFactoryAddress, UNISWAP_FACTOR_ABI);
        const token0 = await getContract(token0Address, ERC20_ABI);
        console.log("Getting token contracts...");
        const token1 = await getContract(token1Address, ERC20_ABI);

        console.log(`Token0 Contract Address: ${token0.address}`);
        console.log(`Token1 Contract Address: ${token1.address}`);

        console.log("Minting and approving tokens...");
        await mintAndApprove(amount0, amount1, token0Address, token1Address, npmca);

        console.log("Checking for existing pool...");
        let poolAddress = await uniswapFactoryContract.getPool(token0Address, token1Address, fee);
        console.log(`Pool Address Before Creation: ${poolAddress}`);

        const deployer = await hreEthers.getSigner();
        if (poolAddress === ethers.constants.AddressZero) {
            console.log("Pool does not exist. Creating pool...");
            poolAddress = await createPool(uniswapFactoryContract, token0Address, token1Address, fee);
            console.log(`Pool Address After Creation: ${poolAddress}`);
            console.log("Initializing pool...");
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
    console.log("Creating pool...");
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
    console.log(`Created pool address: ${poolAdd}`);
    return poolAdd;
}

async function initializePool(poolAdd, price, signer) {
    console.log("Initializing pool...");
    const poolContract = new ethers.Contract(poolAdd, UNISWAP_V3_POOL_ABI, signer);
    var txs = await poolContract.initialize(price.toString(), {
        gasLimit: 3000000,
    });
    await txs.wait();
    console.log("Pool initialized successfully.");
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
    try {

        // Get pool state
       
        const poolContract = new ethers.Contract(poolAdd, UNISWAP_V3_POOL_ABI, deployer);
        const state = await getPoolState(poolContract);


        // Initialize token objects
     
        const Token1 = new Token(chainId, token_contract1.address, Token1_decimals);
        const Token2 = new Token(chainId, token_contract2.address, Token2_decimals);
       

        // Configure pool
        
        const configuredPool = new Pool(
            Token1,
            Token2,
            fee,
            state.sqrtPriceX96.toString(),
            state.liquidity.toString(),
            state.tick
        );
       

        // Create position
       
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
       

        // Define mint options
        
        const mintOptions = {
            recipient: deployer.address,
            deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from now
            slippageTolerance: new Percent(50, 10_000), // 0.5%
        };
       

        // Generate calldata and value for the transaction
        
        const { calldata, value } = NonfungiblePositionManager.addCallParameters(position, mintOptions);
        
       

        // Check token balances
        console.log("Fetching token balances...");
        const balance0 = await token_contract1.balanceOf(deployer.address);
        const balance1 = await token_contract2.balanceOf(deployer.address);
        console.log(`Token1 Balance: ${balance0.toString()}`);
        console.log(`Token2 Balance: ${balance1.toString()}`);

        // Check token allowances
        console.log("Fetching token allowances...");
        const allowance0 = await token_contract1.allowance(deployer.address, npmca);
        const allowance1 = await token_contract2.allowance(deployer.address, npmca);
        console.log(`Token1 Allowance: ${allowance0.toString()}`);
        console.log(`Token2 Allowance: ${allowance1.toString()}`);

        // Create and send the transaction
        const transaction = {
            data: calldata,
            to: npmca,
            value: value,
            from: deployer.address,
            gasLimit: 10000000,
        };
        

      
        const txRes = await deployer.sendTransaction(transaction);
       
        const receipt = await txRes.wait();
    
    } catch (error) {
        console.error("Error occurred while adding liquidity:", error);
    }
}

main().catch(console.log);
