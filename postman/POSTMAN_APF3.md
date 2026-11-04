# PHANTOM — colección Postman y evidencias APF3

## Alcance y seguridad

La colección [Phantom_APF3.postman_collection.json](./Phantom_APF3.postman_collection.json) usa únicamente rutas definidas en `backend/src/routes.ts`. El entorno [Phantom_APF3.postman_environment.json](./Phantom_APF3.postman_environment.json) no contiene credenciales reales: los valores de usuario y contraseña deben completarse únicamente en Postman Desktop.

Las pruebas deben ejecutarse contra una base temporal, nunca contra `phantom_erp` ni `phantom_erp_test`. La colección no consulta MongoDB directamente porque Postman prueba HTTP; la verificación documental se realiza con `mongosh` usando las consultas indicadas abajo.

## Respaldo local creado

Se creó antes de preparar estos archivos:

`C:\Users\mathi\Downloads\phantom-local-backups\phantom-worktree-20261104-165105.zip`

El ZIP incluye cambios rastreados y no rastreados, estado de Git y un parche local. Excluye `.env`, `.git`, `node_modules` y `dist`.

Para recuperar el respaldo:

1. Detener el backend y conservar aparte cualquier archivo creado posteriormente.
2. Extraer el ZIP en una carpeta nueva.
3. Revisar `GIT_STATUS.txt` y `LOCAL_CHANGES.patch`.
4. Copiar de forma selectiva los archivos recuperados al repositorio; no copiar ningún `.env`.
5. Ejecutar `git diff --check`, `npm test`, `npm run lint` y `npm run build`.

No se hizo commit, merge, push ni deploy. La rama de trabajo continúa siendo `main`; `origin/OWASP` no fue modificada.

## Preparar el entorno aislado

Desde `backend` y usando PowerShell:

```powershell
$env:MONGODB_DATABASE = "phantom_erp_postman_<fecha_hora>"
$env:PHANTOM_DATA_DIR = "$env:TEMP\phantom-postman-data"
New-Item -ItemType Directory -Force $env:PHANTOM_DATA_DIR | Out-Null
Copy-Item .\data\db.json "$env:PHANTOM_DATA_DIR\db.json"
Copy-Item .\data\audit.json "$env:PHANTOM_DATA_DIR\audit.json"
npm run dev
```

No se debe copiar `backend/.env` a la colección ni compartirlo. Si el backend carga `MONGODB_URI` desde el entorno local, debe apuntar al MongoDB local ya validado (`mongodb://127.0.0.1:27017`) y el nombre de base debe ser el temporal anterior.

## Importar y ejecutar en Postman Desktop

1. Importar `Phantom_APF3.postman_collection.json`.
2. Importar `Phantom_APF3.postman_environment.json`.
3. Seleccionar el entorno `PHANTOM APF3 - Local aislado`.
4. Completar `adminUsername`, `adminPassword`, `sellerUsername` y `sellerPassword` en la pestaña **Current value**. No guardar esos valores en Git.
5. Ejecutar la carpeta en orden, conservando las variables generadas (`adminToken`, `sellerToken`, `productId`, `customerId`, `saleId`).
6. Ejecutar `15 - Recuperación después de reiniciar backend` solo después de detener y volver a iniciar el backend con la misma base temporal.

La prueba de precio manipulado no espera un rechazo: espera `201` y comprueba que el backend sustituye precio, subtotal, impuesto y total por los valores del catálogo.

## Evidencia directa en MongoDB

Después de crear la venta y ejecutar `db.flushPersistence()` mediante el flujo normal del backend, consultar directamente la base temporal:

```powershell
mongosh "mongodb://127.0.0.1:27017/phantom_erp_postman_<fecha_hora>" --quiet --eval "db.products.findOne({_id: '<productId>'}, {_id:1,name:1,stock:1,sellingPrice:1}); db.sales.findOne({_id: '<saleId>'}, {_id:1,total:1,'items.productId':1,'items.unitPrice':1}); db.inventory_movements.findOne({referenceId: /^FAC-/}, {_id:1,type:1,quantity:1,referenceId:1});"
```

