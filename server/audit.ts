import { randomUUID } from 'crypto';
import type { AuditAction, AuditLogEvent } from '../src/types';
import type { DatabaseSchema } from './dataStore';

type AuditActor = { id: string; name: string };

const entityLabels: Record<string, string> = {
  products: 'Producto',
  categories: 'Categoría',
  suppliers: 'Proveedor',
  customers: 'Cliente',
  inventoryMovements: 'Movimiento de inventario',
  quotes: 'Cotización',
  sales: 'Venta',
  users: 'Usuario',
  settings: 'Configuración'
};

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(Object.entries(value).map(([key, nestedValue]) => {
    if (/password|token|secret|credential/i.test(key)) {
      return [key, '[REDACTADO]'];
    }
    return [key, sanitize(nestedValue)];
  }));
}

export function buildAuditEvents(
  before: DatabaseSchema,
  after: DatabaseSchema,
  actor: AuditActor,
  request: { method: string; path: string; ip: string }
): AuditLogEvent[] {
  const events: AuditLogEvent[] = [];
  const occurredAt = new Date().toISOString();
  const collectionNames = Object.keys(entityLabels).filter((key) => key !== 'settings');

  for (const collectionName of collectionNames) {
    const previousRecords = (before[collectionName as keyof DatabaseSchema] || []) as Array<{ id: string }>;
    const currentRecords = (after[collectionName as keyof DatabaseSchema] || []) as Array<{ id: string }>;
    const previousById = new Map(previousRecords.map((record) => [record.id, record]));
    const currentById = new Map(currentRecords.map((record) => [record.id, record]));
    const recordIds = new Set([...previousById.keys(), ...currentById.keys()]);

    for (const entityId of recordIds) {
      const previous = previousById.get(entityId);
      const current = currentById.get(entityId);
      if (JSON.stringify(previous) === JSON.stringify(current)) {
        continue;
      }

      const action: AuditAction = !previous ? 'create' : !current ? 'delete' : 'update';
      events.push({
        id: randomUUID(),
        occurredAt,
        actorId: actor.id,
        actorName: actor.name,
        action,
        entity: entityLabels[collectionName],
        entityId,
        method: request.method,
        route: request.path,
        ipAddress: request.ip,
        ...(previous ? { before: sanitize(previous) } : {}),
        ...(current ? { after: sanitize(current) } : {})
      });
    }
  }

  if (JSON.stringify(before.settings) !== JSON.stringify(after.settings)) {
    events.push({
      id: randomUUID(),
      occurredAt,
      actorId: actor.id,
      actorName: actor.name,
      action: 'update',
      entity: entityLabels.settings,
      entityId: 'primary',
      method: request.method,
      route: request.path,
      ipAddress: request.ip,
      before: sanitize(before.settings),
      after: sanitize(after.settings)
    });
  }

  return events;
}