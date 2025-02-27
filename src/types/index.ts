// Slack Types
export interface SlackMessage {
  ts: string;
  user: string;
  text: string;
  channel: string;
  team?: string;
}

export interface SlackReactionEvent {
  type: 'reaction_added' | 'reaction_removed';
  user: string;
  reaction: string;
  item: {
    type: 'message';
    channel: string;
    ts: string;
  };
  item_user: string;
  event_ts: string;
}

// Google Sheets Types
export interface SheetRow {
  timestamp: string;
  user: string;
  channel: string;
  message: string;
  reaction: string;
}

// Service Interfaces
export interface SlackService {
  getMessageInfo(channel: string, timestamp: string): Promise<SlackMessage>;
  getUserInfo(userId: string): Promise<string>; // Returns username
  getChannelInfo(channelId: string): Promise<string>; // Returns channel name
}

export interface SheetsService {
  appendRow(row: SheetRow): Promise<void>;
  getLastRow(): Promise<number>;
  formatHeaders(): Promise<void>;
}

// Error Types
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Configuration Types
export interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

// Logger Types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}