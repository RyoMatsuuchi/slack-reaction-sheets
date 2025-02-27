# Slack Reaction to Google Sheets Sync

## システム概要

Slackの特定のリアクションが付けられたメッセージを自動的にGoogleスプレッドシートに転記するシステム

### 目的
- Slackでの重要な情報や記録すべき内容を、自動的にスプレッドシートに集約
- 情報の一元管理と後から参照しやすい形での保存を実現

## システム設計

### アーキテクチャ
- Node.js + TypeScriptによるサーバーレスアプリケーション
- Webhookベースのイベント駆動型アーキテクチャ

### 使用技術
- **バックエンド**
  - Node.js (v18以上)
  - TypeScript
  - @slack/bolt (Slackアプリケーションフレームワーク)
  - google-spreadsheet (Google Sheets API用クライアント)
  - dotenv (環境変数管理)

### コンポーネント構成

1. **Slackイベントリスナー**
   - `reaction_added`イベントの検知
   - リアクション条件のフィルタリング

2. **メッセージ処理サービス**
   - Slack APIを使用したメッセージ情報の取得
   - メッセージデータの整形

3. **スプレッドシート操作サービス**
   - Google Sheets APIを使用したデータ書き込み
   - スプレッドシートのフォーマット管理

### データフロー
1. Slackでメッセージにリアクションが追加される
2. Webhookによりアプリケーションにイベントが通知
3. メッセージ情報を取得・整形
4. Google Sheetsに転記

### スプレッドシートの構造
| Timestamp | User | Channel | Message | Reaction |
|-----------|------|---------|---------|----------|
| 投稿日時 | 投稿者 | チャンネル名 | メッセージ本文 | 付加されたリアクション |

## セットアップ要件

### Slack設定
1. **必要なスコープ**
   - `reactions:read`
   - `channels:history`
   - `groups:history`

### Google Cloud設定
1. **必要なAPI**
   - Google Sheets API
   - Google Drive API（スプレッドシートの作成・編集用）

### 環境変数
```
# Slack設定
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...

# Google Sheets設定
GOOGLE_SPREADSHEET_ID=...
GOOGLE_SERVICE_ACCOUNT_KEY=...

# アプリケーション設定
TARGET_REACTION=white_check_mark
```

## エラーハンドリング

### 考慮すべきエラーケース
1. **Slack API関連**
   - レート制限
   - APIの一時的な障害
   - トークン認証エラー

2. **Google Sheets API関連**
   - レート制限
   - 認証エラー
   - スプレッドシートの権限エラー

3. **アプリケーション全般**
   - ネットワークエラー
   - メモリ制限
   - タイムアウト

### エラー対策
1. **リトライ機構**
   - 指数バックオフを使用したリトライ
   - 最大リトライ回数の設定

2. **ログ管理**
   - エラーログの詳細な記録
   - 重要なイベントの監視

3. **エラー通知**
   - 重大なエラー発生時のSlack通知
   - 定期的な稼働状況レポート

## 拡張性

### 将来的な機能拡張の可能性
1. **複数スプレッドシート対応**
   - チャンネルごとに異なるスプレッドシート
   - リアクションの種類による振り分け

2. **データ加工オプション**
   - メッセージの自動カテゴリ分類
   - 特定のフォーマットの自動解析

3. **通知機能**
   - 転記完了時の通知
   - エラー発生時の管理者通知

4. **管理機能**
   - 転記ルールの動的設定
   - 転記履歴の管理

## デプロイ設定（Render.com）

### ビルド設定
```yaml
buildCommand: npm install && npm run build
startCommand: npm start
```

### 環境変数設定
- Renderダッシュボードで設定
- 本番環境と開発環境で別々に管理

### 監視設定
- Renderの標準ログ機能を使用
- エラー通知をSlackに連携