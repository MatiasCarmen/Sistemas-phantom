# Auditoría integral SGICOP-PHANTOM

Fecha de revisión: 2026-10-06  
Alcance: revisión estática, pruebas automatizadas existentes, prueba HTTP en memoria y consultas de solo lectura a `phantom_erp_test`.

## 1. Estado general y dictamen ejecutivo

El proyecto es demostrable como prototipo académico de inventario, cotizaciones y ventas, pero no está listo para presentarse como un ERP con control operativo completo. El backend compila, el lint pasa, las pruebas existentes pasan y el login rechaza credenciales inválidas. Sin embargo, la autorización granular no está aplicada de forma uniforme, el dashboard contiene cifras estáticas que no proceden de MongoDB, las ventas no tienen tienda asociada y la base aislada de prueba no contiene ventas ni productos compatibles con sus referencias de stock.

**Estado recomendado para la exposición: PARCIAL, con demostración controlada.** Debe explicarse qué es dato real, qué es respaldo JSON, qué es dato de prueba y qué componente es solamente visual.

No se modificaron código funcional, MongoDB, `backend/data/db.json` ni `backend/data/audit.json`. No se hizo merge, commit, push ni deploy. Los cambios locales de seguridad fueron conservados.

## 2. Estado de Git, configuración y dependencias

| Aspecto | Evidencia | Resultado |
|---|---|---|
| Rama actual | `main` | Confirmado |
| `main` local/remoto | `5491f8d` | Iguales al iniciar la revisión |
| OWASP | `origin/OWASP` existe y no está integrada | Confirmado |
| Cambios locales | `app.ts`, `routes.ts`, `security.ts`, `server.ts`, pruebas y `.env.example`, además de artefactos de informes | Conservados |
| Secreto | `backend/.env` contiene `JWT_SECRET`, no se muestra en este informe | Confirmado |
| Protección de `.env` | `git check-ignore -v backend/.env` devuelve regla de ignorado; `git ls-files` no devuelve el archivo | Correcto |
| MongoDB configurado | `MONGODB_DATABASE=phantom_erp_test` | Confirmado; no se cambió |
| JSON | Hashes comparados y `backend/data/db.json` restaurado al contenido original tras una ejecución de prueba que lo alteró | Preservado |
| Node/npm | Node `v22.16.0`, npm `v10.9.2` | Disponible |
| Build/lint/tests | `npm run build`, `npm run lint`, `npm test` | Correctos |
| Tamaño de frontend | Chunk principal superior a 500 kB | Advertencia no bloqueante |

`npm audit --omit=dev` reportó 6 vulnerabilidades transitivas o de desarrollo en el árbol instalado: 2 críticas, 3 altas y 1 moderada. Los paquetes afectados reportados fueron `proxy-addr`, `dompurify`, `body-parser`, `source-map-js`, `vite` y `qs`. No se actualizaron dependencias durante esta auditoría para no alterar el alcance ni los cambios de seguridad existentes.

## 3. Arquitectura revisada

| Capa | Implementación | Evidencia |
|---|---|---|
| Frontend | React + TypeScript + Vite | `frontend/src/App.tsx`, componentes de `frontend/src/components` |
| Backend | Express + TypeScript | `backend/src/app.ts`, `backend/src/server.ts` |
| Persistencia primaria | MongoDB mediante `backend/src/mongo.ts` | Colecciones por entidad |
| Respaldo/fallback | `backend/data/db.json` | `saveLocalSnapshot` y carga local |
| Auditoría | Colección MongoDB y respaldo `backend/data/audit.json` | `saveAuditEvents` |
| Estado de aplicación | `DataStore` en memoria con cola de persistencia | `backend/src/dataStore.ts` |

La carga de MongoDB prioriza el documento legado `erp_state` si existe; si no, reconstruye el snapshot desde colecciones. Cuando MongoDB no está disponible, el backend puede operar con el respaldo JSON. Esta flexibilidad es útil para una demo, pero debe explicarse porque puede ocultar un fallo de conexión si solo se comprueba que la API responde.

