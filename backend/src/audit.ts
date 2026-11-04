import { createHmac, randomUUID } from 'crypto';
import type { Request } from 'express';
import { getAuditHmacKey } from './security';
import type { AuditAction, AuditLogEvent } from './types';
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

/**
 * OWASP A09: evento de seguridad (login, fallos, bloqueos, accesos denegados, logout).
 */
export function buildSecurityEvent(
  req: Request,
  action: AuditAction,
  actor: { id: string; name: string },
  subject: string,
  detail?: Record<string, unknown>
): AuditLogEvent {
  return {
    id: randomUUID(),
    occurredAt: new Date().toISOString(),
    actorId: actor.id,
    actorName: actor.name,
    action,
    entity: 'Seguridad',
    entityId: subject,
    method: req.method,
    route: req.originalUrl.split('?')[0],
    ipAddress: req.ip || 'unknown',
    ...(detail ? { after: sanitize(detail) } : {})
  };
}

// Serialización con claves ordenadas: el hash no depende del orden en que la BD devuelva los campos
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, nested]) => nested !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export const AUDIT_CHAIN_GENESIS = 'GENESIS';

export function computeAuditHash(event: AuditLogEvent, prevHash: string): string {
  const { hash: _hash, prevHash: _prev, ...content } = event as AuditLogEvent & { _id?: unknown };
  delete (content as { _id?: unknown })._id;
  return createHmac('sha256', getAuditHmacKey()).update(`${prevHash}|${stableStringify(content)}`).digest('hex');
}

/** Encadena los eventos nuevos (en orden cronológico) a partir del último hash conocido. */
export function chainAuditEvents(events: AuditLogEvent[], lastHash: string | undefined): string {
  let previous = lastHash || AUDIT_CHAIN_GENESIS;
  for (const event of events) {
    event.prevHash = previous;
    event.hash = computeAuditHash(event, previous);
    previous = event.hash;
  }
  return previous;
}

/**
 * Verifica la cadena (eventos ordenados del más antiguo al más reciente). El primer evento conservado
 * se acepta como ancla porque la bitácora local retiene solo los últimos registros.
 */
export function verifyAuditChain(events: AuditLogEvent[]): { valid: boolean; checked: number; brokenAt?: string } {
  let previous: string | undefined;
  for (const event of events) {
    if (!event.hash || !event.prevHash) {
      return { valid: false, checked: events.length, brokenAt: event.id };
    }
    if (previous !== undefined && event.prevHash !== previous) {
      return { valid: false, checked: events.length, brokenAt: event.id };
    }
    if (computeAuditHash(event, event.prevHash) !== event.hash) {
      return { valid: false, checked: events.length, brokenAt: event.id };
    }
    previous = event.hash;
  }
  return { valid: true, checked: events.length };
}
