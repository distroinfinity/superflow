package main

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"
	"text/template"
	"time"

	"github.com/briandowns/spinner"
	"gopkg.in/yaml.v2"
)

func loadConfig(filePath string) (*Config, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var config Config
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		fields := strings.SplitN(line, "=", 2)
		if len(fields) != 2 {
			continue
		}
		key, value := fields[0], fields[1]

		switch key {
		case "OwnerAddress":
			config.OwnerAddress = value
		case "SourceChain":
			config.SourceChain = value
		case "OwnerPrivateKey":
			config.OwnerPrivateKey = value
		case "DestinationChain":
			config.DestinationChains = append(config.DestinationChains, value)
		case "ChainSupply":
			config.ChainSupply = value
		case "TokenName":
			config.TokenName = value
		case "TokenSymbol":
			config.TokenSymbol = value
		case "InitialSupply":
			config.InitialSupply = value
		case "QuoteTokenAmount":
			config.QuoteTokenAmount = value
		case "PoolFee":
			config.PoolFee = value
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	if config.OwnerAddress == "" || config.SourceChain == "" || config.OwnerPrivateKey == "" || config.ChainSupply == "" || config.TokenName == "" || config.TokenSymbol == "" || config.InitialSupply == "" || config.QuoteTokenAmount == "" || config.PoolFee == "" {
		return nil, fmt.Errorf("all config inputs are required")
	}

	if len(config.DestinationChains) == 0 {
		return nil, fmt.Errorf("at least one DestinationChain is required")
	}

	// Sorting the slice of strings
	slices.Sort(config.DestinationChains)

	return &config, nil
}

func parseMailboxAddresses() (map[string]string, error) {
	url := "https://raw.githubusercontent.com/hyperlane-xyz/hyperlane-registry/refs/heads/main/chains/addresses.yaml"
	response, err := exec.Command("curl", "-s", url).Output()
	if err != nil {
		return nil, err
	}

	var addressData map[string]map[string]string
	err = yaml.Unmarshal(response, &addressData)
	if err != nil {
		return nil, err
	}

	mailboxes := make(map[string]string)
	for chain, addresses := range addressData {
		if mailbox, ok := addresses["mailbox"]; ok {
			mailboxes[chain] = mailbox
		}
	}

	return mailboxes, nil
}

func launchToken(config *Config) error {
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
	if chainMetadata, ok := metadata[config.SourceChain]; ok {
		if rpcUrls, ok := chainMetadata["rpcUrls"].([]interface{}); ok && len(rpcUrls) > 0 {
			rpcUrlMap := rpcUrls[0]
			for _, url := range rpcUrlMap.(map[interface{}]interface{}) {
				rpcUrl = url.(string)
				break
			}
		}
	}

	if rpcUrl == "" {
		return fmt.Errorf("failed to parse RPC URL for source chain")
	}

	envContent := fmt.Sprintf(`RPC_URL=%s
PRIVATE_KEY=%s
TOKEN_NAME=%s
TOKEN_SYMBOL=%s
INITIAL_SUPPLY=%s
`, rpcUrl, config.OwnerPrivateKey, config.TokenName, config.TokenSymbol, config.InitialSupply)

	gitRoot, err := os.Getwd()
	if err != nil {
		return err
	}

	envPath := filepath.Join(gitRoot, ".env")
	err = os.WriteFile(envPath, []byte(envContent), 0644)
	if err != nil {
		return err
	}

	fmt.Println("Token launch configuration written to .env file.")
	// Execute the newtoken.js script
	scriptPath := filepath.Join(gitRoot, "hyperlane", "scripts", "newtoken.js")
	cmd := exec.Command("node", scriptPath)
	var outputBuffer strings.Builder
	cmd.Stdout = &outputBuffer
	cmd.Stderr = &outputBuffer

	s := spinner.New(spinner.CharSets[14], 100*time.Millisecond)
	s.Suffix = " Executing token launch"
	s.Start()

	err = cmd.Run()
	s.Stop()
	if err != nil {
		fmt.Println("Failed to execute token launch script:", err)
		fmt.Println(outputBuffer.String())
		fmt.Println("failed to execute token launch script")
		os.Exit(1)
	}

	// Store the token address if the script execution is successful
	config.TokenAddress = strings.TrimSpace(outputBuffer.String())

	if config.TokenAddress == "" {
		fmt.Println("Failed to retrieve token address from script output.")
		os.Exit(1)
	}

	fmt.Printf("Token address: %s\n", config.TokenAddress)
	return nil
}

func generateYamlTemplate(config *Config, mailboxes map[string]string) (string, error) {
	tmpl, err := template.New("yamlTemplate").Parse(warpTemplate)
	if err != nil {
		return "", err
	}

	templateData := []TemplateData{}
	for _, chain := range append([]string{config.SourceChain}, config.DestinationChains...) {
		data := TemplateData{
			ChainName:    chain,
			OwnerAddress: config.OwnerAddress,
			Mailbox:      mailboxes[chain],
			Type:         "synthetic",
		}
		if chain == config.SourceChain {
			data.Type = "collateral"
			data.TokenAddress = config.TokenAddress
		}
		templateData = append(templateData, data)
	}

	var result strings.Builder
	for _, data := range templateData {
		err := tmpl.Execute(&result, data)
		if err != nil {
			return "", err
		}
	}

	return result.String(), nil
}

func writeYamlConfig(content string, outputPath string) error {
	err := os.WriteFile(outputPath, []byte(content), 0644)
	if err != nil {
		return err
	}

	return nil
}

func deployWarpRoute(config *Config, yamlPath string) error {
	cmd := exec.Command("hyperlane", "warp", "deploy", "--yes", "true", "--key", config.OwnerPrivateKey, "--config", yamlPath)
	var outputBuffer strings.Builder
	cmd.Stdout = &outputBuffer
	cmd.Stderr = &outputBuffer

	stdin, err := cmd.StdinPipe()
	if err != nil {
		return err
	}

	s := spinner.New(spinner.CharSets[14], 100*time.Millisecond)
	s.Suffix = " Deploying Warp Route"
	s.Start()

	err = cmd.Start()
	if err != nil {
		return err
	}

	go func() {
		for {
			_, err := io.WriteString(stdin, "y\n")
			if err != nil {
				break
			}
			time.Sleep(1 * time.Second)
		}
	}()

	if err := cmd.Wait(); err != nil {
		s.Stop()
		outputStr := outputBuffer.String()
		if strings.Contains(strings.ToLower(outputStr), "insufficient funds") {
			fmt.Println("Failed due to insufficient funds.")
		} else {
			fmt.Println("Failed to deploy warp route. Reason:", outputStr)
		}
		return err
	}

	s.Stop()
	fmt.Println("✅ Successfully deployed warp route.")
	return nil
}

func bridgeSupply(config *Config) error {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return err
	}

	for _, destinationChain := range config.DestinationChains {
		yamlPath := filepath.Join(homeDir, ".hyperlane/deployments/warp_routes/", config.TokenSymbol, fmt.Sprintf("%s-%s-config.yaml", config.SourceChain, strings.Join(config.DestinationChains, "-")))
		cmd := exec.Command("hyperlane", "warp", "send", "--warp", yamlPath, "--origin", config.SourceChain, "--destination", destinationChain, "--yes", "--amount", config.ChainSupply+strings.Repeat("0", 18), "--key", config.OwnerPrivateKey, "--timeout", "120")
		var outputBuffer strings.Builder
		cmd.Stdout = &outputBuffer
		cmd.Stderr = &outputBuffer

		s := spinner.New(spinner.CharSets[14], 100*time.Millisecond)
		s.Suffix = fmt.Sprintf(" Bridging Supply in %s from %s of amount %s", destinationChain, config.SourceChain, config.ChainSupply)
		s.Start()

		err := cmd.Start()
		if err != nil {
			s.Stop()
			return err
		}

		if err := cmd.Wait(); err != nil {
			s.Stop()
			outputStr := outputBuffer.String()
			if strings.Contains(strings.ToLower(outputStr), "insufficient balance") {
				fmt.Printf("Failed due to insufficient balance for %s\n", destinationChain)
			} else {
				fmt.Printf("Failed to bridge supply to %s. Reason: %s\n", destinationChain, outputStr)
			}
			continue
		}

		s.Stop()
		fmt.Printf("✅ Successfully bridged supply to %s\n", destinationChain)
	}

	return nil
}

// to uniswap

// tokenaddress
// Initial Supply - Amount 1
// stable token address
// Base Quote - Amount 2
// swap fees (default = 0.3) configurable

/* uniswap specific */
// npm ca address
// factory address
// chain id from matrix
