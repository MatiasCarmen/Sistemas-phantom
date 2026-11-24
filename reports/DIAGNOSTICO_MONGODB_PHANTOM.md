# Diagnóstico y preparación MongoDB — SGICOP-PHANTOM

Fecha de verificación: 2026-11-04

## Causa comprobada

El backend carga primero `MONGODB_URI` y `MONGODB_DATABASE` desde el entorno. En el entorno local se configuró `phantom_erp_test`. La función `loadDatabaseSnapshot()` de [`backend/src/mongo.ts`](../backend/src/mongo.ts) consulta MongoDB antes de leer el JSON.

Cuando MongoDB contiene alguna colección o configuración, devuelve un snapshot compuesto por las colecciones encontradas. `DataStore.initialize()` combina ese snapshot con el esquema predeterminado, por lo que una colección `users` vacía reemplaza los usuarios iniciales. Por eso `jperez` no existía en el login aunque sí aparece en `initialData.ts`.

El JSON no se importaba automáticamente a una base MongoDB vacía. Solo se usaba como fallback cuando MongoDB no estaba disponible o para algunos datos auxiliares de tiendas. En funcionamiento normal, MongoDB tenía prioridad.

## Evidencia directa previa

Consulta realizada contra MongoDB local, sin mostrar secretos:

| Base | Colecciones/documentos relevantes |
|---|---|
| `phantom_erp_test` | `products=1`, `sales=0`, `users=0`, `stores=9`, `store_stock=26` |
| `phantom_erp` | `products=21`, `sales=3`, `users=5`, `categories=8`, `suppliers=3`, `customers=7`, `quotes=3`, `inventory_movements=4`, `stores=9`, `store_stock=26` |

Esto confirma que el problema era de carga/inicialización de la base y no de la interfaz de login.

## Cambios aplicados

1. Se añadió `PHANTOM_DEMO_MODE=true`.
2. En modo demo, `mongo.ts` exige exactamente `MONGODB_DATABASE=phantom_erp_demo`.
3. En modo demo, un error de MongoDB se propaga y no se convierte silenciosamente en fallback JSON.
4. Se añadió `backend/scripts/seed-demo.ts`.
5. Se añadió `npm run seed:demo`.
6. El seed solo hace `upsert` con IDs deterministas y no elimina documentos ni bases.
7. El backend demo usa `PHANTOM_DATA_DIR` temporal para no escribir `backend/data/db.json` ni `backend/data/audit.json`.

## Base demo creada y verificada

Base: `phantom_erp_demo`

| Colección | Documentos |
|---|---:|
| `categories` | 6 |
| `suppliers` | 8 |
| `products` | 30 |
| `users` | 4 |
| `customers` | 12 |
| `stores` | 9 |
| `store_stock` | 270 |
| `stock_transfers` | 8 |
| `inventory_movements` | 78 |
| `quotes` | 24 |
| `sales` | 48 |
| `company_settings` | 1 |
| `system_state` | 1 |

Integridad directa:

- Referencias `store_stock` sin producto: `0`.
- Stock negativo: `0`.
- Ventas sin `storeId`: `0`.
- Las 9 ubicaciones son 1 almacén central y 8 sucursales.
- El seed se ejecutó dos veces y mantuvo los mismos conteos.

Todos los registros están identificados como sintéticos mediante nombres, SKU, documentos, notas y configuración `SGICOP-PHANTOM DEMO`. No representan operaciones reales.

## Usuarios demo

Estas contraseñas son exclusivamente para la base sintética:

| Perfil | Usuario | Contraseña | Rol |
|---|---|---|---|
| Administrador | `demo_admin` | `DemoAdmin2026!` | `admin` |
| Almacén | `demo_almacen` | `DemoAlmacen2026!` | `warehouse` |
| Vendedor | `demo_vendedor` | `DemoVentas2026!` | `collaborator` |
| Supervisor | `demo_supervisor` | `DemoSupervisor2026!` | `cashier` |

No deben reutilizarse en producción ni agregarse a `.env` o Git.

## Arranque reproducible

Desde la raíz, en PowerShell:

```powershell
$env:MONGODB_URI = "mongodb://127.0.0.1:27017"
$env:MONGODB_DATABASE = "phantom_erp_demo"
npm run seed:demo --prefix backend
```

Para ejecutar el backend sin fallback:

```powershell
$env:PORT = "3010"
$env:MONGODB_URI = "mongodb://127.0.0.1:27017"
$env:MONGODB_DATABASE = "phantom_erp_demo"
$env:PHANTOM_DEMO_MODE = "true"
$env:PHANTOM_DATA_DIR = "$env:TEMP\phantom-erp-demo-data"
$env:JWT_SECRET = "<secreto local de 32 o más caracteres>"
npm run dev --prefix backend
```

Para el frontend demo:

```powershell
$env:VITE_BACKEND_URL = "http://127.0.0.1:3010"
Set-Location frontend
npx vite --host 127.0.0.1 --port 5180
```

URLs verificadas en esta ejecución:

- Frontend: `http://127.0.0.1:5180` — HTTP `200`.
- Backend: `http://127.0.0.1:3010/api/health` — HTTP `200`.
- Login `demo_admin` — HTTP `200`.
- `/api/database/status` autenticado — `connected: true`, `database: phantom_erp_demo`.

## Consulta directa de comprobación

Con `mongosh`:

```javascript
use phantom_erp_demo
db.products.countDocuments()
db.sales.countDocuments()
db.users.find({}, {username: 1, role: 1, _id: 0})
db.store_stock.aggregate([
  {$lookup: {from: "products", localField: "productId", foreignField: "_id", as: "product"}},
  {$match: {"product.0": {$exists: false}}},
  {$count: "orphans"}
])
```

## Estado de archivos protegidos y Git

`backend/data/db.json` y `backend/data/audit.json` no forman parte de los cambios finales. La ejecución demo utiliza el directorio temporal definido por `PHANTOM_DATA_DIR`.

No se ejecutó `bd_phantom.txt`, no se modificaron `phantom_erp` ni `phantom_erp_test`, y no se hizo commit, merge, push ni deploy.
