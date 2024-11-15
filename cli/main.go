package main

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"text/template"
	"time"

	"github.com/briandowns/spinner"
	"gopkg.in/yaml.v2"
)

type Config struct {
	OwnerAddress      string
	DestinationChains []string
	SourceChain       string
	TokenAddress      string
	OwnerPrivateKey   string
	ChainSupply       string
}

type TemplateData struct {
	ChainName    string
	OwnerAddress string
	Mailbox      string
	TokenAddress string
	Type         string
}

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
		case "TokenAddress":
			config.TokenAddress = value
		case "OwnerPrivateKey":
			config.OwnerPrivateKey = value
		case "DestinationChain":
			config.DestinationChains = append(config.DestinationChains, value)
		case "ChainSupply":
			config.ChainSupply = value
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

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

func generateYamlTemplate(config *Config, mailboxes map[string]string) (string, error) {
	templateFilePath := "./warp-template.tpl"
	tplContent, err := os.ReadFile(templateFilePath)
	if err != nil {
		return "", err
	}

	tmpl, err := template.New("yamlTemplate").Parse(string(tplContent))
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
		yamlPath := filepath.Join(homeDir, ".hyperlane/deployments/warp_routes/USDC", fmt.Sprintf("%s-%s-config.yaml", config.SourceChain, destinationChain))
		cmd := exec.Command("hyperlane", "warp", "send", "--warp", yamlPath, "--origin", config.SourceChain, "--destination", destinationChain, "--yes", "--amount", config.ChainSupply, "--key", config.OwnerPrivateKey)
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
			return err
		}

		s.Stop()
		fmt.Printf("✅ Successfully bridged supply to %s\n", destinationChain)
	}

	return nil
}

func main() {
	configPath := "./config.txt"
	outputPath := "./warp-route-deployment.yaml"
	config, err := loadConfig(configPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load config: %v\n", err)
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
}
