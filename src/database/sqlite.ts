import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import { localSchemaSql } from './schema';
import { seedDemoData } from './seed';

const DATABASE_NAME = 'flowpilot.db';
const MEMORY_DATABASE_NAME = ':memory:';

const processEnv = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env;

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export type AppDatabase = SQLite.SQLiteDatabase;

function getDatabaseName(): string {
  if (Platform.OS !== 'web') {
    return DATABASE_NAME;
  }

  return processEnv?.EXPO_PUBLIC_PERSIST_WEB_SQLITE === '1' ? DATABASE_NAME : MEMORY_DATABASE_NAME;
}

export async function getDatabase(): Promise<AppDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(getDatabaseName()).then(async (database) => {
      await initializeDatabase(database);
      return database;
    });
  }

  return databasePromise;
}

export async function initializeDatabase(database: AppDatabase): Promise<void> {
  await database.execAsync(localSchemaSql);
  await seedDemoData(database);
}