## 4. Pruebas ejecutadas y límites

### Ejecutadas

- `npm test`: 6 pruebas correctas, 0 fallos.
- `npm run lint`: frontend y backend correctos.
- `npm run build`: frontend y backend correctos.
- Prueba HTTP en memoria:
  - login inválido: HTTP 401;
  - login válido: HTTP 200;
  - `/health`: HTTP 200;
  - `/dashboard/stats`, `/products`, `/stores`, `/store-stock`, `/inventory/movements`, `/quotes`, `/sales`, `/customers`, `/suppliers` y `/database/status`: HTTP 200 con las estructuras esperadas.
- Consulta directa de MongoDB en `phantom_erp_test`, sin insertar, actualizar ni eliminar documentos.
- Comprobación de que `.env` está ignorado y no rastreado.
- Comparación de integridad de los respaldos JSON.

### No ejecutadas

- Flujo completo en navegador con interacción real y descarga de PDF.
- Creación y edición de registros contra una base aislada temporal.
- Flujo completo cotización → venta → descuento de stock → cancelación → reversión.
- Transferencia → recepción y verificación de Kardex.
- Pruebas concurrentes de venta y stock.
- Matriz de autorización con cada rol contra cada operación.
- Prueba de usuario inactivo.
- Prueba de reinicio con una escritura funcional nueva durante esta auditoría.

Por tanto, una respuesta HTTP correcta se clasifica como evidencia de endpoint, no como prueba funcional completa del módulo.

## 5. Estado real de MongoDB de prueba

Consulta directa a `mongodb://127.0.0.1:27017`, base `phantom_erp_test`:

| Colección | Registros |
|---|---:|
| `products` | 1 |
| `sales` | 0 |
| `stores` | 9 |
| `store_stock` | 26 |
| `inventory_movements` | 0 |
| `stock_transfers` | 0 |

Las 9 tiendas existen en la colección, pero sus documentos no contienen el campo `type` esperado; por eso no se pudo confirmar desde MongoDB que sean exactamente 8 sucursales y 1 almacén central. El respaldo JSON sí contiene la clasificación esperada usada en la auditoría previa. Las 26 filas de `store_stock` referencian productos no presentes en `phantom_erp_test` (26 referencias no resueltas); no se corrigieron porque la auditoría era de solo lectura.

Conclusión: `phantom_erp_test` es una base aislada incompleta, no una fuente representativa para demostrar ventas o inventario por tienda.

## 6. Matriz de módulos

