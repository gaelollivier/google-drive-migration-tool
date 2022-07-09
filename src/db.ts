import { Db, MongoClient } from 'mongodb';

// based on https://github.com/vercel/next.js/blob/7035a036abb02af7aaee7a0a9ef545b91856a4eb/examples/with-mongodb/util/mongodb.js#L28

let cachedClient: Promise<{ client: MongoClient; db: Db }> = (global as any)
  .mongoClient;

const DB_NAME = 'migrate_tool';

export const getDb = async (): Promise<{ client: MongoClient; db: Db }> => {
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = new MongoClient(process.env['MONGO_URL'] ?? '', {})
    .connect()
    .then((client) => ({
      client,
      db: client.db(DB_NAME),
    }));

  (global as any).mongoClient = cachedClient;
  return cachedClient;
};

export async function runDbQuery<Res>(
  fn: (db: Db) => Promise<Res>
): Promise<Res> {
  const db = await getDb();
  // NOTE: Previous implementation was closing the connection after the query, but this turned
  // out to be less efficient as opening a new connection every time is slow
  return fn(db.db);
}
