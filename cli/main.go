package main

import (
	_ "embed"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type Config struct {
	OwnerAddress      string
	DestinationChains []string
	SourceChain       string
	TokenAddress      string
	OwnerPrivateKey   string
	ChainSupply       string
	TokenName         string
	TokenSymbol       string
	InitialSupply     string
	QuoteTokenAmount  string
	PoolFee           string
	PoolAddresses     map[string]string
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

	for _, destinationChain := range config.DestinationChains {
		// Parse base token address from YAML file
		homeDir, _ := os.UserHomeDir()

		yamlPath := filepath.Join(homeDir, ".hyperlane/deployments/warp_routes/", config.TokenSymbol, fmt.Sprintf("%s-%s-config.yaml", config.SourceChain, strings.Join(config.DestinationChains, "-")))

		err = createLiquidityPool(config, destinationChain, yamlPath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to create liquidity pool for %s: %v\n", destinationChain, err)
		}
	}

	fmt.Println(config.PoolAddresses)
}
