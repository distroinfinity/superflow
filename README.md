# Superflow

Superflow is an all-in-one solution designed to simplify and automate the complex processes involved in Token Generation Events (TGE) and post-TGE workflows. It empowers users to deploy ERC-20 tokens, bridge them across multiple blockchains, and create liquidity pools (LPs) on decentralized exchanges—all with a single command.

By abstracting the traditionally disjointed steps, Superflow streamlines the entire lifecycle, from token deployment to liquidity provisioning, ensuring efficiency, consistency, and ease of use.

---

## Key Features

- **Token Generation**: Deploy ERC-20 tokens effortlessly with pre-configured metadata and total supply.
- **Cross-Chain Bridging**: Automatically bridge tokens to multiple chains of interest, such as Arbitrum, Base, Celo, and more, using Hyperlane warp routes.
- **Liquidity Provisioning**: Create and deploy LP pools on DEXs like Uniswap or Aerodrome, enabling seamless token liquidity across chains.
- **Automation**: All steps—token deployment, bridging, and LP provisioning—are handled in a single containerized CLI command.
- **End-to-End Abstraction**: Receive deployment results, such as LP pool addresses, without worrying about the underlying complexity.

---

## Repository Structure

The repository is structured to keep the logic modular and maintainable:

### `cli/`
Contains the core command-line interface scripts that drive the Superflow solution. These scripts allow users to pass required token metadata, bridging configurations, and liquidity parameters for the automation process.

### `hyperlane/`
Includes scripts and configurations to handle cross-chain bridging of tokens using Hyperlane warp routes. It generates and manages routes to connect parent chains (e.g., Ethereum Mainnet) with destination chains (e.g., Arbitrum, Base).

### `uniswap_deployment/`
Houses scripts for creating and managing liquidity pools on DEXs like Uniswap for the deployed and bridged tokens.

### Key Script Files:
- **`newToken.js`**: Automates the deployment of a new ERC-20 token on the specified origin chain.
- **`createUniswapPools.js`**: Facilitates the creation of liquidity pools for the deployed token on DEXs across bridged chains.

---

## Getting Started

### Prerequisites

1. **Node.js** (v14 or higher) and npm/yarn.
2. **Docker**: Ensure Docker is installed and running on your machine.
3. **Hyperlane CLI**: Required for bridging tokens.
4. **Environment Configuration**: Create a `.env` file with the necessary API keys, deployer addresses, and configurations.
---

## Contributing

We welcome contributions to Superflow! To maintain consistency and ensure quality, please follow the guidelines below when contributing to the project:

### Steps to Contribute

1. **Fork the Repository**  
   - Click the **Fork** button on the repository page to create your copy of the project.

2. **Clone the Forked Repository**  
   - Clone your fork to your local machine:  
     ```bash
     git clone https://github.com/your-username/superflow.git
     cd superflow
     ```

3. **Create a Feature Branch**  
   - Use a descriptive branch name that reflects your changes:  
     ```bash
     git checkout -b feature/your-feature-name
     ```

4. **Make Changes**  
   - Edit the codebase to implement your feature or fix the issue. Ensure your changes follow the coding standards used in the repository.

5. **Test Your Changes**  
   - Run all tests to ensure that your changes do not break existing functionality:  
     ```bash
     npm test
     ```

6. **Commit Your Changes**  
   - Write clear and descriptive commit messages:  
     ```bash
     git add .
     git commit -m "Add a brief description of your changes"
     ```

7. **Push to Your Fork**  
   - Push the changes to your forked repository:  
     ```bash
     git push origin feature/your-feature-name
     ```

8. **Open a Pull Request**  
   - Navigate to the original repository and click on **Pull Requests**.  
   - Submit a pull request with a clear title and description of your changes.

---

### Guidelines for Contributions

- **Follow the Code Style**: Ensure your code follows the repository’s coding standards.
- **Write Tests**: Include tests for your changes wherever applicable.
- **Stay Modular**: Keep changes modular to make them easier to review and merge.
- **Update Documentation**: Update the `README.md` or other relevant documentation if your changes impact usage or features.

---

Thank you for contributing to Superflow!