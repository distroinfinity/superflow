@echo off
echo === Running newtoken.js ===
cd /d "%~dp0\hyperlane\scripts"
call npm run newtoken || (
    echo ❌ Error running newtoken.js!
    exit /b 1
)

echo === Running createUniswapPools.js ===
cd /d "%~dp0\uniswapDeployement\create-uniswap-pools"
call npm run createpools || (
    echo ❌ Error running createUniswapPools.js!
    exit /b 1
)

echo ✅ All scripts finished successfully!
exit /b 0