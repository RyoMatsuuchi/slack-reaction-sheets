import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment variable validation
const requiredEnvVars = [
  'SLACK_BOT_TOKEN',
  'SLACK_SIGNING_SECRET',
  'GOOGLE_SPREADSHEET_ID',
  'GOOGLE_SERVICE_ACCOUNT_KEY',
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config = {
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN!,
    signingSecret: process.env.SLACK_SIGNING_SECRET!,
  },
  google: {
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    serviceAccountKey: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!),
  },
  app: {
    port: parseInt(process.env.PORT || '3000', 10),
    targetReaction: process.env.TARGET_REACTION || 'white_check_mark',
    logLevel: process.env.LOG_LEVEL || 'info',
    nodeEnv: process.env.NODE_ENV || 'development',
  },
} as const;