/* eslint-disable new-cap */
/* eslint-disable no-undef */
/* eslint-disable prettier/prettier */
// USDC/WETH pool 0.3%
const bn = require('bignumber.js');
const { BigNumber } = require('ethers');

bn.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 });

const sqrtPriceX96 = '1533986336806160992173892185949834';

// The function to encode a price using sqrt ratio
function encodePriceSqrt(reserve1, reserve0) {
  try {
    // input checks
    if (Number(reserve0) === 0 || Number(reserve1) === 0) {
      throw new Error("Reserves cannot be zero. Provide valid non-zero values.");
    }

    return BigNumber.from(
      new bn(reserve1.toString())
        .div(reserve0.toString())
        .sqrt()
        .multipliedBy(new bn(2).pow(96))
        .integerValue(3)
        .toString()
    ).toString();
  } catch (err) {
    console.error(`[Error] encodePriceSqrt failed. Reason: ${err.message}`);
    throw err;
  }
}

// Example usage with console logs
// (function main() {
//   try {
//     console.log(`[Log] Example known sqrtPriceX96: ${sqrtPriceX96}`);

//  Provide example reserves
//     const reserveA = 1;
//     const reserveB = 2668.02;
//     const ratio = encodePriceSqrt(reserveA, reserveB);
//     console.log(`[Log] Encoded sqrtPriceX96 for ratio 1:2668.02 => ${ratio}`);
//   } catch (err) {
//     console.error(`[Fatal] Unable to calculate sqrtPriceX96: ${err.message}`);
//     process.exit(1);
//   }
// })();
