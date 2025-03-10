#!/bin/bash

echo "=== Running newtoken.js ==="
cd "$(dirname "$0")/hyperlane/scripts" || {
    echo "❌ Directory not found!"
    exit 1
}
npm run newtoken || {
    echo "❌ Error running newtoken.js!"
    exit 1
}

echo "=== Running createUniswapPools.js ==="
cd "$(dirname "$0")/uniswapDeployement/create-uniswap-pools" || {
    echo "❌ Directory not found!"
    exit 1
}
npm run createpools || {
    echo "❌ Error running createUniswapPools.js!"
    exit 1
}

echo "✅ All scripts finished successfully!"
exit 0
