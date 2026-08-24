import { MongoClient } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27018/starter-e2e";

let client: MongoClient | null = null;

export async function getDb() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client.db();
}

export async function cleanDatabase() {
  const db = await getDb();
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    await db.collection(col.name).deleteMany({});
  }
}

export async function closeDbConnection() {
  if (client) {
    await client.close();
    client = null;
  }
}
