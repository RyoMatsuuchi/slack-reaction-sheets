# Slack Reaction to Google Sheets

Slackのメッセージに特定のリアクションが付けられた時、自動的にGoogle Sheetsに内容を転記するアプリケーション。

## 機能

- Slackの特定リアクション（デフォルト: ✅）の検知
- メッセージ内容、送信者、チャンネル、タイムスタンプの取得
- Google Sheetsへの自動転記

## 必要要件

- Node.js 18.0.0以上
- Slack Appの設定
- Google Cloud Projectの設定
- Renderアカウント（デプロイ用）

## セットアップ

1. リポジトリのクローン
```bash
git clone [repository-url]
cd slack-reaction-sheets
```

2. 依存パッケージのインストール
```bash
npm install
```

3. 環境変数の設定
```bash
cp .env.example .env
# .envファイルを編集して必要な情報を設定
```

4. アプリケーションの起動
```bash
# 開発モード
npm run dev

# 本番モード
npm run build
npm start
```

## デプロイ

Renderを使用したデプロイ手順は[こちら](docs/render-setup.md)を参照してください。

## 開発

- `src/`: ソースコード
- `docs/`: ドキュメント
  - `slack-reaction-sheets.md`: 詳細な設計ドキュメント
  - `render-setup.md`: Renderセットアップガイド

## ライセンス

MIT

## 作者

[Your Name]