import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { seedRealTeam } from './seed-real-team.js';
import { logger } from '../config/logger.js';

async function seed() {
  logger.info('Starting enterprise seed for Exelon Circuits...');
  await seedRealTeam();
  logger.info('Seed completed successfully.');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error({ err }, 'Seed execution failed');
    process.exit(1);
  });
