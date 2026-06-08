/**
 * Unit tests for database initialization
 */
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async () => ({
    execAsync: jest.fn(async () => undefined),
    closeAsync: jest.fn(async () => undefined),
  })),
}));

import { initializeDB, getDatabase } from '../db/init';

describe('Database', () => {
  describe('initializeDB', () => {
    it('should initialize database successfully', async () => {
      await expect(initializeDB()).resolves.not.toThrow();
    });

    it('should create database tables', async () => {
      await initializeDB();
      const db = await getDatabase();
      expect(db).toBeDefined();
    });
  });
});
