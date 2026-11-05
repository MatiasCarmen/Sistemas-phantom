import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient, type Document } from 'mongodb';
import type { DatabaseSchema } from './dataStore';
import type { AuditLogEvent } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.PHANTOM_DATA_DIR
  ? path.resolve(process.env.PHANTOM_DATA_DIR)
  : path.resolve(__dirname, '..', 'data');
const LOCAL_DB_FILE = path.join(DATA_DIR, 'db.json');
const LOCAL_AUDIT_FILE = path.join(DATA_DIR, 'audit.json');

let client: MongoClient | undefined;
let connection: Promise<MongoClient> | undefined;
let connected = false;
let mongoWarnedOffline = false;
let auditIndexesReady: Promise<void> | undefined;
let localAuditEvents: AuditLogEvent[] | undefined;

type MongoRecord = Document & { _id: string };

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getLocalDbFilePath(): string {
  ensureDataDir();
  return LOCAL_DB_FILE;
}

export function saveLocalSnapshot(data: DatabaseSchema): void {
  try {
    ensureDataDir();
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('[DataStore] No se pudo escribir respaldo local en data/db.json:', error);
  }
}

function getLocalAuditStore(): AuditLogEvent[] {
  if (localAuditEvents) {
    return localAuditEvents;
  }
  try {
    ensureDataDir();
    if (fs.existsSync(LOCAL_AUDIT_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_AUDIT_FILE, 'utf-8'));
      if (Array.isArray(parsed)) {
        localAuditEvents = parsed as AuditLogEvent[];
        return localAuditEvents;
      }
    }
  } catch {
    // Fallback to empty array
  }
  localAuditEvents = [];
  return localAuditEvents;
}

function saveLocalAuditStore(events: AuditLogEvent[]): void {
  try {
    ensureDataDir();
    fs.writeFileSync(LOCAL_AUDIT_FILE, JSON.stringify(events.slice(0, 1000), null, 2), 'utf-8');
  } catch {
    // Ignore local file write errors
  }
}

function getMongoClient(): MongoClient {
  if (!client) {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 2500,
      connectTimeoutMS: 2500,
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
        mongoWarnedOffline = false;
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
  const uriDatabase = new URL(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017').pathname.slice(1);
  return connectedClient.db(process.env.MONGODB_DATABASE || uriDatabase || 'phantom_erp');
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
    let localStoreData: Partial<DatabaseSchema> = {};
    if (!stores.length || !storeStock.length) {
      try {
        if (fs.existsSync(LOCAL_DB_FILE)) {
          localStoreData = JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf-8')) as Partial<DatabaseSchema>;
        }
      } catch {
        // Use defaults from DataStore when no local store snapshot is available.
      }
    }
    const resolvedStores = stores.length ? removeMongoId(stores) : (localStoreData.stores || []);
    const resolvedStoreStock = storeStock.length ? removeMongoId(storeStock) : (localStoreData.storeStock || []);
    const resolvedStockTransfers = stockTransfers.length ? removeMongoId(stockTransfers) : (localStoreData.stockTransfers || []);
    return {
      products: removeMongoId(products) as unknown as DatabaseSchema['products'],
      categories: removeMongoId(categories) as unknown as DatabaseSchema['categories'],
      suppliers: removeMongoId(suppliers) as unknown as DatabaseSchema['suppliers'],
      customers: removeMongoId(customers) as unknown as DatabaseSchema['customers'],
      inventoryMovements: removeMongoId(inventoryMovements) as unknown as DatabaseSchema['inventoryMovements'],
      quotes: removeMongoId(quotes) as unknown as DatabaseSchema['quotes'],
      sales: removeMongoId(sales) as unknown as DatabaseSchema['sales'],
      users: removeMongoId(users) as unknown as DatabaseSchema['users'],
      stores: resolvedStores as unknown as DatabaseSchema['stores'],
      storeStock: resolvedStoreStock as unknown as DatabaseSchema['storeStock'],
      stockTransfers: resolvedStockTransfers as unknown as DatabaseSchema['stockTransfers'],
      purchaseOrders: removeMongoId(purchaseOrders) as unknown as DatabaseSchema['purchaseOrders'],
      settings: settings?.value as DatabaseSchema['settings'],
      lastUpdated: String(metadata?.lastUpdated || new Date().toISOString()),
    };
  } catch {
    if (!mongoWarnedOffline) {
      mongoWarnedOffline = true;
      console.warn(
        '[ERP-Backend] MongoDB local no disponible en 127.0.0.1:27017 — operando con persistencia local (backend/data/db.json).'
      );
    }
    return null;
  }
}

export async function saveDatabaseSnapshot(data: DatabaseSchema): Promise<void> {
  // Persistir siempre respaldo en archivo local JSON
  saveLocalSnapshot(data);

  if (!connected && mongoWarnedOffline) {
    return;
  }

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
      await storeStockCollection.bulkWrite(storeStockRecords.map((record) => ({
        replaceOne: {
          filter: { _id: record._id },
          replacement: record,
          upsert: true,
        },
      })));
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
  } catch {
    if (!mongoWarnedOffline) {
      mongoWarnedOffline = true;
      console.warn('[ERP-Backend] Sincronización con MongoDB omitida (usando backend/data/db.json).');
    }
  }
}

export async function saveAuditEvents(events: AuditLogEvent[]): Promise<void> {
  if (!events.length) {
    return;
  }

  // Guardar siempre en store local para disponibilidad inmediata
  const store = getLocalAuditStore();
  store.unshift(...events);
  saveLocalAuditStore(store);

  if (!connected && mongoWarnedOffline) {
    return;
  }

  try {
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
  } catch {
    // Fallback local ya completado
  }
}

export async function loadAuditEvents(options: {
  page: number;
  limit: number;
  entity?: string;
  action?: string;
  search?: string;
}): Promise<{ events: AuditLogEvent[]; total: number }> {
  if (connected || !mongoWarnedOffline) {
    try {
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
    } catch {
      // Fallback a bitácora local si MongoDB no responde
    }
  }

  let filtered = [...getLocalAuditStore()];
  if (options.entity) {
    filtered = filtered.filter((e) => e.entity === options.entity);
  }
  if (options.action) {
    filtered = filtered.filter((e) => e.action === options.action);
  }
  if (options.search) {
    const q = options.search.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.actorName.toLowerCase().includes(q) ||
        e.actorId.toLowerCase().includes(q) ||
        e.entityId.toLowerCase().includes(q) ||
        e.route.toLowerCase().includes(q)
    );
  }

  const total = filtered.length;
  const start = (options.page - 1) * options.limit;
  const events = filtered.slice(start, start + options.limit);
  return { events, total };
}

export function getMongoStatus(): { connected: boolean; database: string } {
  const uriDatabase = new URL(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017').pathname.slice(1);
  return {
    connected,
    database: process.env.MONGODB_DATABASE || uriDatabase || 'phantom_erp',
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