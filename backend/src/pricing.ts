import { randomUUID } from 'crypto';
import type { Product, QuoteItem } from './types';

export interface LineItemInput {
  productId: string;
  quantity: number;
  discountPercent: number;
}

export interface PricedDocument {
  items: QuoteItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * OWASP A06/A08 (diseño seguro, integridad de datos): el servidor no confía en precios,
 * costos ni totales enviados por el navegador. Toma el precio de venta y el costo del
 * catálogo y recalcula cada línea con la misma fórmula que usa la interfaz (precios con IGV incluido).
 */
export function priceLineItems(
  inputs: LineItemInput[],
  findProduct: (id: string) => Product | undefined,
  taxRate: number
): PricedDocument | { error: string } {
  const items: QuoteItem[] = [];
  for (const input of inputs) {
    const product = findProduct(input.productId);
    if (!product) {
      return { error: `El producto ${input.productId} no existe en el catálogo.` };
    }
    const total = product.sellingPrice * (1 - input.discountPercent / 100) * input.quantity;
    const subtotal = total / (1 + taxRate / 100);
    items.push({
      id: `item-${randomUUID()}`,
      productId: product.id,
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      unitPrice: product.sellingPrice,
      costPrice: product.costPrice,
      quantity: input.quantity,
      discountPercent: input.discountPercent,
      taxRate,
      subtotal: round2(subtotal),
      taxAmount: round2(total - subtotal),
      total: round2(total),
    });
  }

  const grossTotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  return {
    items,
    subtotal: round2(subtotal),
    // Misma convención que la interfaz: bruto con IGV menos subtotal sin IGV
    discountTotal: round2(grossTotal - subtotal),
    taxTotal: round2(items.reduce((sum, item) => sum + item.taxAmount, 0)),
    total: round2(items.reduce((sum, item) => sum + item.total, 0)),
  };
}
