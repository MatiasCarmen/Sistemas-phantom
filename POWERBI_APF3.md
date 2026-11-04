# POWER BI APF3 - Phantom

## Alcance y estado

Este informe prepara dos exportaciones estáticas para Power BI Desktop:

1. Ventas.
2. Inventario por tienda.

No se modificaron MongoDB, `phantom_erp_test`, `phantom_erp`, `db.json` ni
`audit.json`. No se ejecutó el SQL histórico, no se generaron ventas o stock
synthetic, y no se incluyeron nombres de clientes, documentos, teléfonos,
correos, direcciones, contraseñas, JWT ni otras credenciales.

## Fuentes verificadas

| Fuente | Estado | Registros relevantes | Uso |
|---|---|---:|---|
| MongoDB `phantom_erp_test` | Base aislada de prueba | `products`: 1; `stores`: 9; `store_stock`: 26; `sales`: 0; `inventory_movements`: 0; `stock_transfers`: 0 | Evidencia actual de la conexión de prueba; no es una base representativa para ventas |
| `backend/data/db.json` | Respaldo JSON local existente | `products`: 22; `sales`: 3; `stores`: 9; `storeStock`: 26; `inventoryMovements`: 5; `stockTransfers`: 0 | Fuente de los CSV generados |
| MongoDB `phantom_erp` | Base principal prevista | No consultada ni modificada | No declarar como fuente del reporte hasta una extracción autorizada |

La configuración local actual sigue apuntando a `phantom_erp_test`. La lectura
de MongoDB confirmó que hay 9 tiendas: 1 registro `MAIN_WAREHOUSE` y 8
registros `STORE`. Esto corresponde a un almacén central y ocho sucursales.

## Archivos generados

- [`ventas_powerbi.csv`](<./reports/powerbi_apf3/ventas_powerbi.csv>)
- [`inventario_tienda_powerbi.csv`](<./reports/powerbi_apf3/inventario_tienda_powerbi.csv>)

Los dos archivos son exportaciones estáticas; no representan una conexión en
tiempo real con MongoDB.

### Ventas

- Fuente: `backend/data/db.json`.
- 3 ventas.
- 3 líneas de venta.
- Importe total de líneas: `8919.41`.
- Importe de cabecera y suma de líneas: ambos `8919.41`.
- La columna `tienda` está vacía porque `Sale` no contiene `storeId`.
- Cada fila representa una línea de venta, no una venta repetida por cada
  producto.
- `importe` usa `SaleItem.total`.

Columnas:

`id_venta`, `fecha`, `tienda`, `id_producto`, `sku`, `producto`, `categoria`,
`cantidad`, `importe`, `fuente`, `calidad_dato`.

### Inventario por tienda

- Fuente: `backend/data/db.json`.
- 9 tiendas.
- 26 filas de `storeStock`.
- 26 filas exportadas con referencias resueltas.
- `stock_actual_tienda` usa `storeStock.quantity`.
- `stock_minimo` y `costo_unitario` provienen del producto.
- `valor_inventario = stock_actual_tienda * costo_unitario`.
- El archivo no incluye PII.

Columnas:

`id_tienda`, `tienda`, `tipo_tienda`, `id_producto`, `sku`, `producto`,
`categoria`, `stock_actual_tienda`, `stock_minimo`, `stock_global_producto`,
`costo_unitario`, `valor_inventario`, `fuente`, `calidad_dato`.

## Integridad y limitaciones

### Ventas

La suma del importe de cada línea coincide con la suma de las cabeceras:

```text
sale-201: 5319.81
sale-202:  899.70
sale-203: 2699.90
Total:    8919.41
```

Para evitar duplicar importes, el dashboard debe sumar `importe` desde el
CSV de líneas. No debe sumar `total` de una tabla de cabeceras unida a varias
líneas. Si posteriormente se extrae una tabla de ventas de MongoDB, debe
mantenerse una tabla de cabeceras separada o calcular el total con
`DISTINCTCOUNT(id_venta)` y una medida no duplicada.

Limitaciones:

- No hay tienda asociada a las ventas.
- Solo existen 3 ventas, insuficientes para tendencias representativas.
- La fuente es un respaldo JSON, no la base MongoDB actualmente configurada.

### Inventario

`products.stock` y `store_stock.quantity` no son equivalentes:

- `products.stock` es un stock global o del almacén principal según el modelo
  actual.
- `store_stock.quantity` es stock distribuido por tienda.
- En el JSON, la suma de `store_stock` es 90 unidades.
- Hay 19 productos cuya suma por tienda no coincide con `products.stock`.
- Por tanto, el dashboard por tienda debe usar exclusivamente
  `stock_actual_tienda`; no debe sumar `stock_global_producto` como si fuera
  otra tienda.

El dashboard de inventario es utilizable como fotografía del respaldo, pero
debe presentarse con la advertencia de que la conciliación global aún está
pendiente.

La instancia MongoDB de prueba tampoco puede usarse para un dashboard de
inventario representativo: sus 26 filas `store_stock` apuntan a productos
ausentes en esa base y solo contiene un producto de prueba. Esto se conserva
como evidencia y no se corrigió porque la solicitud prohíbe escribir datos.

## Medidas DAX sugeridas

Los nombres siguientes corresponden a las columnas de los CSV.

### Dashboard de ventas

```DAX
Ventas Totales = SUM(ventas_powerbi[importe])
```

