import { GoogleSpreadsheet, GoogleSpreadsheetRow } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { config } from '../config';
import { SheetRow, SheetsService } from '../types';
import { logger } from '../utils/logger';
import { AppError } from '../types';

export class SheetsServiceImpl implements SheetsService {
  private doc: GoogleSpreadsheet;
  private initialized: boolean = false;

  constructor() {
    const auth = new JWT({
      email: config.google.serviceAccountKey.client_email,
      key: config.google.serviceAccountKey.private_key,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
      ],
    });

    this.doc = new GoogleSpreadsheet(config.google.spreadsheetId, auth);
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.doc.loadInfo();
      let sheet = this.doc.sheetsByIndex[0];

      // シートが存在しない場合は新規作成
      if (!sheet) {
        sheet = await this.doc.addSheet({
          title: 'Slack Messages',
          headerValues: ['Timestamp', 'User', 'Channel', 'Message', 'Reaction'],
        });
      }

      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize Google Sheets:', error);
      throw new AppError(
        'Failed to initialize Google Sheets',
        'SHEETS_INIT_ERROR',
        500
      );
    }
  }

  async appendRow(row: SheetRow): Promise<void> {
    await this.initialize();

    try {
      const sheet = this.doc.sheetsByIndex[0];
      await sheet.addRow({
        Timestamp: row.timestamp,
        User: row.user,
        Channel: row.channel,
        Message: row.message,
        Reaction: row.reaction,
      });

      logger.info('Successfully added row to sheet', {
        timestamp: row.timestamp,
        user: row.user,
        channel: row.channel,
      });
    } catch (error) {
      logger.error('Failed to append row:', error);
      throw new AppError(
        'Failed to append row to sheet',
        'SHEETS_APPEND_ERROR',
        500
      );
    }
  }

  async getLastRow(): Promise<number> {
    await this.initialize();

    try {
      const sheet = this.doc.sheetsByIndex[0];
      const rows = await sheet.getRows();
      return rows.length;
    } catch (error) {
      logger.error('Failed to get last row:', error);
      throw new AppError(
        'Failed to get last row from sheet',
        'SHEETS_READ_ERROR',
        500
      );
    }
  }

  async formatHeaders(): Promise<void> {
    await this.initialize();

    try {
      const sheet = this.doc.sheetsByIndex[0];
      await sheet.loadCells('A1:E1');

      // ヘッダーの書式設定
      for (let i = 0; i < 5; i++) {
        const cell = sheet.getCell(0, i);
        cell.textFormat = { bold: true };
        cell.backgroundColor = { red: 0.8, green: 0.8, blue: 0.8 };
      }

      await sheet.saveUpdatedCells();
      logger.info('Successfully formatted headers');
    } catch (error) {
      logger.error('Failed to format headers:', error);
      throw new AppError(
        'Failed to format sheet headers',
        'SHEETS_FORMAT_ERROR',
        500
      );
    }
  }
}

// Google Sheetsサービスのシングルトンインスタンスを作成
export const createSheetsService = (): SheetsService => {
  return new SheetsServiceImpl();
};