import { VoucherType } from './types';

const SERIES_BY_VOUCHER: Record<VoucherType, string> = {
  FACTURA: 'FAC',
  BOLETA: 'BOL',
  TICKET: 'TKT'
};

const STORE_SERIES_BY_ID: Record<string, string> = {
  'main-warehouse': '00',
  'store-01': '01',
  'store-02': '02',
  'store-03': '03',
  'store-04': '04',
  'store-05': '05',
  'store-06': '06',
  'store-07': '07',
  'store-08': '08'
};

export function getStoreSeriesNumber(store?: { id: string; verificationNumber?: string }): string {
  if (!store) return '00';
  return STORE_SERIES_BY_ID[store.id] || store.verificationNumber || '00';
}

export function getNextSaleNumber(
  sales: Array<{ saleNumber: string }>,
  storeNumber: string,
  voucherType: VoucherType
): string {
  const series = `${SERIES_BY_VOUCHER[voucherType]}${storeNumber}`;
  const pattern = new RegExp(`^${series}-(\\d{8})$`);
  const lastSequence = sales.reduce((highest, sale) => {
    const sequence = Number(pattern.exec(sale.saleNumber)?.[1] || 0);
    return Math.max(highest, sequence);
  }, 0);
  return `${series}-${String(lastSequence + 1).padStart(8, '0')}`;
}
