export default {
  apple: {
    client_id: process.env.APPLE_CLIENT_ID,
    client_secret: process.env.APPLE_CLIENT_SECRET,
    mozilla_team_id: process.env.APPLE_MOZILLA_TEAM_ID,
    retry_count: 3,
  },
  database: {
    read: {
      host:
        process.env.DATABASE_READ_HOST || 'localhost',
      port: process.env.DATABASE_READ_PORT || '3306',
      user: process.env.DATABASE_READ_USER || 'root',
      password: process.env.DATABASE_READ_PASSWORD || '',
    },
    write: {
      host: process.env.DATABASE_WRITE_HOST || 'localhost',
      port: process.env.DATABASE_WRITE_PORT || '3310',
      user: process.env.DATABASE_WRITE_USER || 'root',
      password: process.env.DATABASE_WRITE_PASSWORD || '',
    },
    dbName: process.env.DATABASE || 'readitla_ril-tmp',
    tz: process.env.DATABASE_TZ || 'US/Central',
    iterationPageSize: 50,
  },
};