| Módulo | Estado | Archivos/funciones principales | Endpoint | Persistencia | Validaciones y controles | Evidencia / riesgo |
|---|---|---|---|---|---|---|
| Login y sesión | **FUNCIONAL** | `routes.ts`, `security.ts`, `App.tsx` | `POST /auth/login` | MongoDB/DataStore | JWT HS256, secreto externo, expiración 8 h, rechazo de credenciales inválidas | 401 inválido y 200 válido. Falta prueba de usuario inactivo y rate limiting. |
| JWT | **FUNCIONAL** | `security.ts:43-134` | Middleware global | No aplica | `scrypt`, comparación segura del hash, firma y verificación | Pruebas de hash, firma y token manipulado correctas. Existe compatibilidad con contraseñas heredadas en texto plano. |
| Roles y permisos | **PARCIAL** | `routes.ts:64-83`, `UsersManagementModal.tsx`, `App.tsx:216-244` | `/users`, `/system` | MongoDB | Admin explícito para usuarios/sistema; autenticación global | Muchos endpoints de catálogo, inventario, clientes, proveedores, ventas y cotizaciones solo exigen estar autenticado. El selector de rol en frontend cambia estado local, no el rol persistido. |
| Usuarios | **PARCIAL** | `routes.ts`, `UsersManagementModal.tsx`, `initialData.ts` | `/users` | MongoDB | Rutas protegidas para admin | Hay contraseñas demo simples y alta con valor predeterminado `123456` en la lógica de datos. No se probó edición, baja ni usuario inactivo. |
| Dashboard | **PARCIAL** | `DashboardView.tsx`, `dataStore.ts` | `/dashboard/stats` | Métricas reales más frontend | Carga de métricas y filtros visuales | `DashboardView.tsx:115-145` contiene ventas por tienda, categorías y top de productos hardcodeados. Riesgo crítico de presentar cifras no verificables. |
| Productos/SKU | **PARCIAL** | `routes.ts:183-290`, `InventoryView.tsx` | `/products` | MongoDB/DataStore | Campos obligatorios básicos, búsqueda | No se observa validación backend completa de unicidad de SKU/código de barras ni rangos numéricos. |
| Inventario global | **PARCIAL** | `dataStore.ts:504-555`, `routes.ts:280-315` | `/products/adjust-stock` | `products`, `inventory_movements` | No permite stock negativo en ajuste | `products.stock` representa stock global/almacén principal. Faltan pruebas reales de ajuste, responsables y concurrencia. |
| Inventario por tienda | **PARCIAL** | `dataStore.ts:504-550`, `mongo.ts`, `InventoryView.tsx` | `/store-stock`, `/products/adjust-stock` | `store_stock`, `inventory_movements` | Verifica tienda activa para ajuste | `store_stock.quantity` es distribución por tienda; no actualiza `products.stock` al ajustar una sucursal. Las referencias de prueba están huérfanas. |
| Kardex | **PARCIAL** | `dataStore.ts`, `routes.ts:470-500` | `/inventory/movements` | `inventory_movements` | Registra cantidades anterior/nueva, costo y responsable | La consulta responde, pero la base de prueba tiene 0 movimientos. Falta probar trazabilidad documental y ubicación en cada operación. |
| Transferencias | **PARCIAL** | `dataStore.ts:562-635`, `routes.ts:320-365` | `/stock-transfers`, `/stock-transfers/receive` | `stock_transfers`, `store_stock`, movimientos | Verifica destino tipo `STORE`, cantidad y stock global | Descuenta almacén al despachar y suma tienda al recibir. No hay prueba de flujo completo ni de rollback ante errores parciales de lotes. |
| Clientes | **FUNCIONAL** | `CustomersSuppliersView.tsx`, `routes.ts:410-465` | `/customers` | MongoDB/DataStore | UI valida documento por longitud y dígitos | Endpoint probado en lectura. Backend exige nombre/documento, pero no valida unicidad/formato con la misma profundidad. |
| Proveedores | **FUNCIONAL** | `CustomersSuppliersView.tsx`, `routes.ts:365-410` | `/suppliers` | MongoDB/DataStore | UI solicita RUC/categoría/contacto | Endpoint probado en lectura. Falta prueba de alta/edición y validación backend equivalente. |
| Cotizaciones | **PARCIAL** | `QuotesView.tsx`, `routes.ts:536-665`, `convertQuoteToSale` | `/quotes`, `/quotes/:id/convert-to-sale` | MongoDB/DataStore | Requiere cliente e ítems; cambios de estado solo admin | Carga de lectura correcta. Totales recibidos del cliente y no recalculados integralmente en backend. Falta prueba de extremo a extremo. |
| Punto de venta | **PARCIAL** | `SalesView.tsx`, `routes.ts:670-790`, `addSale` | `/sales` | MongoDB/DataStore | Verifica existencia y stock global | Descuenta `products.stock`, pero la venta no tiene `storeId`; no es posible atribuir ventas reales a sucursal. Totales y descuentos se aceptan desde cliente. |
| Cancelación de venta | **PARCIAL** | `cancelSale`, rutas de ventas | `/sales/:id/cancel` | Ventas, productos, Kardex | Evita cancelar dos veces | Reversión global implementada. No se probó persistencia ni correspondencia de stock por tienda. |
| PDF/exportación | **PARCIAL** | `pdfGenerator.ts`, `ReportsSettingsView.tsx`, `routes.ts:system/sql-export` | `/system/export`, `/system/sql-export` | Lectura de snapshot | Rutas administrativas para sistema | PDF solo tiene cobertura visual/manual. Exportación SQL es legado y puede confundir con el modelo operativo MongoDB. |
| Persistencia MongoDB/JSON | **PARCIAL** | `mongo.ts`, `dataStore.ts` | `/database/status` | MongoDB + fallback JSON | Estado de conexión y fallback | Conexión real ya validada previamente. La escritura normal también guarda JSON; esto debe aislarse para no sobrescribir respaldos durante demos. |

