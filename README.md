# Slack Reaction to Google Sheets Sync

Slackのメッセージに特定のリアクション（✅）が付けられた時、自動的にGoogle Sheetsに内容を転記するアプリケーション。

## 機能

- Slackメッセージの自動転記
- Google Sheetsとの連携
- メッセージへのハイパーリンク付き参照
- 日本時間でのタイムスタンプ
- エラーハンドリングとログ機能
- Slackユーザーの表示名（display_name）の取得
- 特定の行への挿入機能
- 既存データの保持（A列の通し番号）

## セットアップ手順

セットアップは3つのステップで行います：

1. [Google Spreadsheetの準備](./SPREADSHEET_SETUP.md)
   - スプレッドシートの作成と設定
   - サービスアカウントの設定
   - アクセス権限の付与

2. [Slackアプリの設定](./SLACK_APP_SETUP.md)
   - アプリケーションの作成
   - 権限の設定
   - ボットトークンの取得

3. [アプリケーションの設定](./SETUP_AND_TEST.md)
   - 環境変数の設定
   - アプリケーションの起動
   - 動作確認

## 必要要件

- Node.js 18.0.0以上
- Slackワークスペースの管理者権限
- Google Cloud Platformのプロジェクト
- Google Sheets API有効化

## クイックスタート

```bash
# リポジトリのクローン
git clone [repository-url]
cd slack-reaction-sheets

# 依存パッケージのインストール
npm install

# 環境変数の設定
cp .env.example .env
# .envファイルを編集

# アプリケーションの起動
npm run build
npm start
```

## 環境変数

```bash
# Slack設定
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_SIGNING_SECRET=your-secret
SLACK_APP_TOKEN=xapp-your-token # Socket Modeの場合

# Google Sheets設定
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# アプリケーション設定
PORT=3000
TARGET_REACTION=white_check_mark
LOG_LEVEL=info
NODE_ENV=production
```

## データ転記仕様

### 行の挿入位置
- C列（発生日）の最後のデータがある行の次の行に挿入
- 行が存在しない場合のみ、新しい行を追加

### 各列の設定
- A列（#）: 既存の値を保持（上書きしない）
- B列（システム）: "i-backyard" に固定
- C列（発生日）: YYYY/MM/DD形式（日本時間）
- D列（起点）: "Slack"という表示でSlackメッセージへのハイパーリンク
- E列（対応者1）: Slackの表示名（display_name）
- I列（完了）: 空欄

## プロジェクト構成

```
slack-reaction-sheets/
├── src/
│   ├── app.ts           # メインアプリケーション
│   ├── index.ts         # エントリーポイント
│   ├── config/          # 設定管理
│   ├── services/        # サービス実装
│   ├── types/           # 型定義
│   └── utils/           # ユーティリティ
├── docs/                # プロジェクトドキュメント
├── SPREADSHEET_SETUP.md # スプレッドシート設定手順
├── SLACK_APP_SETUP.md   # Slackアプリ設定手順
├── SETUP_AND_TEST.md    # セットアップと動作確認手順
└── render.yaml          # Renderデプロイ設定
```

## デプロイ

Render.comを使用したデプロイ：

1. GitHubリポジトリを連携
2. 環境変数を設定
3. デプロイを実行

詳細は`render.yaml`を参照してください。

## 開発

```bash
# 開発モード（ホットリロード）
npm run dev

# TypeScriptのビルド
npm run build

# 本番モード
npm start

# テスト実行
npm run test:sheets # スプレッドシート機能のテスト
```

## トラブルシューティング

- 各種セットアップドキュメントの「トラブルシューティング」セクションを参照
- ログレベルを`debug`に設定して詳細なログを確認
- アプリケーションの起動状態とエラーログを確認

## ライセンス

MIT

## 作者

[Your Name]
