{{.ChainName}}:
  interchainSecurityModule:
    modules:
      - relayer: "{{.OwnerAddress}}"
        type: trustedRelayerIsm
      - domains: {}
        type: defaultFallbackRoutingIsm
        owner: "{{.OwnerAddress}}"
    threshold: 1
    type: staticAggregationIsm
  isNft: false
  mailbox: "{{.Mailbox}}"
  owner: "{{.OwnerAddress}}"
  proxyAdmin:
    owner: "{{.OwnerAddress}}"
  {{if .TokenAddress}}token: "{{.TokenAddress}}"
  {{end}}type: {{.Type}}
