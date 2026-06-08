/**
 * Unit tests for database initialization
 */
import { initializeDB, getDatabase } from '../../db/init';

describe('Database', () => {
  describe('initializeDB', () => {
    it('should initialize database successfully', async () => {
      await expect(initializeDB()).resolves.not.toThrow();
    });

    it('should create database tables', async () => {
      await initializeDB();
      const db = getDatabase();
      expect(db).toBeDefined();
    });
  });
});
