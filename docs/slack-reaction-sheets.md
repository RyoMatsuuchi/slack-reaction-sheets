# Slack Reaction to Google Sheets Sync

## システム概要

Slackの特定のリアクションが付けられたメッセージを自動的にGoogleスプレッドシートに転記するシステム

### 目的
- Slackでの重要な情報や記録すべき内容を、自動的にスプレッドシートに集約
- 情報の一元管理と後から参照しやすい形での保存を実現

## システム設計

### アーキテクチャ
- Node.js + TypeScriptによるサーバーレスアプリケーション
- Socket ModeまたはHTTPモードに対応したイベント駆動型アーキテクチャ
- 開発環境と本番環境で異なる動作モードをサポート

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
   - ユーザーの表示名（display_name）の取得

3. **スプレッドシート操作サービス**
   - Google Sheets APIを使用したデータ書き込み
   - スプレッドシートのフォーマット管理
   - 特定の行への挿入機能

### 動作モード

1. **Socket Mode（開発環境向け）**
   - WebSocketベースの双方向通信
   - ファイアウォール内での動作が可能
   - App Level Tokenが必要
   - 開発時のデバッグに適する

2. **HTTP Mode（本番環境向け）**
   - 標準的なHTTPエンドポイントを使用
   - パブリックなURLが必要
   - Renderなどのホスティングサービスに最適
   - 15分ルールの影響を受けにくい

### データフロー
1. Slackでメッセージにリアクションが追加される
2. Socket ModeまたはHTTP経由でアプリケーションにイベントが通知
3. メッセージ情報を取得・整形
4. Google Sheetsに転記

### スプレッドシートの構造
| # | システム | 発生日 | 起点(リンク等) | 対応者1 | 対応者2 | 対応者3 | 内容 | 完了 | 非表示 | 調査結果/対応結果 | Support Issue | 関連画面1 | 関連画面2 | 関連画面3 | 関連テーブル1 | 関連テーブル2 | 関連テーブル3 |
|---|----------|--------|---------------|---------|---------|---------|------|------|--------|-------------------|---------------|-----------|-----------|-----------|--------------|--------------|--------------|
| 通し番号 | i-backyard | YYYY/MM/DD | Slack(リンク) | 投稿者の表示名 |  |  | メッセージ本文 |  |  |  |  |  |  |  |  |  |  |

## データ挿入の仕様

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

### Slackユーザー情報の取得
- 優先順位:
  1. 表示名（display_name）: ユーザーが自分で設定した表示名
  2. 実名（real_name）: Slackに登録されている実名
  3. ユーザー名（name）: Slackのユーザー名（通常はメールアドレスのユーザー部分）

## セットアップ要件

### Slack設定
1. **必要なスコープ**
   - `reactions:read`
   - `channels:history`
   - `groups:history`
   - `users:read` (ユーザー情報取得用)

2. **動作モード別の設定**
   - Socket Mode:
     - Socket Modeを有効化
     - App Level Tokenを生成
   - HTTP Mode:
     - Event Subscriptionsを有効化
     - Request URLを設定: `https://your-app.onrender.com/slack/events`

### Google Cloud設定
1. **必要なAPI**
   - Google Sheets API
   - Google Drive API（スプレッドシートの作成・編集用）

### 環境変数
```
# Slack設定
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SOCKET_MODE=true/false  # 動作モードの選択
SLACK_APP_TOKEN=xapp-... (Socket Mode時のみ必要)

# Google Sheets設定
GOOGLE_SPREADSHEET_ID=...
GOOGLE_SERVICE_ACCOUNT_KEY=...

# アプリケーション設定
TARGET_REACTION=white_check_mark
PORT=3000  # HTTP Mode時のポート番号
NODE_ENV=development/production
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
- Socket Mode: false（HTTP Modeで動作）
- 本番環境用の設定を適用

### 監視設定
- Renderの標準ログ機能を使用
- エラー通知をSlackに連携
