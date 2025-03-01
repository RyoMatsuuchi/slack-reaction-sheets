# Slackアプリ設定手順

## 1. Slackアプリの基本設定

### アプリの作成
1. [Slack API: Applications](https://api.slack.com/apps) にアクセス
2. "Create New App" をクリック
3. "From scratch" を選択
4. アプリ名とワークスペースを設定

### 基本情報の設定
1. "Basic Information" ページで以下を確認
   - `Signing Secret`をコピー（`SLACK_SIGNING_SECRET`として使用）
   - アプリケーションの基本情報を設定

## 2. 権限の設定

### Bot Token Scopes
"OAuth & Permissions" ページで以下のスコープを追加：
- `reactions:read`: リアクションの読み取り
- `channels:history`: メッセージ履歴の読み取り
- `chat:write`: メッセージの送信
- `channels:read`: チャンネル情報の読み取り
- `groups:history`: プライベートチャンネルの履歴読み取り
- `groups:read`: プライベートチャンネル情報の読み取り

## 3. イベントの設定

### Event Subscriptions
1. "Event Subscriptions" をオンに設定
2. Request URLを設定
   ```
   https://あなたのドメイン/slack/events
   ```
   ※開発時は`ngrok`などのトンネリングサービスを使用

### Subscribe to bot events
以下のイベントを追加：
- `reaction_added`: リアクションが追加された時
- `reaction_removed`: リアクションが削除された時（オプション）

## 4. アプリのインストール

1. "Install to Workspace" をクリック
2. 認証を承認
3. `Bot User OAuth Token`をコピー（`SLACK_BOT_TOKEN`として使用）

## 5. 環境変数の設定

.envファイルに以下を設定：
```bash
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_SIGNING_SECRET=your-signing-secret
```

## 6. 動作確認

1. アプリケーションを起動
   ```bash
   npm start
   ```

2. Slackでテスト
   - ボットをチャンネルに招待: `/invite @ボット名`
   - メッセージを投稿
   - ✅リアクションを追加

3. スプレッドシートで確認
   - 新しい行が追加されているか確認
   - リンクが機能するか確認

## トラブルシューティング

### イベントが届かない場合
1. Request URLの設定を確認
2. アプリがオンラインか確認
3. ボットがチャンネルに参加しているか確認

### 認証エラーの場合
1. トークンとシークレットが正しいか確認
2. 必要なスコープが付与されているか確認
3. ボットトークンを使用しているか確認

### その他の問題
- アプリケーションのログを確認
- Slack App管理画面でイベントの配信状況を確認
- ネットワーク接続とファイアウォールの設定を確認