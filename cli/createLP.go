package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/briandowns/spinner"
	"gopkg.in/yaml.v2"
)

func createLiquidityPool(config *Config, destinationChain string, yamlPath string) error {
	// Parse chain metadata to get RPC URL and Chain ID
	metadataUrl := "https://raw.githubusercontent.com/hyperlane-xyz/hyperlane-registry/refs/heads/main/chains/metadata.yaml"
	response, err := exec.Command("curl", "-s", metadataUrl).Output()
	if err != nil {
		return err
	}

	var metadata map[string]map[string]interface{}
	err = yaml.Unmarshal(response, &metadata)
	if err != nil {
		return err
	}

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
		return fmt.Errorf("failed to parse RPC URL or Chain ID for destination chain")
	}

	yamlContent, err := os.ReadFile(yamlPath)
	if err != nil {
		return err
	}

	var yamlData struct {
		Tokens []struct {
			AddressOrDenom string `yaml:"addressOrDenom"`
			ChainName      string `yaml:"chainName"`
		} `yaml:"tokens"`
	}

	err = yaml.Unmarshal(yamlContent, &yamlData)
	if err != nil {
		return err
	}

	baseTokenAddress := ""
	for _, token := range yamlData.Tokens {
		if token.ChainName == destinationChain {
			baseTokenAddress = token.AddressOrDenom
			break
		}
	}

	if baseTokenAddress == "" {
		return fmt.Errorf("failed to parse base token address for destination chain")
	}
	config.BaseTokenAddresses[destinationChain] = baseTokenAddress

	// Create .env file for deploying liquidity pool
	envContent := fmt.Sprintf(`RPC_URL=%s
PRIVATE_KEY=%s
BASETOKEN=%s
BASETOKEN_AMOUNT=%s
QUOTE_TOKEN_AMOUNT=%s
POOL_FEE=%s
CHAINID=%s
CHAIN_NAME=%s
`, rpcUrl, config.OwnerPrivateKey, baseTokenAddress, config.ChainSupply, config.QuoteTokenAmount, config.PoolFee, chainId, destinationChain)

	gitRoot, err := os.Getwd()
	if err != nil {
		return err
	}

	envPath := filepath.Join(gitRoot, "uniswapDeployement", "create-uniswap-pools", ".env")
	err = os.WriteFile(envPath, []byte(envContent), 0644)
	if err != nil {
		return err
	}

	// Execute the deployLP.js script
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
		// fmt.Println("Failed to execute liquidity pool deployment script:", err)
		// fmt.Println(outputBuffer.String())
		// fmt.Println("failed to execute liquidity pool deployment script")
		return err
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
