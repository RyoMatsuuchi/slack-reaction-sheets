// Slack Types
export interface SlackMessage {
  ts: string;
  user: string;
  text: string;
  channel: string;
  team?: string;
  permalink?: string;  // メッセージへのパーマリンク
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
  "#": number;                     // A列: 通し番号
  "システム": string;              // B列: システム
  "発生日": string;                // C列: 発生日
  "起点\n(リンク等)": string;      // D列: 起点
  "対応者1": string;               // E列
  "対応者2": string;               // F列
  "対応者3": string;               // G列
  "内容": string;                  // H列: メッセージ内容
  "完了": string;                  // I列
  "非表示": string;                // J列
  "調査結果\n対応結果": string;    // K列
  "Support Issue": string;         // L列
  "関連画面1": string;             // M列
  "関連画面2": string;             // N列
  "関連画面3": string;             // O列
  "関連テーブル1": string;         // P列
  "関連テーブル2": string;         // Q列
  "関連テーブル3": string;         // R列
}

// Service Interfaces
export interface SlackService {
  getMessageInfo(channel: string, timestamp: string): Promise<SlackMessage>;
  getUserInfo(userId: string): Promise<string>;
  getChannelInfo(channelId: string): Promise<string>;
  getPermalink(channel: string, timestamp: string): Promise<string>;
  getChannelType(channelId: string): Promise<string>;
}

export interface SheetsService {
  appendRow(row: Partial<SheetRow>): Promise<void>;
  getLastRow(): Promise<number>;
  formatHeaders(): Promise<void>;
  isEventProcessed(eventId: string): boolean;
  markEventAsProcessed(eventId: string): void;
  formatDateForSheet(date: Date): string;
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
