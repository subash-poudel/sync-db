import Knex from 'knex';

import { log } from './util/logger';
import SyncConfig from './domain/SyncConfig';
import * as migratorService from './service/migrator';
import MigrationContext from './domain/MigrationContext';
import KnexMigrationSource from './migration/KnexMigrationSource';
import SqlMigrationContext from './migration/SqlMigrationContext';
import { validate } from './config';

export interface PrepareOptions {
  loadMigrations?: boolean;
  loadSqlSources?: boolean;
}

export interface PreparedRequirements {
  knexMigrationConfig: (connectionId: string) => Knex.MigratorConfig;
}

/**
 * Prepare configurations, preload requirements and validate before proceeding further.
 *
 * @param {SyncConfig} config
 * @param {PrepareOptions} options
 * @returns {Promise<PreparedRequirements>}
 */
export async function prepare(config: SyncConfig, options: PrepareOptions): Promise<PreparedRequirements> {
  log('Prepare: ', options);

  // Validate the config.
  // This might be the first step for the provided configuration for the programmatic API.
  validate(config);

  const migrationContext = await resolveMigrationContext(config, options);

  return {
    knexMigrationConfig: (connectionId: string) => ({
      tableName: config.migration.tableName,
      migrationSource: migrationContext ? new KnexMigrationSource(migrationContext.bind(connectionId)) : null
    })
  };
}

/**
 * Resolve migration context based on the migration configuration.
 *
 * @param {SyncConfig} config
 * @param {PrepareOptions} options
 * @returns {(Promise<MigrationContext | null>)}
 */
async function resolveMigrationContext(config: SyncConfig, options: PrepareOptions): Promise<MigrationContext | null> {
  if (options.loadMigrations !== true) {
    return null;
  }

  log(`Initialize migration context for sourceType: ${config.migration.sourceType}`);

  switch (config.migration.sourceType) {
    case 'sql':
      const src = await migratorService.resolveSqlMigrations(config);

      log('Available migration sources:\n%O', src);

      return new SqlMigrationContext(src);

    default:
      // TODO: We'll need to support different types of migrations eg both sql & js
      // For instance migrations in JS would have different context like JavaScriptMigrationContext.
      throw new Error(`Unsupported migration.sourceType value "${config.migration.sourceType}".`);
  }
}