## 7. Hallazgos priorizados

### Críticos

1. **Datos de dashboard no confiables:** `DashboardView.tsx:115-145` define ventas, transacciones, márgenes y categorías estáticas. Si se presenta ese panel como resultado de MongoDB, se incurre en una afirmación no respaldada por la fuente.
2. **Vulnerabilidades de dependencias:** `npm audit --omit=dev` reportó 2 críticas, incluyendo `proxy-addr` y `dompurify`, además de vulnerabilidades altas. La corrección debe ejecutarse en una rama controlada y con pruebas, no durante esta auditoría.

### Altos

1. **Autorización granular insuficiente:** el middleware global confirma identidad, pero la mayoría de las operaciones de productos, inventario, clientes, proveedores, ventas y cotizaciones no verifica el permiso específico del usuario.
2. **Ventas sin tienda:** el modelo `Sale` y `POST /sales` no reciben ni persisten `storeId`, por lo que ventas por sucursal no pueden calcularse de forma fiable.
3. **Stock aceptado desde cliente:** cotizaciones y ventas reciben `subtotal`, `discountTotal`, `taxTotal` y `total` del request; el servidor no reconstruye todos los importes desde precios y cantidades.
4. **Credenciales heredadas/débiles:** `initialData.ts:1015-1114` contiene usuarios demo con contraseñas simples y `security.ts:53-71` conserva verificación de texto plano heredado. Es riesgoso fuera de una base de demostración aislada.

### Medios

1. **Base de prueba incompleta:** 1 producto, 0 ventas, 0 movimientos y 0 transferencias; no permite una demostración representativa de dashboards ni flujos de inventario.
2. **Referencias huérfanas:** 26 filas de `store_stock` apuntan a productos ausentes en `phantom_erp_test`.
3. **Clasificación de tiendas no persistida en la base de prueba:** los 9 documentos consultados no incluyen `type`; no se puede demostrar desde esa base la separación 8+1.
4. **Stock global y distribuido sin regla formal suficiente:** las ventas descuentan `products.stock`; los ajustes de sucursal y recepciones modifican `store_stock`. Es una separación válida como concepto, pero no hay garantía de conciliación o reserva.
5. **Ausencia de pruebas de concurrencia y transacción:** una venta de varios ítems y una transferencia por lote pueden requerir atomicidad para evitar estados parciales.
6. **Auditoría de movimientos incompleta:** el modelo registra responsable y referencia, pero no siempre registra ubicación, documento fuente y número de serie.

### Bajos

1. Chunk frontend grande, superior a 500 kB.
2. La exportación SQL heredada puede inducir a documentar MySQL como base vigente.
3. Faltan pruebas automatizadas de PDF, descarga, filtros y validaciones de formularios.
4. Algunos filtros de proveedores en `CustomersSuppliersView.tsx` tratan el estado inactivo de forma simplificada.

## 8. Interpretación de `products.stock` frente a `store_stock.quantity`

La implementación trata los campos como conceptos diferentes:

- `products.stock`: stock global disponible en el almacén principal.
- `store_stock.quantity`: stock distribuido físicamente en una tienda.
- Una transferencia descuenta el primer valor al salir y aumenta el segundo al recibirse (`dataStore.ts:562-635`).
- Un ajuste de sucursal cambia solo el registro de `store_stock` (`dataStore.ts:504-550`).
- Una venta descuenta `products.stock` (`dataStore.ts:869-923`), incluso cuando no se ha identificado una tienda.

