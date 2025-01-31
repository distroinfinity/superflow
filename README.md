

![1](https://github.com/user-attachments/assets/8d07c141-d9e7-4dca-b26b-1879fd4556dc)


Issues and Bounties details: https://scoutgame.xyz/info/partner-rewards/celo


Superflow is built to solve and ease out the process of Token Generation events and later bridging and deploying liquidity pools of those tokens across multiple chains. 

Usually a normal process for TGE and Post TGE looks something like this: 

1. Deploying ERC20 on one chain, for most projects, its Ethereum Mainnet for security and trust.
2. Bridge tokens to multiple chains of interest, for example, Arbitrum, Base, Celo, Unichain, etc., or whichever chain they want their token to be present in the LP pool of that chain, Uniswap on Arbitrum or Aerdrome on Base.
3. Actually creating a liquidity pool of the bridged token and the respective destination chains and providing liquidity in that pool.

   
Superflow is built to automate the above-mentioned disjoint and time-consuming steps with one click.  
With Superflow, you provide the necessary information, like the origin chain, total supply, and other metadata of the token, which all chains they want to bridge their tokens to, and how much of the total supply they want to bridge and put in the LP pool for that chain.   

With all this info collected beforehand, Superflow will do all the actions mentioned above for you, and you'll have the deployment result, like the LP Pool address of each destination chain, etc., as the end result.
All of the steps from token generation to bridging to creating an LP pair and providing liquidity abstracted for you under the hood. 

That's Superflow!

## How its made

Superflow is a containerised cli solution that automates all the logic for you. The end result is a docker image that you run by executing a single docker command. 

Under the hood the different individual steps are automated with JS and Go scripts.

- Token generation happen through a JS script.
- Bridging the token after creation is done using hyperlane warp routes.
-We generate warp routes for the newly deployed token connecting the parent and destination chains of interests.
- Bridging of token is handled via hyperlane cli. The whole logic of working with the cli is abstracted with go scripts and shipped in the container image.
- Finally the deployement of LP pools happen via JS scripts again and this step is also part of the docker image and shipped in it.
 
## Deployer Address:

The deployer address used to deploy warp routes and several other tokens on each chain are:
- 0xfb01313Ef6FC6e683d1408E98c93B19d9C16F1BB
- 0xd799db5dF493C7c03D70a14e78462F5Dfaa0f063



