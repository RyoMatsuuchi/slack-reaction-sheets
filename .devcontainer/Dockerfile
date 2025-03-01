FROM mcr.microsoft.com/devcontainers/javascript-node:20

# 追加のツールをインストール
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends git

# npmの設定
RUN npm install -g typescript ts-node
