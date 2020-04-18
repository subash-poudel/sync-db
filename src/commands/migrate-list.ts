import { Command } from '@oclif/command';
import { bold, grey, red, cyan, yellow } from 'chalk';

import { printLine, printError } from '../util/io';
import { loadConfig, resolveConnections } from '..';
import { log } from '../util/logger';
import { MigrationListParams, MigrationListResult } from '../service/migrator';

/**
 * Migration command handler.
 */
class MigrateList extends Command {
  static description = 'List migrations.';

  getParams(): MigrationListParams {
    return {
      onSuccess: async (result: MigrationListResult) => {
        await printLine(bold(` ▸ ${result.connectionId}`));

        const [list1, list2] = result.data;
        const ranCount = list1.length;
        const remainingCount = list2.length;

        // Completed migrations.
        for (const item of list1) {
          await printLine(cyan(`   • ${item}`));
        }

        // Remaining Migrations
        for (const item of list2) {
          await printLine(grey(`   - ${item}`));
        }

        if (ranCount === 0 && remainingCount === 0) {
          await printLine(yellow('   No migrations.'));
        } else if (remainingCount > 0) {
          await printLine(yellow(`\n   ${list2.length} migrations yet to be run.`));
        }

        await printLine();
      },
      onFailed: async (result: MigrationListResult) => {
        printLine(bold(red(` ▸ ${result.connectionId} - Failed`)));

        await printError(`   ${result.error}\n`);
      }
    };
  }

  /**
   * CLI command execution handler.
   *
   * @returns {Promise<void>}
   */
  async run(): Promise<void> {
    const params = this.getParams();

    const config = await loadConfig();
    const connections = await resolveConnections();
    const { migrateList } = await import('../api');

    const results = await migrateList(config, connections, params);

    const failedCount = results.filter(({ success }) => !success).length;
    const exitCode = failedCount === 0 ? 0 : -1;

    process.exit(exitCode);
  }
}

export default MigrateList;
