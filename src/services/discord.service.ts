import { config } from "../config";
import { logger } from "../utils/logger";

export interface DiscordNotification {
  inquiryNumber: string;
  content: string;
  slackLink: string;
  system: string;
  date: string;
}

export async function sendDiscordNotification(
  notification: DiscordNotification,
): Promise<void> {
  const webhookUrl = config.discord.webhookUrl;
  if (!webhookUrl) {
    logger.debug("Discord webhook URL not configured, skipping notification");
    return;
  }

  const contentPreview = notification.content
    .substring(0, 300)
    .replace(/\n/g, " ");
  const message = `新しい問い合わせ #${notification.inquiryNumber} が登録されました。\n\n**システム**: ${notification.system}\n**発生日**: ${notification.date}\n**内容**: ${contentPreview}${notification.content.length > 300 ? "..." : ""}\n**Slackリンク**: ${notification.slackLink}\n\n調査を開始してください。`;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error("Discord webhook failed:", {
        status: response.status,
        statusText: response.statusText,
        body,
      });
    } else {
      logger.info(
        "Discord notification sent for inquiry #" + notification.inquiryNumber,
      );
    }
  } catch (error) {
    // Discord通知の失敗は致命的ではないのでログのみ
    logger.error("Failed to send Discord notification:", error);
  }
}
