import dotenv from 'dotenv';
import { LogLevel } from '@slack/bolt';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'SLACK_BOT_TOKEN',
  'SLACK_SIGNING_SECRET',
  'SLACK_APP_TOKEN', // Added for Socket Mode
  'GOOGLE_SPREADSHEET_ID',
  'GOOGLE_SERVICE_ACCOUNT_KEY',
] as const;

// Check for required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Parse Google service account key
let serviceAccountKey;
try {
  // We can safely assert non-null here because we checked above
  serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY as string);
} catch (error) {
  throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY format. Must be valid JSON.');
}

// Convert string log level to @slack/bolt LogLevel
const getLogLevel = (level: string): LogLevel => {
  switch (level.toLowerCase()) {
    case 'debug':
      return LogLevel.DEBUG;
    case 'info':
      return LogLevel.INFO;
    case 'warn':
      return LogLevel.WARN;
    case 'error':
      return LogLevel.ERROR;
    default:
      return LogLevel.INFO;
  }
};

// Configuration object
export const config = {
  slack: {
    // We can safely assert non-null here because we checked above
    botToken: process.env.SLACK_BOT_TOKEN as string,
    signingSecret: process.env.SLACK_SIGNING_SECRET as string,
    appToken: process.env.SLACK_APP_TOKEN as string,
  },
  google: {
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID as string,
    serviceAccountKey,
  },
  app: {
    port: parseInt(process.env.PORT || '3000', 10),
    targetReaction: process.env.TARGET_REACTION || 'white_check_mark',
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: getLogLevel(process.env.LOG_LEVEL || 'info'),
  },
};