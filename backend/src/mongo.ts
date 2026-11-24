import 'dotenv/config';
import { MongoClient, type Document } from 'mongodb';
import type { DatabaseSchema } from './dataStore';
import type { AuditLogEvent } from './types';

let client: MongoClient | undefined;
let connection: Promise<MongoClient> | undefined;
let connected = false;
let auditIndexesReady: Promise<void> | undefined;

type MongoRecord = Document & { _id: string };

function isDemoMode(): boolean {
  return process.env.PHANTOM_DEMO_MODE === 'true';
}

function getRequiredMongoUri(): string {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error('La variable de entorno MONGODB_URI no está configurada. Defínala en el archivo .env.');
  }
  return uri;
}

function getConfiguredDatabaseName(): string {
  const uri = getRequiredMongoUri();
  let uriDatabase = '';
  try {
    uriDatabase = new URL(uri).pathname.slice(1);
  } catch {
    uriDatabase = '';
  }
  const database = process.env.MONGODB_DATABASE || uriDatabase || 'phantom_erp';
  if (isDemoMode() && database !== 'phantom_erp_demo') {
    throw new Error('PHANTOM_DEMO_MODE requiere MONGODB_DATABASE=phantom_erp_demo');
  }
  return database;
}

function getMongoClient(): MongoClient {
  if (!client) {
    const uri = getRequiredMongoUri();
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    client.on('close', () => {
      connected = false;
    });
  }
  return client;
}

async function getMongoDatabase() {
  const mongoClient = getMongoClient();
  if (!connection) {
    connection = mongoClient
      .connect()
      .then((connectedClient) => {
        connected = true;
        return connectedClient;
      })
      .catch((error) => {
        connected = false;
        connection = undefined;
        try {
          void mongoClient.close();
        } catch {}
        client = undefined;
        throw error;
      });
  }

  const connectedClient = await connection;
  return connectedClient.db(getConfiguredDatabaseName());
}

