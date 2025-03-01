import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { config } from '../config';
import { SheetRow, SheetsService } from '../types';
import { logger } from '../utils/logger';
import { AppError } from '../types';

// スプレッドシートの列のインデックス定義
const COLUMN_INDEX = {
  NUMBER: 0,        // A列: #
  SYSTEM: 1,        // B列: システム
  DATE: 2,         // C列: 発生日
  ORIGIN: 3,       // D列: 起点(リンク等)
  ASSIGNEE1: 4,    // E列: 対応者1
  ASSIGNEE2: 5,    // F列: 対応者2
  ASSIGNEE3: 6,    // G列: 対応者3
  CONTENT: 7,      // H列: 内容
  COMPLETED: 8,    // I列: 完了
  HIDDEN: 9,       // J列: 非表示
  RESULT: 10,      // K列: 調査結果/対応結果
  ISSUE: 11,       // L列: Support Issue
  SCREEN1: 12,     // M列: 関連画面1
  SCREEN2: 13,     // N列: 関連画面2
  SCREEN3: 14,     // O列: 関連画面3
  TABLE1: 15,      // P列: 関連テーブル1
  TABLE2: 16,      // Q列: 関連テーブル2
  TABLE3: 17,      // R列: 関連テーブル3
} as const;

// スプレッドシートのヘッダー定義
const HEADERS = [
  '#',
  'システム',
  '発生日',
  '起点\n(リンク等)',
  '対応者1',
  '対応者2',
  '対応者3',
  '内容',
  '完了',
  '非表示',
  '調査結果\n対応結果',
  'Support Issue',
  '関連画面1',
  '関連画面2',
  '関連画面3',
  '関連テーブル1',
  '関連テーブル2',
  '関連テーブル3'
];

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
          headerValues: HEADERS,
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

  // イベントの重複チェック用セット
  private readonly processedEvents: Set<string> = new Set();

  private async findLastRowWithData(): Promise<number> {
    const sheet = this.doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    
    // 下から上に向かって最初の発生日データを探す
    for (let i = rows.length - 1; i >= 0; i--) {
      const dateValue = rows[i].get('発生日');
      
      if (dateValue && dateValue.trim() !== '') {
        logger.debug('Found last row with date:', {
          rowIndex: i,
          dateValue: dateValue
        });
        // 見つかった行の次の行を返す
        return i + 2; // 0-basedのインデックスなので+2
      }
    }
    
    logger.debug('No rows with date found, starting from row 1');
    return 1; // データが見つからない場合は1（ヘッダーの次の行）を返す
  }

  formatDateForSheet(date: Date): string {
    return date.toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split(' ')[0]; // 日付部分のみを取得
  }

  // イベントの重複チェック
  isEventProcessed(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  // イベントを処理済みとしてマーク
  markEventAsProcessed(eventId: string): void {
    this.processedEvents.add(eventId);
    // 1時間後に自動的に削除（メモリ管理）
    setTimeout(() => {
      this.processedEvents.delete(eventId);
    }, 3600000);
  }

  async appendRow(row: Partial<SheetRow>): Promise<void> {
    await this.initialize();

    try {
      const sheet = this.doc.sheetsByIndex[0];
      const lastRowWithData = await this.findLastRowWithData();

      const rowData = {
        '#': '',  // A列は空欄にしてスプレッドシート側で管理
        'システム': row['システム'] || '',
        '発生日': row['発生日'] || '',
        '起点\n(リンク等)': row['起点\n(リンク等)'] || '',
        '対応者1': row['対応者1'] || '',
        '対応者2': '',
        '対応者3': '',
        '内容': row['内容'] || '',
        '完了': row['完了'] || '',
        '非表示': '',
        '調査結果\n対応結果': '',
        'Support Issue': '',
        '関連画面1': '',
        '関連画面2': '',
        '関連画面3': '',
        '関連テーブル1': '',
        '関連テーブル2': '',
        '関連テーブル3': '',
      };

      // C列の最終行の次の行の位置を計算
      const targetRowIndex = lastRowWithData;
      logger.debug('Target row index:', { targetRowIndex });

      // シートの行数を確認
      const totalRows = sheet.rowCount;
      logger.debug('Total rows in sheet:', { totalRows });

      // 必要に応じて行を追加（行数が足りない場合）
      if (targetRowIndex >= totalRows) {
        // 行数が足りないので行を追加（列数は現在の値を維持）
        await sheet.resize({ 
          rowCount: targetRowIndex + 1,
          columnCount: sheet.columnCount
        });
        logger.debug('Resized sheet to add more rows:', { 
          newRowCount: targetRowIndex + 1,
          columnCount: sheet.columnCount
        });
      }

      // セルを直接ロード
      await sheet.loadCells({
        startRowIndex: targetRowIndex,
        endRowIndex: targetRowIndex + 1,
        startColumnIndex: 0,
        endColumnIndex: HEADERS.length
      });
      logger.debug('Loaded cells for target row');

      // 各カラムにデータを設定（A列は除外）
      HEADERS.forEach((header, index) => {
        // A列（#）は上書きしない
        if (header !== '#') {
          const cell = sheet.getCell(targetRowIndex, index);
          cell.value = rowData[header] || '';
        }
      });

      // 変更を保存
      await sheet.saveUpdatedCells();
      logger.debug('Saved cell data:', rowData);

      logger.info('Successfully added row to sheet', {
        rowNumber: lastRowWithData,
        content: row['内容'],
        date: row['発生日']
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
      const lastRowWithData = await this.findLastRowWithData();
      return lastRowWithData;
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
      await sheet.loadCells(`A1:R1`); // A-Rは18列分

      // ヘッダーの書式設定
      for (let i = 0; i < HEADERS.length; i++) {
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

export const createSheetsService = (): SheetsService => {
  return new SheetsServiceImpl();
};
