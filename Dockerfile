FROM golang:1.21 AS go-builder
WORKDIR /cli
COPY cli/go.mod cli/go.sum ./
RUN go mod download
COPY cli/ ./
RUN go build -o /app ./...

FROM node:20-alpine AS node-builder
WORKDIR /hyperlane/scripts
COPY hyperlane/ /hyperlane/
WORKDIR /hyperlane/scripts
RUN npm install
RUN apk add --no-cache git
RUN npm install -g @hyperlane-xyz/cli

WORKDIR /uniswapDeployement/create-uniswap-pools
COPY uniswapDeployement/ /uniswapDeployement/
RUN npm install
RUN npm i config

FROM alpine:latest
RUN apk add --no-cache ca-certificates nodejs npm curl
COPY --from=go-builder /app /app
COPY --from=node-builder /hyperlane /hyperlane
COPY --from=node-builder /uniswapDeployement /uniswapDeployement
COPY --from=node-builder /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=node-builder /usr/local/bin /usr/local/bin
WORKDIR /
CMD ["/app"]
