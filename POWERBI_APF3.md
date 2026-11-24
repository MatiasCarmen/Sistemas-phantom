# POWER BI APF3 - Integración Analítica Sistemas Phantom (`/api/bi`)

## 1. Arquitectura de Conexión Directa (Modelo Estrella)

El backend incorpora el router dedicado [`backend/src/biRoutes.ts`](./backend/src/biRoutes.ts), montado en `/api/bi`, que expone los datos en vivo desde el mismo `DataStore` respaldado por **MongoDB** (sin abrir conexiones adicionales ni pasar por la autenticación JWT de sesión de usuario).

### Seguridad del Conector BI
* Todas las rutas `/api/bi/*` están protegidas mediante el encabezado HTTP **`x-api-key`**, validado en tiempo constante (`timingSafeEqual`) contra `process.env.BI_API_KEY`.
* Si `BI_API_KEY` no está definida en el entorno (`backend/.env`), el router responde **`503 Service Unavailable`** con un mensaje explícito.
* Si el header `x-api-key` falta o no coincide, responde **`401 Unauthorized`**.

---

## 2. Endpoints Disponibles (`/api/bi`)

Todos los endpoints `GET` devuelven **arreglos JSON planos** (sin objetos ni arreglos anidados, fechas normalizadas en formato ISO 8601 UTC `YYYY-MM-DDTHH:mm:ss.sssZ` y montos/cantidades numéricos). Además, todos aceptan **`?format=csv`** para devolver CSV conforme a RFC 4180 (con encabezados y comillas escapadas para textos con comas o saltos de línea).

| Tipo | Endpoint | Grano / Descripción | Claves de relación |
|---|---|---|---|
| Hechos | `GET /api/bi/fact_ventas` | Cabeceras de ventas completadas (**excluye ventas anuladas**) | `id_venta`, `id_tienda`, `id_cliente`, `id_cotizacion_origen` |
| Hechos | `GET /api/bi/fact_detalle_venta` | Líneas de productos vendidos (**excluye ventas anuladas**), incluye `costo_total` y `margen_bruto` | `id_detalle`, `id_venta`, `id_tienda`, `id_cliente`, `id_producto` |
| Hechos | `GET /api/bi/fact_kardex` | Movimientos de inventario (`ENTRADA` / `SALIDA`) valorizados | `id_movimiento`, `id_producto`, `id_tienda` |
| Hechos | `GET /api/bi/fact_cotizaciones` | Proformas emitidas y estado de conversión a venta | `id_cotizacion`, `id_cliente`, `id_venta_convertida` |
| Dimensión | `GET /api/bi/dim_productos` | Catálogo de productos, costos, precios, stock y valorización | `id_producto`, `id_proveedor` |
| Dimensión | `GET /api/bi/dim_clientes` | Directorio de clientes, condición de pago, crédito y compras acumuladas | `id_cliente` |
| Dimensión | `GET /api/bi/dim_proveedores` | Directorio de proveedores comerciales y condiciones de pago | `id_proveedor` |
| Dimensión | `GET /api/bi/dim_tiendas` | Almacén central (`MAIN_WAREHOUSE`) y sucursales (`STORE`) | `id_tienda` |

---

## 3. Pasos para Conectar desde Power BI Desktop

### Paso previo: Configurar `BI_API_KEY`
1. En `backend/.env`, define una clave secreta para Power BI:
   ```env
   BI_API_KEY=<tu-clave-secreta-para-powerbi>
   ```
2. Inicia el backend (`npm run dev` o `npm run dev:backend`).

### Conexión en Power BI Desktop (`Obtener datos > Web > Avanzado`)
1. Abre **Power BI Desktop**.
2. En la cinta superior, selecciona **Inicio > Obtener datos > Web**.
3. En el cuadro de diálogo **Desde la Web**, marca la opción **Avanzado** (*Advanced*).
4. En **Partes de la dirección URL**, escribe la URL del endpoint (local o desplegado):
   * Formato JSON directo: `http://localhost:3000/api/bi/fact_ventas`
   * Formato CSV opcional: `http://localhost:3000/api/bi/fact_ventas?format=csv`
5. En **Parámetros de encabezado de solicitud HTTP (opcional)** (*HTTP request header parameters*):
   * En el cuadro izquierdo (nombre del header), escribe exactamente: `x-api-key`
   * En el cuadro derecho (valor), pega el valor configurado en `BI_API_KEY`.
6. Haz clic en **Aceptar**.
7. Si Power BI muestra la ventana **Acceso a contenido web**, selecciona **Anónimo** en el panel izquierdo y pulsa **Conectar** (esto permite que Power BI envíe el encabezado `x-api-key` definido en el modo Avanzado sin sobrescribir `Authorization`).
8. En el **Editor de Power Query**, verifica los tipos de columna detectados (fechas ISO como *Fecha/Hora/Zona horaria* y montos como *Número decimal*) y pulsa **Cerrar y aplicar**.
9. Repite los pasos 2 a 8 para cargar `fact_detalle_venta`, `fact_kardex`, `fact_cotizaciones`, `dim_productos`, `dim_clientes`, `dim_proveedores` y `dim_tiendas`.

---

## 4. Relaciones Recomendadas en la Vista de Modelo

Configura relaciones de **uno a varios (`1:*`)** con filtro único desde las dimensiones hacia las tablas de hechos:

* `dim_tiendas[id_tienda]` → `fact_ventas[id_tienda]`, `fact_detalle_venta[id_tienda]`, `fact_kardex[id_tienda]`
* `dim_clientes[id_cliente]` → `fact_ventas[id_cliente]`, `fact_detalle_venta[id_cliente]`, `fact_cotizaciones[id_cliente]`
* `dim_productos[id_producto]` → `fact_detalle_venta[id_producto]`, `fact_kardex[id_producto]`
* `dim_proveedores[id_proveedor]` → `dim_productos[id_proveedor]`
* `fact_ventas[id_venta]` → `fact_detalle_venta[id_venta]`

---

## 5. Medidas DAX Sugeridas sobre el Modelo Estrella

```DAX
Ventas Totales = SUM(fact_ventas[total])
```

```DAX
Ventas Netas (Sin IGV) = SUM(fact_ventas[subtotal])
```

```DAX
Unidades Vendidas = SUM(fact_detalle_venta[cantidad])
```

```DAX
Margen Bruto = SUM(fact_detalle_venta[margen_bruto])
```

```DAX
Ticket Promedio = DIVIDE([Ventas Totales], DISTINCTCOUNT(fact_ventas[id_venta]), 0)
```

```DAX
Tasa de Conversion Cotizaciones =
DIVIDE(
    CALCULATE(COUNTROWS(fact_cotizaciones), fact_cotizaciones[convertida_venta] = TRUE()),
    COUNTROWS(fact_cotizaciones),
    0
)
```

```DAX
Valor Inventario Almacen Central = SUM(dim_productos[valor_inventario_costo])
```

---

## 6. Respaldo Estático Histórico (CSV APF3)

En [`reports/powerbi_apf3/`](./reports/powerbi_apf3/) se conservan como referencia histórica las exportaciones estáticas iniciales (`ventas_powerbi.csv` e `inventario_tienda_powerbi.csv`). Para reportes actualizados sobre MongoDB Atlas, utiliza los endpoints `/api/bi/*` descritos arriba.
