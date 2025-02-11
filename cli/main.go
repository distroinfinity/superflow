package main

import (
	_ "embed"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/davecgh/go-spew/spew"
)

type CollateralToken struct {
    Address string
    Amount  string
}

type Config struct {
	OwnerAddress       string
	DestinationChains  []string
	SourceChain        string
	TokenAddress       string
	OwnerPrivateKey    string
	ChainSupply        string
	TokenName          string
	CollateralTokens   map[string][]CollateralToken
	TokenSymbol        string
	InitialSupply      string
	QuoteTokenAmount   string
	PoolFee            string
	BaseTokenAddresses map[string]string
	PoolAddresses      map[string]map[string]string
}

type TemplateData struct {
	ChainName    string
	OwnerAddress string
	Mailbox      string
	TokenAddress string
	Type         string
}

//go:embed warp-template.tpl
var warpTemplate string

func main() {
	configPath := "./config.txt"
	outputPath := "./warp-route-deployment.yaml"
	config, err := loadConfig(configPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load config: %v\n", err)
		os.Exit(1)
	}

	err = launchToken(config)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to launch token: %v\n", err)
		os.Exit(1)
	}

	mailboxes, err := parseMailboxAddresses()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to parse mailbox addresses: %v\n", err)
		os.Exit(1)
	}

	yamlContent, err := generateYamlTemplate(config, mailboxes)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to generate YAML template: %v\n", err)
		os.Exit(1)
	}

	err = writeYamlConfig(yamlContent, outputPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to write YAML config: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("✅ Successfully created warp route deployment YAML.")

	err = deployWarpRoute(config, outputPath)
	if err != nil {
		os.Exit(1)
	}

	err = bridgeSupply(config)
	if err != nil {
		os.Exit(1)
	}

	config.BaseTokenAddresses = make(map[string]string)
	config.PoolAddresses = make(map[string]map[string]string) 

	for _, destinationChain := range config.DestinationChains {
		// Initialize the inner map for this chain
        config.PoolAddresses[destinationChain] = make(map[string]string)
        

		// Parse base token address from YAML file
		homeDir, _ := os.UserHomeDir()
		yamlPath := filepath.Join(homeDir, ".hyperlane/deployments/warp_routes/", config.TokenSymbol, fmt.Sprintf("%s-%s-config.yaml", config.SourceChain, strings.Join(config.DestinationChains, "-")))

		err = createLiquidityPool(config, destinationChain, yamlPath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to create liquidity pool for %s: %v\n", destinationChain, err)
		}
	}

	// Parse and print Pool Addresses with URLs
	  for chain, poolsMap := range config.PoolAddresses {
        for collateralToken, address := range poolsMap {
            url := ""
            switch chain {
            case "arbitrumsepolia":
                url = fmt.Sprintf("https://sepolia-explorer.arbitrum.io/address/%s", address)
            case "basesepolia":
                url = fmt.Sprintf("https://base-sepolia.blockscout.com/address/%s", address)
            case "optimismsepolia":
                url = fmt.Sprintf("https://optimism-sepolia.blockscout.com/address/%s", address)
            case "celo":
                url = fmt.Sprintf("https://celo-alfajores.blockscout.com/address/%s", address)
            case "unichain":
                url = fmt.Sprintf("https://unichain.blockscout.com/address/%s", address)
            case "mantle":
                url = fmt.Sprintf("https://sepolia.mantlescan.xyz/address/%s", address)
            default:
                url = address
            }
            fmt.Printf("Pool Address for %s with collateral %s: %s\n", chain, collateralToken, url)
        }
    }

    spew.Dump(config)
}
