import { MongoClient, type Document } from 'mongodb';
import type { DatabaseSchema } from './dataStore';
import type { AuditLogEvent } from '../src/types';

let client: MongoClient | undefined;
let connection: Promise<MongoClient> | undefined;
let connected = false;
let auditIndexesReady: Promise<void> | undefined;
type MongoRecord = Document & { _id: string };

function getMongoClient(): MongoClient {
  if (!client) {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
    client = new MongoClient(uri);
    client.on('close', () => {
      connected = false;
    });
  }
  return client;
}

async function getMongoDatabase() {
  const mongoClient = getMongoClient();
  if (!connection) {
    connection = mongoClient.connect().then((connectedClient) => {
      connected = true;
      return connectedClient;
    }).catch((error) => {
      connection = undefined;
      throw error;
    });
  }

  const connectedClient = await connection;
  const uriDatabase = new URL(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017').pathname.slice(1);
  return connectedClient.db(process.env.MONGODB_DATABASE || uriDatabase || 'phantom_erp');
}

export async function loadDatabaseSnapshot(): Promise<DatabaseSchema | null> {
  const database = await getMongoDatabase();
  const legacySnapshot = await database.collection<{ _id: string; data: DatabaseSchema }>('erp_state').findOne({ _id: 'primary' });
  if (legacySnapshot?.data) {
    return legacySnapshot.data;
  }

  const [products, categories, suppliers, customers, inventoryMovements, quotes, sales, users, settings, metadata] = await Promise.all([
    database.collection<MongoRecord>('products').find().toArray(),
    database.collection<MongoRecord>('categories').find().toArray(),
    database.collection<MongoRecord>('suppliers').find().toArray(),
    database.collection<MongoRecord>('customers').find().toArray(),
    database.collection<MongoRecord>('inventory_movements').find().toArray(),
    database.collection<MongoRecord>('quotes').find().toArray(),
    database.collection<MongoRecord>('sales').find().toArray(),
    database.collection<MongoRecord>('users').find().toArray(),
    database.collection<MongoRecord>('company_settings').findOne({ _id: 'primary' }),
    database.collection<MongoRecord>('system_state').findOne({ _id: 'primary' })
  ]);

  if (!products.length && !categories.length && !suppliers.length && !customers.length && !inventoryMovements.length && !quotes.length && !sales.length && !users.length && !settings) {
    return null;
  }

  const removeMongoId = (records: MongoRecord[]) => records.map(({ _id, ...record }) => record);
  return {
    products: removeMongoId(products) as DatabaseSchema['products'],
    categories: removeMongoId(categories) as DatabaseSchema['categories'],
    suppliers: removeMongoId(suppliers) as DatabaseSchema['suppliers'],
    customers: removeMongoId(customers) as DatabaseSchema['customers'],
    inventoryMovements: removeMongoId(inventoryMovements) as DatabaseSchema['inventoryMovements'],
    quotes: removeMongoId(quotes) as DatabaseSchema['quotes'],
    sales: removeMongoId(sales) as DatabaseSchema['sales'],
    users: removeMongoId(users) as DatabaseSchema['users'],
    settings: settings?.value as DatabaseSchema['settings'],
    lastUpdated: String(metadata?.lastUpdated || new Date().toISOString())
  };
}

export async function saveDatabaseSnapshot(data: DatabaseSchema): Promise<void> {
  const database = await getMongoDatabase();
  const saveCollection = async <T extends { id: string }>(name: string, records: T[]) => {
    const collection = database.collection<MongoRecord>(name);
    if (records.length) {
      await collection.bulkWrite(records.map((record) => ({
        replaceOne: {
          filter: { _id: record.id },
          replacement: { ...record, _id: record.id } as MongoRecord,
          upsert: true
        }
      })));
    }
    await collection.deleteMany({ _id: { $nin: records.map((record) => record.id) } });
  };

  await Promise.all([
    saveCollection('products', data.products),
    saveCollection('categories', data.categories),
    saveCollection('suppliers', data.suppliers),
    saveCollection('customers', data.customers),
    saveCollection('inventory_movements', data.inventoryMovements),
    saveCollection('quotes', data.quotes),
    saveCollection('sales', data.sales),
    saveCollection('users', data.users),
    database.collection<MongoRecord>('company_settings').replaceOne({ _id: 'primary' }, { _id: 'primary', value: data.settings }, { upsert: true }),
    database.collection<MongoRecord>('system_state').replaceOne({ _id: 'primary' }, { _id: 'primary', lastUpdated: data.lastUpdated }, { upsert: true })
  ]);

  await database.collection<MongoRecord>('erp_state').deleteOne({ _id: 'primary' });
}

export async function saveAuditEvents(events: AuditLogEvent[]): Promise<void> {
  if (!events.length) {
    return;
  }

  const database = await getMongoDatabase();
  const collection = database.collection<MongoRecord>('audit_logs');
  if (!auditIndexesReady) {
    auditIndexesReady = Promise.all([
      collection.createIndex({ occurredAt: -1 }),
      collection.createIndex({ entity: 1, occurredAt: -1 })
    ]).then(() => undefined).catch((error) => {
      auditIndexesReady = undefined;
      throw error;
    });
  }
  await auditIndexesReady;
  await collection.insertMany(events.map((event) => ({ ...event, _id: event.id })));
}

export async function loadAuditEvents(options: {
  page: number;
  limit: number;
  entity?: string;
  action?: string;
  search?: string;
}): Promise<{ events: AuditLogEvent[]; total: number }> {
  const database = await getMongoDatabase();
  const filter: Document = {};
  if (options.entity) filter.entity = options.entity;
  if (options.action) filter.action = options.action;
  if (options.search) {
    const escapedSearch = options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchPattern = new RegExp(escapedSearch, 'i');
    filter.$or = [
      { actorName: searchPattern },
      { actorId: searchPattern },
      { entityId: searchPattern },
      { route: searchPattern }
    ];
  }

  const collection = database.collection<MongoRecord>('audit_logs');
  const [documents, total] = await Promise.all([
    collection.find(filter).sort({ occurredAt: -1 }).skip((options.page - 1) * options.limit).limit(options.limit).toArray(),
    collection.countDocuments(filter)
  ]);

  return {
    events: documents.map(({ _id, ...event }) => ({ ...event, id: String(event.id || _id) } as AuditLogEvent)),
    total
  };
}

export function getMongoStatus(): { connected: boolean; database: string } {
  const uriDatabase = new URL(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017').pathname.slice(1);
  return {
    connected,
    database: process.env.MONGODB_DATABASE || uriDatabase || 'phantom_erp'
  };
}

export async function closeMongoConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = undefined;
    connection = undefined;
    connected = false;
  }
}