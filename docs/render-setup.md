# Render.com 環境セットアップ手順

## 1. 事前準備

### 1.1 必要なアカウント
- [ ] GitHub アカウント
- [ ] Render.com アカウント
- [ ] Slack アプリ管理者権限
- [ ] Google Cloud アカウント

### 1.2 ローカル環境
- [ ] Node.js v18以上
- [ ] Git
- [ ] npm または yarn

## 2. Slack App の設定

### 2.1 Slack App の作成
1. [Slack Api](https://api.slack.com/apps) にアクセス
2. "Create New App" をクリック
3. "From scratch" を選択
4. アプリ名とワークスペースを設定

### 2.2 権限の設定
1. "OAuth & Permissions" セクションに移動
2. 以下のスコープを追加：
   - `reactions:read`
   - `channels:history`
   - `groups:history`

### 2.3 認証情報の取得
- Bot User OAuth Token (`xoxb-` で始まる文字列)
- Signing Secret

## 3. Google Cloud の設定

### 3.1 プロジェクトの作成
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新規プロジェクトを作成

### 3.2 API の有効化
1. Google Sheets API を有効化
2. Google Drive API を有効化

### 3.3 サービスアカウントの作成
1. IAM & 管理 > サービスアカウントに移動
2. 新しいサービスアカウントを作成
3. 必要な権限を付与：
   - Google Sheets API
   - Google Drive API
4. JSONキーをダウンロード

## 4. Render.com の設定

### 4.1 アカウント作成とログイン
1. [Render.com](https://render.com/) にアクセス
2. GitHubアカウントでサインアップ

### 4.2 新規サービスの作成
1. "New +" > "Web Service" を選択
2. GitHubリポジトリを連携
3. 以下の設定を行う：
   - Name: `slack-reaction-sheets`（任意）
   - Runtime: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

### 4.3 環境変数の設定
"Environment" セクションで以下の変数を設定：
```
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
GOOGLE_SPREADSHEET_ID=...
GOOGLE_SERVICE_ACCOUNT_KEY={"type": "service_account", ...}
TARGET_REACTION=white_check_mark
```

### 4.4 自動デプロイの設定
1. "Auto-Deploy" を "Yes" に設定
2. ブランチを `main` に設定

## 5. 動作確認

### 5.1 初期デプロイの確認
1. デプロイログを確認
2. アプリケーションのステータスが "Live" になることを確認

### 5.2 機能テスト
1. Slackで任意のメッセージに指定のリアクションを付ける
2. Google Sheetsにデータが転記されることを確認

## 6. トラブルシューティング

### 6.1 デプロイ失敗時
- ビルドログを確認
- 環境変数が正しく設定されているか確認
- package.jsonの設定を確認

### 6.2 アプリケーションエラー時
- Renderのログを確認
- Slack App の設定を確認
- Google Cloud の認証情報を確認

## 7. セキュリティ注意事項

- 環境変数は必ずRenderのダッシュボードで設定する
- サービスアカウントのJSONキーは厳重に管理
- Slack Botトークンは漏洩しないよう注意