```DAX
Unidades Vendidas = SUM(ventas_powerbi[cantidad])
```

```DAX
Ventas Distintas = DISTINCTCOUNT(ventas_powerbi[id_venta])
```

```DAX
Ticket Promedio = DIVIDE([Ventas Totales], [Ventas Distintas], 0)
```

```DAX
Productos Vendidos = DISTINCTCOUNT(ventas_powerbi[id_producto])
```

Indicadores recomendados:

1. Ventas totales.
2. Unidades vendidas.
3. Ventas distintas.
4. Ticket promedio.
5. Productos vendidos.

No usar `tienda` para comparar rendimiento hasta que el backend capture
`storeId` en las ventas.

### Dashboard de inventario

```DAX
Stock por Tienda = SUM(inventario_tienda_powerbi[stock_actual_tienda])
```

```DAX
Valor del Inventario = SUM(inventario_tienda_powerbi[valor_inventario])
```

```DAX
Stock Bajo = 
SUMX(
    inventario_tienda_powerbi,
    IF(
        inventario_tienda_powerbi[stock_actual_tienda]
            <= inventario_tienda_powerbi[stock_minimo],
        inventario_tienda_powerbi[stock_actual_tienda],
        0
    )
)
```

```DAX
Productos Bajo Minimo =
COUNTROWS(
    FILTER(
        inventario_tienda_powerbi,
        inventario_tienda_powerbi[stock_actual_tienda]
            <= inventario_tienda_powerbi[stock_minimo]
    )
)
```

```DAX
Productos Distintos en Tienda =
DISTINCTCOUNT(inventario_tienda_powerbi[id_producto])
```

Indicadores recomendados:

1. Stock por tienda.
2. Valor del inventario.
3. Stock bajo mínimo.
4. Productos bajo mínimo.
5. Productos distintos en tienda.

## Importación en Power BI Desktop

### Dashboard de ventas

1. Abrir Power BI Desktop.
2. Seleccionar **Obtener datos > Texto/CSV**.
3. Abrir `reports/powerbi_apf3/ventas_powerbi.csv`.
4. En la vista previa, seleccionar **Transformar datos**.
5. Convertir `fecha` a tipo **Fecha**.
6. Convertir `cantidad` a **Número entero**.
7. Convertir `importe` a **Número decimal fijo**.
8. Confirmar que `fuente` sea `backup_json_no_Mongo`.
9. Seleccionar **Cerrar y aplicar**.
10. Crear tarjetas para las cinco medidas DAX anteriores.
11. Crear gráficos por `fecha`, `categoria`, `producto` y `cantidad`.
12. Mostrar una tarjeta de advertencia con texto: **Ventas sin tienda
    registrada; fuente: respaldo JSON**.

### Dashboard de inventario

1. Seleccionar **Obtener datos > Texto/CSV**.
2. Abrir `reports/powerbi_apf3/inventario_tienda_powerbi.csv`.
3. Seleccionar **Transformar datos**.
4. Convertir `stock_actual_tienda`, `stock_minimo` y
   `stock_global_producto` a **Número entero**.
5. Convertir `costo_unitario` y `valor_inventario` a **Número decimal fijo**.
6. Confirmar que `tipo_tienda` distingue `MAIN_WAREHOUSE` de `STORE`.
7. Seleccionar **Cerrar y aplicar**.
8. Crear tarjetas para stock, valor, stock bajo y productos bajo mínimo.
9. Crear una matriz con `tienda`, `categoria`, `producto` y
   `stock_actual_tienda`.
10. Crear un gráfico de barras por `tienda` usando `Valor del Inventario`.
11. Mostrar una advertencia: **Fotografía del respaldo JSON; conciliación de
    stock global pendiente**.

## Evidencias para exponer en APF3

- Estado Git verificado en `main`; se conservaron los cambios locales de
  seguridad y no se hizo merge, commit, push ni deploy.
- Configuración visible sin revelar secretos: `MONGODB_DATABASE=phantom_erp_test`.
- Consulta directa de MongoDB: `phantom_erp_test` contiene 9 tiendas, 26 filas
  `store_stock` y cero ventas.
- Lectura del respaldo: 22 productos, 3 ventas, 9 tiendas, 26 filas de stock,
  5 movimientos de inventario y cero transferencias.
- Validación aritmética: total de cabeceras y líneas de ventas igual a
  `8919.41`.
- Validación de tiendas: 1 almacén central y 8 sucursales.
- Validación de procedencia: ambos CSV declaran `backup_json_no_Mongo`.

## Qué falta para un reporte representativo

No se deben fabricar cifras. Para un dashboard definitivo faltan:

1. Una extracción autorizada de `phantom_erp` o una carga controlada de datos
   reales en una base no productiva.
2. `storeId` en cada venta para ventas por tienda.
3. Más ventas y un periodo temporal representativo.
4. Conciliación formal entre `products.stock` y la suma de `store_stock`.
5. Movimientos y transferencias reales para analizar rotación y trazabilidad.
6. Corrección de la instancia `phantom_erp_test` antes de usarla como fuente
   analítica; no se corrigió aquí por la restricción de no escribir datos.

Hasta completar esos puntos, los CSV sirven como evidencia reproducible para
demostrar el modelo y el proceso de extracción, pero no deben presentarse
como indicadores productivos en tiempo real.
