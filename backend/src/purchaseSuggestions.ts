import type { Product, PurchaseOrder, PurchaseSuggestion, Sale, StockTransfer, Store, StoreStock } from './types';

const SALES_LOOKBACK_DAYS = 30;
const COVERAGE_DAYS = 7;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function buildPurchaseSuggestions(params: {
  products: Product[];
  sales: Sale[];
  orders: PurchaseOrder[];
  stores: Store[];
  storeStock: StoreStock[];
  transfers: StockTransfer[];
  now?: Date;
}): PurchaseSuggestion[] {
  const now = params.now ?? new Date();
  const salesCutoff = now.getTime() - SALES_LOOKBACK_DAYS * DAY_IN_MS;
  const recentSalesByProduct = new Map<string, number>();
  const recentSalesByStoreAndProduct = new Map<string, number>();
  const stockByStoreAndProduct = new Map(params.storeStock.map(stock => [
    `${stock.storeId}\u0000${stock.productId}`,
    stock.quantity
  ]));
  const inTransitByStoreAndProduct = new Map<string, number>();
  const openOrderQuantityByProduct = new Map<string, number>();

  for (const transfer of params.transfers) {
    if (transfer.status === 'RECEIVED') continue;
    const key = `${transfer.toStoreId}\u0000${transfer.productId}`;
    inTransitByStoreAndProduct.set(key, (inTransitByStoreAndProduct.get(key) ?? 0) + transfer.quantity);
  }

  for (const sale of params.sales) {
    if (sale.status !== 'COMPLETED') continue;
    const saleDate = new Date(sale.date || sale.createdAt).getTime();
    if (!Number.isFinite(saleDate) || saleDate < salesCutoff || saleDate > now.getTime()) continue;
    for (const item of sale.items) {
      recentSalesByProduct.set(item.productId, (recentSalesByProduct.get(item.productId) ?? 0) + item.quantity);
      if (sale.storeId) {
        const key = `${sale.storeId}\u0000${item.productId}`;
        recentSalesByStoreAndProduct.set(key, (recentSalesByStoreAndProduct.get(key) ?? 0) + item.quantity);
      }
    }
  }

  for (const order of params.orders) {
    if (order.status !== 'DRAFT' && order.status !== 'ISSUED') continue;
    for (const item of order.items) {
      openOrderQuantityByProduct.set(item.productId, (openOrderQuantityByProduct.get(item.productId) ?? 0) + item.quantity);
    }
  }

  const activeStores = params.stores.filter(store => store.type === 'STORE' && store.status === 'ACTIVE');

  return params.products.flatMap(product => {
    const minimumStock = Math.max(0, product.minStock);
    const recentSales = recentSalesByProduct.get(product.id) ?? 0;
    const forecastStock = Math.ceil(recentSales * COVERAGE_DAYS / SALES_LOOKBACK_DAYS);
    const targetStock = Math.max(minimumStock, product.maxStock ?? minimumStock * 2, forecastStock);
    const centralStock = Math.max(0, product.stock);
    const openOrderQuantity = openOrderQuantityByProduct.get(product.id) ?? 0;

    const storeDemand = activeStores.reduce((total, store) => {
      const key = `${store.id}\u0000${product.id}`;
      const storeQuantity = stockByStoreAndProduct.get(key) ?? 0;
      const inTransitQuantity = inTransitByStoreAndProduct.get(key) ?? 0;
      if (storeQuantity + inTransitQuantity > minimumStock) return total;

      const storeSales = recentSalesByStoreAndProduct.get(key) ?? 0;
      const storeForecast = Math.ceil(storeSales * COVERAGE_DAYS / SALES_LOOKBACK_DAYS);
      const storeTarget = Math.max(minimumStock, product.maxStock ?? minimumStock * 2, storeForecast);
      return total + Math.max(0, storeTarget - storeQuantity - inTransitQuantity);
    }, 0);

    const requestedQuantity = Math.max(0, targetStock + storeDemand - centralStock - openOrderQuantity);
    if (requestedQuantity === 0) return [];

    return [{
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      category: product.category,
      unit: product.unit,
      centralStock,
      minimumStock,
      targetStock,
      recentSales,
      openOrderQuantity,
      storeDemand,
      requestedQuantity
    }];
  }).sort((first, second) => second.requestedQuantity - first.requestedQuantity || first.productName.localeCompare(second.productName));
}
