# Slack Reaction to Google Sheets Sync

Slack のメッセージに特定のリアクション（✅）が付けられた時、自動的に Google Sheets に内容を転記するアプリケーション。

## 機能

- Slack メッセージの自動転記
- Google Sheets との連携
- メッセージへのハイパーリンク付き参照
- 日本時間でのタイムスタンプ
- エラーハンドリングとログ機能
- Slack ユーザーの表示名（display_name）の取得
- 特定の行への挿入機能
- 既存データの保持（A 列の通し番号）

## セットアップ手順

セットアップは 3 つのステップで行います：

1. [Google Spreadsheet の準備](./SPREADSHEET_SETUP.md)

   - スプレッドシートの作成と設定
   - サービスアカウントの設定
   - アクセス権限の付与

2. [Slack アプリの設定](./SLACK_APP_SETUP.md)

   - アプリケーションの作成
   - 権限の設定
   - ボットトークンの取得

3. [アプリケーションの設定](./SETUP_AND_TEST.md)
   - 環境変数の設定
   - アプリケーションの起動
   - 動作確認

## 必要要件

- Node.js 18.0.0 以上
- Slack ワークスペースの管理者権限
- Google Cloud Platform のプロジェクト
- Google Sheets API 有効化

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
SOCKET_MODE=true  # true: Socket Mode, false: HTTP Mode
SLACK_APP_TOKEN=xapp-your-token  # Socket Mode時のみ必要

# Google Sheets設定
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# アプリケーション設定
PORT=3000  # HTTP Mode時のポート番号
TARGET_REACTION=white_check_mark
LOG_LEVEL=info
NODE_ENV=production
```

## 動作モード

アプリケーションは 2 つの動作モードをサポートしています：

### Socket Mode（開発環境向け）

- WebSocket を使用して Slack と通信
- ファイアウォール内からでも動作可能
- 設定方法：
  ```
  SOCKET_MODE=true
  SLACK_APP_TOKEN=xapp-...  # App Level Tokenが必要
  ```

### HTTP Mode（本番環境向け）

- 通常の HTTP エンドポイントを使用
- Render などのホスティングサービスに最適
- 設定方法：
  ```
  SOCKET_MODE=false
  ```
- Slack App 設定で Request URL の設定が必要：
  ```
  https://your-app.onrender.com/slack/events
  ```

## データ転記仕様

### 行の挿入位置

- C 列（発生日）の最後のデータがある行の次の行に挿入
- 行が存在しない場合のみ、新しい行を追加

### 各列の設定

- A 列（#）: 既存の値を保持（上書きしない）
- B 列（システム）: "i-backyard" に固定
- C 列（発生日）: YYYY/MM/DD 形式（日本時間）
- D 列（起点）: "Slack"という表示で Slack メッセージへのハイパーリンク
- E 列（対応者 1）: 空欄
- H 列（内容）: "from: Slack の表示名（display_name）" + Slack の本文
- I 列（完了）: 空欄

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

Render.com を使用したデプロイ：

1. GitHub リポジトリを連携
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

Ryo Matsuuchi
