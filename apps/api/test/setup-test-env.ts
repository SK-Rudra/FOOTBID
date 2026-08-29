import 'dotenv/config';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is required for e2e tests.');
}

const databaseName = new URL(testDatabaseUrl).pathname
  .split('/')
  .filter(Boolean)
  .at(-1);

if (databaseName !== 'footbid_test') {
  throw new Error('E2E tests must only run against the footbid_test database.');
}

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testDatabaseUrl;
