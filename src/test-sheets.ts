import { config } from './config';
import { logger } from './utils/logger';
import { createSheetsService } from './services/sheets.service';
import dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config();

async function testSheetsService() {
  try {
    const sheetsService = createSheetsService();
    logger.info('Testing sheets service...');

    // 最後の行を取得してログ出力
    const lastRow = await sheetsService.getLastRow();
    logger.info('Last row:', { lastRow });

    // テストデータを追加
    const testDate = new Date();
    const formattedDate = sheetsService.formatDateForSheet(testDate);
    
    logger.info('Adding test data with date:', { formattedDate });
    
    await sheetsService.appendRow({
      'システム': 'i-backyard',
      '発生日': formattedDate,
      '起点\n(リンク等)': '=HYPERLINK("https://example.com", "Slack")',
      '内容': 'テストデータ ' + new Date().toISOString(),
      '対応者1': 'テストユーザー', // テスト用の表示名
      '完了': '' // 空欄にする
    });

    // 追加後の最後の行を再度取得
    const newLastRow = await sheetsService.getLastRow();
    logger.info('New last row after append:', { newLastRow });

  } catch (error) {
    logger.error('Test failed:', error);
    if (error instanceof Error) {
      logger.error('Error details:', { 
        message: error.message,
        stack: error.stack
      });
    }
  }
}

// テストを実行
testSheetsService().then(() => {
  logger.info('Test completed');
  process.exit(0);
}).catch((error) => {
  logger.error('Test failed:', error);
  process.exit(1);
});