export async function loadDatabaseSnapshot(): Promise<DatabaseSchema | null> {
  try {
    const database = await getMongoDatabase();
    const legacySnapshot = await database
      .collection<{ _id: string; data: DatabaseSchema }>('erp_state')
      .findOne({ _id: 'primary' });
    if (legacySnapshot?.data) {
      return legacySnapshot.data;
    }

    const [
      products,
      categories,
      suppliers,
      customers,
      inventoryMovements,
      quotes,
      sales,
      users,
      stores,
      storeStock,
      stockTransfers,
      purchaseOrders,
      settings,
      metadata,
    ] = await Promise.all([
      database.collection<MongoRecord>('products').find().toArray(),
      database.collection<MongoRecord>('categories').find().toArray(),
      database.collection<MongoRecord>('suppliers').find().toArray(),
      database.collection<MongoRecord>('customers').find().toArray(),
      database.collection<MongoRecord>('inventory_movements').find().toArray(),
      database.collection<MongoRecord>('quotes').find().toArray(),
      database.collection<MongoRecord>('sales').find().toArray(),
      database.collection<MongoRecord>('users').find().toArray(),
      database.collection<MongoRecord>('stores').find().toArray(),
      database.collection<MongoRecord>('store_stock').find().toArray(),
      database.collection<MongoRecord>('stock_transfers').find().toArray(),
      database.collection<MongoRecord>('purchase_orders').find().toArray(),
      database.collection<MongoRecord>('company_settings').findOne({ _id: 'primary' }),
      database.collection<MongoRecord>('system_state').findOne({ _id: 'primary' }),
    ]);

    if (
      !products.length &&
      !categories.length &&
      !suppliers.length &&
      !customers.length &&
      !inventoryMovements.length &&
      !quotes.length &&
      !sales.length &&
      !purchaseOrders.length &&
      !users.length &&
      !settings
    ) {
      return null;
    }

    const removeMongoId = (records: MongoRecord[]) => records.map(({ _id, ...record }) => record);
    return {
      products: removeMongoId(products) as unknown as DatabaseSchema['products'],
      categories: removeMongoId(categories) as unknown as DatabaseSchema['categories'],
      suppliers: removeMongoId(suppliers) as unknown as DatabaseSchema['suppliers'],
      customers: removeMongoId(customers) as unknown as DatabaseSchema['customers'],
      inventoryMovements: removeMongoId(inventoryMovements) as unknown as DatabaseSchema['inventoryMovements'],
      quotes: removeMongoId(quotes) as unknown as DatabaseSchema['quotes'],
      sales: removeMongoId(sales) as unknown as DatabaseSchema['sales'],
      users: removeMongoId(users) as unknown as DatabaseSchema['users'],
      stores: removeMongoId(stores) as unknown as DatabaseSchema['stores'],
      storeStock: removeMongoId(storeStock) as unknown as DatabaseSchema['storeStock'],
      stockTransfers: removeMongoId(stockTransfers) as unknown as DatabaseSchema['stockTransfers'],
      purchaseOrders: removeMongoId(purchaseOrders) as unknown as DatabaseSchema['purchaseOrders'],
      settings: settings?.value as DatabaseSchema['settings'],
      lastUpdated: String(metadata?.lastUpdated || new Date().toISOString()),
    };
  } catch (error) {
    throw new Error(
      `No se pudo conectar o cargar datos desde MongoDB: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function saveDatabaseSnapshot(data: DatabaseSchema): Promise<void> {
  try {
    const database = await getMongoDatabase();
    const saveCollection = async <T extends { id: string }>(name: string, records: T[]) => {
      const collection = database.collection<MongoRecord>(name);
      if (records.length) {
        await collection.bulkWrite(
          records.map((record) => ({
            replaceOne: {
              filter: { _id: record.id },
              replacement: { ...record, _id: record.id } as unknown as MongoRecord,
              upsert: true,
            },
          }))
        );
      }
      await collection.deleteMany({ _id: { $nin: records.map((record) => record.id) } });
    };

    const storeStockCollection = database.collection<MongoRecord>('store_stock');
    const storeStockRecords = data.storeStock.map((stock) => {
      const recordId = `${stock.storeId}::${stock.productId}`;
      return { ...stock, _id: recordId } as unknown as MongoRecord;
    });
    if (storeStockRecords.length) {
      await storeStockCollection.bulkWrite(
        storeStockRecords.map((record) => ({
          replaceOne: {
            filter: { _id: record._id },
            replacement: record,
            upsert: true,
          },
        }))
      );
    }
    await storeStockCollection.deleteMany({ _id: { $nin: storeStockRecords.map((record) => record._id) } });

    await Promise.all([
      saveCollection('products', data.products),
      saveCollection('categories', data.categories),
      saveCollection('suppliers', data.suppliers),
      saveCollection('customers', data.customers),
      saveCollection('inventory_movements', data.inventoryMovements),
      saveCollection('quotes', data.quotes),
      saveCollection('sales', data.sales),
      saveCollection('users', data.users),
      saveCollection('stores', data.stores),
      saveCollection('stock_transfers', data.stockTransfers),
      saveCollection('purchase_orders', data.purchaseOrders || []),
      database
        .collection<MongoRecord>('company_settings')
        .replaceOne({ _id: 'primary' }, { _id: 'primary', value: data.settings }, { upsert: true }),
      database
        .collection<MongoRecord>('system_state')
        .replaceOne({ _id: 'primary' }, { _id: 'primary', lastUpdated: data.lastUpdated }, { upsert: true }),
    ]);

    await database.collection<MongoRecord>('erp_state').deleteOne({ _id: 'primary' });
  } catch (error) {
    throw new Error(
      `No se pudo persistir en MongoDB: ${error instanceof Error ? error.message : String(error)}`
    );
  }
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
      collection.createIndex({ entity: 1, occurredAt: -1 }),
    ])
      .then(() => undefined)
      .catch((error) => {
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
      { route: searchPattern },
    ];
  }

  const collection = database.collection<MongoRecord>('audit_logs');
  const [documents, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ occurredAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .toArray(),
    collection.countDocuments(filter),
  ]);

  return {
    events: documents.map(({ _id, ...event }) => ({ ...event, id: String(event.id || _id) }) as AuditLogEvent),
    total,
  };
}

export function getMongoStatus(): { connected: boolean; database: string } {
  return {
    connected,
    database: getConfiguredDatabaseName(),
  };
}

export async function closeMongoConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = undefined;
    connection = undefined;
    connected = false;
    auditIndexesReady = undefined;
  }
}
