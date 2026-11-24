import type { Product, ReplenishmentSuggestion, Sale, StockTransfer, Store, StoreStock } from './types';

const SALES_LOOKBACK_DAYS = 30;
const COVERAGE_DAYS = 7;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function buildReplenishmentSuggestions(params: {
  products: Product[];
  stores: Store[];
  storeStock: StoreStock[];
  transfers: StockTransfer[];
  sales: Sale[];
  now?: Date;
}): ReplenishmentSuggestion[] {
  const now = params.now ?? new Date();
  const salesCutoff = now.getTime() - SALES_LOOKBACK_DAYS * DAY_IN_MS;
  const salesByStoreAndProduct = new Map<string, number>();
  const stockByStoreAndProduct = new Map<string, number>();
  const inTransitByStoreAndProduct = new Map<string, number>();
  const availableByProduct = new Map(params.products.map(product => [product.id, Math.max(0, product.stock)]));

  const keyFor = (storeId: string, productId: string) => `${storeId}\u0000${productId}`;

  for (const stock of params.storeStock) {
    stockByStoreAndProduct.set(keyFor(stock.storeId, stock.productId), stock.quantity);
  }

  for (const transfer of params.transfers) {
    if (transfer.status === 'RECEIVED') continue;
    const key = keyFor(transfer.toStoreId, transfer.productId);
    inTransitByStoreAndProduct.set(key, (inTransitByStoreAndProduct.get(key) ?? 0) + transfer.quantity);
  }

  for (const sale of params.sales) {
    if (sale.status !== 'COMPLETED' || !sale.storeId) continue;
    const saleDate = new Date(sale.date || sale.createdAt).getTime();
    if (!Number.isFinite(saleDate) || saleDate < salesCutoff || saleDate > now.getTime()) continue;
    for (const item of sale.items) {
      const key = keyFor(sale.storeId, item.productId);
      salesByStoreAndProduct.set(key, (salesByStoreAndProduct.get(key) ?? 0) + item.quantity);
    }
  }

  const activeStores = params.stores
    .filter(store => store.type === 'STORE' && store.status === 'ACTIVE')
    .sort((first, second) => first.name.localeCompare(second.name));
  const suggestions: ReplenishmentSuggestion[] = [];

  for (const store of activeStores) {
    for (const product of params.products) {
      const key = keyFor(store.id, product.id);
      const currentStock = stockByStoreAndProduct.get(key) ?? 0;
      const inTransitQuantity = inTransitByStoreAndProduct.get(key) ?? 0;
      const minimumStock = Math.max(0, product.minStock);
      const recentSales = salesByStoreAndProduct.get(key) ?? 0;
      const salesCoverage = Math.ceil(recentSales * COVERAGE_DAYS / SALES_LOOKBACK_DAYS);
      const targetStock = Math.max(
        minimumStock,
        product.maxStock ?? minimumStock * 2,
        salesCoverage
      );
      const requestedQuantity = Math.max(0, targetStock - currentStock - inTransitQuantity);

      if (currentStock + inTransitQuantity > minimumStock || requestedQuantity === 0) continue;

      const availableQuantity = availableByProduct.get(product.id) ?? 0;
      const suggestedQuantity = Math.min(requestedQuantity, availableQuantity);
      availableByProduct.set(product.id, availableQuantity - suggestedQuantity);
      suggestions.push({
        storeId: store.id,
        storeName: store.name,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        currentStock,
        inTransitQuantity,
        minimumStock,
        targetStock,
        recentSales,
        requestedQuantity,
        availableQuantity,
        suggestedQuantity
      });
    }
  }

  return suggestions;
}
