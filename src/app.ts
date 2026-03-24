import { App as SlackApp } from "@slack/bolt";
import express from "express";
import { config } from "./config";
import { sendDiscordNotification } from "./services/discord.service";
import { createSheetsService } from "./services/sheets.service";
import { createSlackService } from "./services/slack.service";
import type { SheetRow } from "./types";
import { logger } from "./utils/logger";

logger.info("Starting Slack app with config:", {
  targetReaction: config.app.targetReaction,
  environment: config.app.nodeEnv,
});

// Create Express app
const expressApp = express();

// Add health check endpoint
expressApp.get("/health", async (req, res) => {
  try {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
    logger.debug("Health check succeeded");
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(500).json({
      status: "error",
      message: "Health check failed",
      timestamp: new Date().toISOString(),
    });
  }
});

// Create Slack app
export const app = new SlackApp({
  token: config.slack.botToken,
  signingSecret: config.slack.signingSecret,
  socketMode: config.slack.socketMode,
  ...(config.slack.socketMode && config.slack.appToken
    ? { appToken: config.slack.appToken }
    : {}),
  logLevel: config.app.logLevel,
  customRoutes: [
    {
      path: "/health",
      method: ["GET"],
      handler: (req, res) => {
        res.writeHead(200);
        res.end("OK");
      },
    },
  ],
});

// Create service instances
const sheetsService = createSheetsService();
const slackService = createSlackService();

// Handle reaction_added events
app.event("reaction_added", async ({ event }) => {
  // イベントIDを生成（重複処理防止のためのキー）
  const eventId = `${event.item.channel}-${event.item.ts}`;

  try {
    logger.info("Received reaction_added event:", {
      user: event.user,
      reaction: event.reaction,
      channel: event.item.channel,
      ts: event.item.ts,
    });

    // イベントが対象のリアクションかチェック（処理済みマーク前に行う）
    // 非ターゲットリアクションを先にスキップすることで、
    // 同一メッセージへの異なるリアクションが互いをブロックしないようにする
    if (event.reaction !== config.app.targetReaction) {
      logger.debug("Skipping non-target reaction:", event.reaction);
      return;
    }

    // イベントが既に処理済みかチェック（ターゲットリアクションのみ）
    if (sheetsService.isEventProcessed(eventId)) {
      logger.debug("Skipping already processed event:", eventId);
      return;
    }

    // チャンネルタイプを取得
    const channelType = await slackService.getChannelType(event.item.channel);

    // パブリックチャンネルまたはDMチャンネルの場合のみ処理
    if (channelType !== "public" && channelType !== "dm") {
      logger.debug(
        "Skipping message from unsupported channel type:",
        channelType,
      );
      return;
    }

    // メッセージ情報を取得
    const message = await slackService.getMessageInfo(
      event.item.channel,
      event.item.ts,
    );

    // 投稿者の情報を取得
    const username = await slackService.getUserInfo(message.user);

    // メッセージの投稿日時を取得（UNIXタイムスタンプを日時に変換）
    const messageDate = new Date(Number.parseFloat(message.ts) * 1000);
    const lastRow = await sheetsService.getLastRow();

    // スプレッドシートに追加する行データを作成
    const row: Partial<SheetRow> = {
      "#": lastRow + 1,
      システム: "i-backyard",
      発生日: sheetsService.formatDateForSheet(messageDate),
      "起点\n(リンク等)": `=HYPERLINK("${message.permalink}", "Slack")`,
      対応者1: "", // 空欄にする
      内容: `from: ${username}\n${message.text}`, // 表示名とメッセージ本文を結合
      完了: "", // 空欄にする
    };

    // スプレッドシートに行を追加
    await sheetsService.appendRow(row);

    // Discord Webhook通知を送信
    try {
      const permalink = await slackService.getPermalink(
        event.item.channel,
        event.item.ts,
      );
      await sendDiscordNotification({
        inquiryNumber: row["#"] ? String(row["#"]) : String(lastRow + 1),
        content: row["内容"] || message.text || "",
        slackLink:
          permalink ||
          `https://suzukishouten.slack.com/archives/${event.item.channel}/p${event.item.ts.replace(".", "")}`,
        system: row["システム"] || "i-backyard",
        date: row["発生日"] || new Date().toISOString().split("T")[0],
      });
    } catch (discordError) {
      logger.error("Discord notification failed (non-fatal):", discordError);
    }

    // appendRow成功後に処理済みマーク
    // これにより:
    // - appendRowが失敗した場合 → マークされていないのでSlackリトライ時に再処理可能
    // - appendRowが成功した後 → データは既に保存済みなので、以降のエラー（addReaction等）でも重複を防止
    sheetsService.markEventAsProcessed(eventId);

    // 成功時にリアクションを追加
    await slackService.addReaction(
      event.item.channel,
      event.item.ts,
      "list-added",
    );

    logger.info("Successfully processed reaction and added to spreadsheet", {
      eventTs: event.item.ts, // リアクションイベントのts
      messageTs: message.ts, // 取得したメッセージのts
      username,
      channelType,
    });
  } catch (error) {
    // 注意: エラー発生時でも処理済みマークを解除しない
    // markEventAsProcessedはappendRow成功後に呼ばれるため:
    // - appendRow失敗時: まだマークされていないのでSlackリトライ時に再処理可能
    // - appendRow成功後のエラー（addReaction等）: 既にマーク済みなのでデータ重複を防止

    logger.error("Error handling reaction_added event:", error);
    // Slackにエラー通知を送信
    if (error instanceof Error) {
      // エラー時も元メッセージへのリンクを取得（可能であれば）
      let messagePermalink: string | undefined;
      try {
        messagePermalink = await slackService.getPermalink(
          event.item.channel,
          event.item.ts,
        );
      } catch {
        // permalinkの取得に失敗してもエラー通知は送信する
      }
      await slackService.sendErrorNotification(error, {
        event: "reaction_added",
        channel: event.item.channel,
        ts: event.item.ts,
        messagePermalink,
      });
    }
  }
});

// Global error handler
app.error(async (error) => {
  logger.error("Slack app error:", error);
  // Slackにエラー通知を送信
  await slackService.sendErrorNotification(error, {
    source: "global_error_handler",
  });
});

// Start server function
export const startServer = async (): Promise<void> => {
  try {
    if (config.slack.socketMode) {
      logger.info("Starting Slack app in Socket Mode");
      await app.start();
      logger.info("Slack app is running in Socket Mode");

      // In Socket Mode, we need to start Express separately for health checks
      expressApp.listen(config.app.port, () => {
        logger.info(`Health check server listening on port ${config.app.port}`);
      });
    } else {
      logger.info("Starting Slack app in HTTP Mode");
      await app.start(config.app.port);
      logger.info(`Slack app is running on port ${config.app.port}`);
    }

    // Log successful startup details
    const authTest = await app.client.auth.test();
    logger.info("Server startup complete", {
      botId: authTest.bot_id,
      teamId: authTest.team_id,
      mode: config.slack.socketMode ? "Socket Mode" : "HTTP Mode",
    });
  } catch (error) {
    logger.error("Failed to start Slack app:", error);
    throw error;
  }
};

// Handle app shutdown
const handleShutdown = async () => {
  try {
    logger.info("Shutting down Slack app...");
    await app.stop();
    logger.info("Slack app stopped gracefully");
    process.exit(0);
  } catch (error) {
    logger.error("Error during shutdown:", error);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on("SIGTERM", handleShutdown);
process.on("SIGINT", handleShutdown);