Esto explica por qué no debe sumarse automáticamente `products.stock` con todas las cantidades de `store_stock`: serían ubicaciones distintas. No obstante, el sistema carece de una regla de conciliación formal y las ventas no conocen ubicación. La diferencia observada en los 19 productos del respaldo debe explicarse como divergencia entre almacén principal y distribución, no como una métrica única de inventario total, hasta que el modelo registre ubicación en cada operación.

## 9. Pruebas faltantes para una demostración sólida

1. En una base temporal nueva: crear producto, tienda, ajuste, transferencia, recepción y venta.
2. Reiniciar backend y comprobar cada documento directamente en MongoDB.
3. Verificar que la venta descuenta exactamente una vez por cada ítem y que la cancelación revierte exactamente una vez.
4. Confirmar que una cotización convertida no puede convertirse dos veces.
5. Ejecutar cada endpoint de escritura con administrador, colaborador, almacén y caja.
6. Confirmar que un usuario inactivo no obtiene token ni acceso.
7. Probar SKU/código de barras duplicados y cantidades negativas, decimales no permitidos y totales manipulados.
8. Probar dos ventas concurrentes sobre el mismo stock.
9. Generar PDF y comprobar descarga y contenido.
10. Separar visualmente en el dashboard los datos derivados de API de cualquier objetivo o ejemplo estático.

## 10. Orden recomendado de correcciones

1. Eliminar o etiquetar como demo todas las cifras hardcodeadas del dashboard.
2. Aplicar permisos backend por operación y probarlos por rol.
3. Añadir `storeId` a ventas, movimientos y reglas de stock; definir conciliación almacén + tiendas.
4. Recalcular precios, impuestos, descuentos y totales en backend.
5. Normalizar la base aislada de prueba en un script/fixture separado, nunca sobre `db.json` ni producción.
6. Resolver referencias de `store_stock` y persistir explícitamente `type` de tienda en el entorno de prueba.
7. Fortalecer contraseñas demo, retirar fallback de texto plano cuando se complete la migración controlada y añadir rate limiting/headers de seguridad.
8. Actualizar dependencias vulnerables en una rama separada y volver a ejecutar tests, lint, build y `npm audit`.
9. Añadir pruebas de integración de escritura, concurrencia, PDF y persistencia después de cada cambio.

## 11. Riesgos concretos para la exposición

- Mostrar el panel de ventas por tienda como si proviniera de MongoDB: **riesgo alto de inconsistencia demostrable**.
- Intentar demostrar ventas en `phantom_erp_test`: la consulta directa mostrará cero ventas.
- Intentar mostrar inventario por producto desde `store_stock`: las referencias no resuelven contra el único producto de esa base.
- Cambiar de rol desde el selector visual y afirmar que se probó autorización backend: el selector modifica estado local del frontend, no la identidad del JWT.
- Usar la exportación SQL como prueba de MySQL: es una función heredada de exportación, no el almacenamiento operativo.
- Ejecutar operaciones de escritura con la configuración actual: `saveDatabaseSnapshot` también escribe el respaldo JSON; debe utilizarse una base y directorio de datos temporales.

## 12. Conclusión para el informe APF3

El modelo que corresponde al sistema presentado es MongoDB con colecciones `products`, `categories`, `suppliers`, `customers`, `inventory_movements`, `quotes`, `sales`, `users`, `stores`, `store_stock` y `stock_transfers`, con respaldo JSON local. El SQL histórico y el exportador SQL deben documentarse como referencia/compatibilidad, no como base vigente.

Para una exposición honesta, usar datos del respaldo JSON solo como dataset documentado y etiquetado, o preparar una base de demostración aislada con fixtures explícitos. No es necesario recuperar datos de `bd_phantom.txt` para explicar la arquitectura funcional actual. Sí es necesario corregir o explicar las relaciones de tienda, la trazabilidad de ventas y la autorización si se desea afirmar que el sistema está listo para operación real.