La consulta debe demostrar:

- el producto creado existe;
- el precio persistido corresponde al catálogo;
- el total persistido no coincide con el total manipulado;
- el stock disminuyó después de la venta;
- existe un movimiento `OUT_SALE`.

Reiniciar el backend sin cambiar `MONGODB_DATABASE` y repetir la consulta `products.findOne`. No eliminar la base temporal hasta terminar la sustentación.

## Guía de demostración en VS Code

| Caso | Endpoint | Middleware | Función backend | Operación MongoDB a mostrar |
|---|---|---|---|---|
| Login válido/inválido | `POST /api/auth/login` | ruta pública de login | `db.authenticateUser`, `signAuthToken` | lectura de `users`; no mostrar contraseñas |
| Sin token | `GET /api/sales` | `authenticate` | `getAuthenticatedUser` | no hay escritura |
| Permiso insuficiente | `POST /api/products/adjust-stock` | `requirePermission('canManageInventory')` | `db.adjustStock` | no debe ejecutarse |
| Crear producto | `POST /api/products` | `requirePermission('canManageInventory')` | `db.addProduct` | `products.insert/update` |
| Ajustar stock | `POST /api/products/adjust-stock` | `requirePermission('canManageInventory')` | `db.adjustStock` | `products.update` y `inventory_movements.insert` |
| Crear cliente | `POST /api/customers` | `requirePermission('canManageContacts')` | `db.addCustomer` | `customers.insert` |
| Crear cotización | `POST /api/quotes` | `requirePermission('canManageQuotes')` | `db.calculateTransaction`, `db.addQuote` | `quotes.insert` |
| Precio manipulado | `POST /api/sales` | `requirePermission('canManageSales')` | `db.calculateTransaction` | solo se persisten valores normalizados |
| Venta válida | `POST /api/sales` | `requirePermission('canManageSales')` | `db.addSale` | `sales.insert`, stock update y `inventory_movements.insert` |
| Recuperación | `GET /api/products/:id` | permiso de lectura | `db.getProductById`, `loadDatabaseSnapshot` | `products.findOne` tras reinicio |

## Matriz de resultados y estado de evidencia

| Caso | Resultado esperado | Estado al preparar esta entrega |
|---|---:|---|
| Login válido | 200 y token | Preparado en Postman; no ejecutado en Postman |
| Login inválido | 401 | Preparado en Postman; cubierto por prueba automatizada |
| Sin token | 401 | Preparado en Postman; cubierto por prueba automatizada |
| Permiso insuficiente | 403 | Preparado en Postman; cubierto por prueba automatizada |
| Crear y consultar producto | 201 / 200 | Preparado en Postman; flujo aislado automatizado aprobado |
| Ajuste y verificación de stock | 200 / 200 | Preparado en Postman; flujo aislado automatizado aprobado |
| Cliente | 201 | Preparado en Postman; flujo aislado automatizado aprobado |
| Cotización | 201 con total recalculado | Preparado en Postman; flujo aislado automatizado aprobado |
| Venta manipulada | 201 con importes normalizados | Preparado en Postman; cubierto por prueba automatizada |
| Venta y descuento de stock | 201 y stock coherente | Preparado en Postman; flujo aislado automatizado aprobado |
| Consulta directa MongoDB | documentos persistidos | Verificada previamente en pruebas automatizadas aisladas; repetir con `mongosh` para evidencia de sustentación |
| Recuperación tras reinicio | 200 y mismo `productId` | Preparado en Postman; verificado previamente de forma automatizada |

**Importante:** no se declara que la colección haya sido ejecutada en Postman Desktop. La evidencia previa corresponde a `npm test` (8/8), `npm run lint` y `npm run build`; la ejecución Postman y la captura de consultas `mongosh` quedan preparadas para la sesión de sustentación.
