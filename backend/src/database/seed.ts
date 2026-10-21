import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { seedRealTeam } from './seed-real-team.js';
import { seedRichData } from './seed-rich-data.js';
import { logger } from '../config/logger.js';

export async function runFullEnterpriseSeed() {
  logger.info('Starting enterprise seed for Exelon Circuits Pvt. Ltd....');
  await seedRealTeam();
  await seedRichData();
  logger.info('Full enterprise seed and rich dataset initialization completed successfully.');
}

if (process.argv[1] && process.argv[1].includes('seed')) {
  runFullEnterpriseSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error({ err }, 'Seed execution failed');
      process.exit(1);
    });
}
