package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/briandowns/spinner"
	"gopkg.in/yaml.v2"
)

func createLiquidityPool(config *Config, destinationChain string, yamlPath string) error {
	// init logger
	logger := log.New(os.Stdout, "[createLiquidityPool]", log.LstdFlags)

	logger.Printf("Starting liquidity pool creation on chain: %s", destinationChain)

	// 1. Parse chain metadata to get RPC URL and Chain ID
	metadataUrl := "https://raw.githubusercontent.com/hyperlane-xyz/hyperlane-registry/refs/heads/main/chains/metadata.yaml"
	logger.Printf("Fetching chain metadata from: %s", metadataUrl)

	response, err := exec.Command("curl", "-s", metadataUrl).Output()
	if err != nil {
		logger.Printf("Error fetching chain metadata: %v", err)
		return fmt.Errorf("fetch chain metadata: %w", err)
	}

	var metadata map[string]map[string]interface{}
	if err := yaml.Unmarshal(response, &metadata); err != nil {
		logger.Printf("Error parsing YAML from metadata: %v", err)
		return fmt.Errorf("unmarshal chain metadata: %w", err)
	}
	logger.Println("Successfully parsed chain metadata.")

	// 2. Extract RPC URL & chain ID
	rpcUrl := ""
	chainId := ""

	if chainMetadata, ok := metadata[destinationChain]; ok {
		if rpcUrls, ok := chainMetadata["rpcUrls"].([]interface{}); ok && len(rpcUrls) > 0 {
			rpcUrlMap := rpcUrls[0]
			for _, url := range rpcUrlMap.(map[interface{}]interface{}) {
				rpcUrl = url.(string)
				break
			}
		}
		if id, ok := chainMetadata["chainId"].(int); ok {
			chainId = fmt.Sprintf("%d", id)
		}
	}

	if rpcUrl == "" || chainId == "" {
		logger.Println("Failed to parse either RPC URL or chain ID for destination chain.")
		return fmt.Errorf("missing RPC URL or chain ID for chain %s", destinationChain)
	}
	logger.Printf("Found RPC URL: %s, chain ID: %s", rpcUrl, chainId)

	// 3. Read YAML for base token address
	yamlContent, err := os.ReadFile(yamlPath)
	if err != nil {
		logger.Printf("Error reading YAML file (%s): %v", yamlPath, err)
		return fmt.Errorf("read yaml file: %w", err)
	}
	logger.Printf("Successfully read YAML file: %s", yamlPath)

	var yamlData struct {
		Tokens []struct {
			AddressOrDenom string `yaml:"addressOrDenom"`
			ChainName      string `yaml:"chainName"`
		} `yaml:"tokens"`
	}

	if err := yaml.Unmarshal(yamlContent, &yamlData); err != nil {
		logger.Printf("Error unmarshaling tokens data from YAML: %v", err)
		return fmt.Errorf("unmarshal tokens data: %w", err)
	}

	baseTokenAddress := ""
	for _, token := range yamlData.Tokens {
		if token.ChainName == destinationChain {
			baseTokenAddress = token.AddressOrDenom
			break
		}
	}

	if baseTokenAddress == "" {
		logger.Println("No base token address found in YAML for destination chain.")
		return fmt.Errorf("no base token address in YAML for chain %s", destinationChain)
	}
	config.BaseTokenAddresses[destinationChain] = baseTokenAddress
	logger.Printf("Base token address for chain %s: %s", destinationChain, baseTokenAddress)

	// 4. Create .env file for deploying liquidity pool
	gitRoot, err := os.Getwd()
	if err != nil {
		logger.Printf("Error fetching working directory: %v", err)
		return fmt.Errorf("get working directory: %w", err)
	}
	envPath := filepath.Join(gitRoot, "uniswapDeployement", "create-uniswap-pools", ".env")

	// Important: do NOT log private key in plaintext
	envContent := fmt.Sprintf(`RPC_URL=%s
		PRIVATE_KEY=%s
		BASETOKEN=%s
		BASETOKEN_AMOUNT=%s
		QUOTE_TOKEN_AMOUNT=%s
		POOL_FEE=%s
		CHAINID=%s
		CHAIN_NAME=%s
		`,
		rpcUrl,
		config.OwnerPrivateKey,
		baseTokenAddress,
		config.ChainSupply,
		config.QuoteTokenAmount,
		config.PoolFee,
		chainId,
		destinationChain,
	)

	if err := os.WriteFile(envPath, []byte(envContent), 0644); err != nil {
		logger.Printf("Error writing .env file at path %s: %v", envPath, err)
		return fmt.Errorf("write .env file: %w", err)
	}
	logger.Printf(".env file successfully created at: %s", envPath)

	// 5. Execute the deployLP.js script
	cmd := exec.Command("npm", "run", "createpools")
	cmd.Dir = filepath.Join(gitRoot, "uniswapDeployement", "create-uniswap-pools")

	var outputBuffer strings.Builder
	cmd.Stdout = &outputBuffer
	cmd.Stderr = &outputBuffer

	s := spinner.New(spinner.CharSets[14], 100*time.Millisecond)
	s.Suffix = fmt.Sprintf(" Creating Liquidity Pool on %s", destinationChain)
	s.Start()

	err = cmd.Run()
	s.Stop()

	if err != nil {
		logger.Printf("Error executing liquidity pool deployment script: %v", err)
		logger.Printf("Script output: %s", outputBuffer.String())
		return fmt.Errorf("deploy script run: %w", err)
	}

	outputLines := strings.Split(outputBuffer.String(), "\n")
	for _, line := range outputLines {
		parts := strings.Split(line, " ")
		for _, part := range parts {
			if strings.HasPrefix(part, "0x") {
				config.PoolAddresses[destinationChain] = strings.TrimSpace(part)
			}
		}
	}

	fmt.Printf("Liquidity pool successfully created on %s with address %s\n", destinationChain, config.PoolAddresses[destinationChain])
	return nil
}
