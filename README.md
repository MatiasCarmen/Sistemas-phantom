# Sistemas Phantom - ERP & WMS (Inventario, Cotizaciones y Ventas)

Sistema web integral para la gestión de inventario, Kardex valorizado, cotizaciones comerciales y facturación/POS.

---

## 🏗️ Arquitectura Desacoplada (`/frontend` y `/backend`)

El repositorio está estructurado como un monorepo limpio con dos paquetes independientes para facilitar el desarrollo en paralelo de **Carmen** (Frontend) y **Christian** (Backend):

```plaintext
sistema-de-inventario-cotización-y-ventas/
├── package.json                  # Orquestador raíz (Workspaces + scripts unificados)
├── .env.example                  # Plantilla raíz de variables de entorno
├── scripts/
│   └── dev.mjs                   # Lanzador concurrente de Frontend y Backend
├── README.md
│
├── frontend/                     # 💻 Aplicación Cliente (React 19 + Vite 6 + Tailwind 4)
│   ├── package.json              # Dependencias y scripts de interfaz
│   ├── vite.config.ts            # Reverse Proxy /api -> http://localhost:3000 (sin CORS)
│   ├── tsconfig.json             # TypeScript estricto para React
│   ├── index.html                # Punto de entrada SPA
│   ├── public/                   # Activos estáticos, logos e imágenes de catálogo
│   └── src/
│       ├── components/           # Vistas modulares y modales del ERP
│       ├── lib/                  # Cliente HTTP (/api), generador PDF y formateadores
│       ├── types.ts              # Contratos de dominio e interfaces
│       ├── App.tsx               # Contenedor principal de sesión y navegación
│       └── main.tsx              # Montaje del árbol React
│
└── backend/                      # ⚙️ Servidor API RESTful (Express + MongoDB + TSX)
    ├── package.json              # Dependencias y scripts del servidor
    ├── tsconfig.json             # TypeScript estricto para Node.js
    ├── .env.example              # Plantilla de variables de entorno
    └── src/
        ├── app.ts                # Fábrica Express (CORS, JSON parser, /api/bi, /api)
        ├── server.ts             # Punto de entrada del servidor (puerto 3000)
        ├── routes.ts             # Endpoints RESTful montados bajo /api
        ├── biRoutes.ts           # Endpoints analíticos de modelo estrella bajo /api/bi
        ├── security.ts           # Firma/verificación JWT (HMAC-SHA256) y hash scrypt
        ├── dataStore.ts          # Lógica transaccional de inventario, Kardex y ventas
        ├── mongo.ts              # Persistencia exclusiva en MongoDB (Atlas)
        ├── audit.ts              # Bitácora de auditoría con redacción de credenciales
        ├── audit.test.mjs        # Pruebas automatizadas de auditoría
        ├── initialData.ts        # Semilla de datos iniciales
        ├── types.ts              # Modelos e interfaces de dominio
        └── middlewares/
            └── errorHandler.ts   # Manejo centralizado de errores HTTP y 404
```

---

## 🚀 Puesta en Marcha

### 1. Instalación de Dependencias
```bash
npm run install:all
```

### 2. Variables de Entorno (`backend/.env`)
```env
PORT=3000
MONGODB_URI=
MONGODB_DATABASE=phantom_erp
FRONTEND_URL=http://localhost:5173
JWT_SECRET=phantom_erp_hmac_secret_key_2026_secure
BI_API_KEY=
```
> **Importante:** `MONGODB_URI` es obligatoria (por ejemplo, la cadena de conexión de MongoDB Atlas). Si MongoDB no está configurado o no responde al iniciar, el backend mostrará un error en consola y se detendrá. Para habilitar los endpoints analíticos `/api/bi/*`, define una clave secreta en `BI_API_KEY`.

### 3. Ejecución en Desarrollo (1 solo comando)
```bash
npm run dev
```
* **Frontend (Vite):** `http://localhost:5173`
* **Backend (API REST):** `http://localhost:3000/api/health`

### 4. Verificación de Tipado, Build y Tests
```bash
npm run lint
npm test
npm run build
```

---

## 📊 Conexión con Power BI Desktop (`/api/bi`)

El backend expone un modelo estrella (tablas de hechos y dimensiones planas en JSON o CSV mediante `?format=csv`) protegido exclusivamente con el header `x-api-key` (comparado contra `BI_API_KEY` en `backend/.env`):

* **Tablas de Hechos:** `/api/bi/fact_ventas` (excluye ventas anuladas), `/api/bi/fact_detalle_venta`, `/api/bi/fact_kardex`, `/api/bi/fact_cotizaciones`
* **Tablas de Dimensiones:** `/api/bi/dim_productos`, `/api/bi/dim_clientes`, `/api/bi/dim_proveedores`, `/api/bi/dim_tiendas`

### Pasos en Power BI Desktop
1. Configura `BI_API_KEY=<tu-api-key-segura>` en `backend/.env` e inicia el backend.
2. En **Power BI Desktop**, ve a **Inicio > Obtener datos > Web**.
3. Selecciona la opción **Avanzado** (*Advanced*).
4. En **Partes de la dirección URL**, ingresa la URL del endpoint deseado, por ejemplo:
   * JSON: `http://localhost:3000/api/bi/fact_ventas`
   * CSV: `http://localhost:3000/api/bi/fact_ventas?format=csv`
5. En **Parámetros de encabezado de solicitud HTTP (opcional)**, agrega:
   * Encabezado: `x-api-key`
   * Valor: el valor definido en `BI_API_KEY`
6. Haz clic en **Aceptar**. Si Power BI solicita credenciales de acceso al contenido web, elige **Anónimo** (para que se utilice directamente el header `x-api-key` configurado) y haz clic en **Conectar**.
7. Repite el proceso para las demás tablas `fact_*` y `dim_*` y relaciona las claves (`id_venta`, `id_producto`, `id_cliente`, `id_proveedor`, `id_tienda`) en la vista de Modelo.

---

## 👥 Reparto de Responsabilidades

* **Carmen (`frontend/`):**
  * Vistas de interfaz en `frontend/src/components/` (`DashboardView`, `InventoryView`, `KardexView`, `QuotesView`, `SalesView`, `Header`, `LoginView`).
  * Exportación de comprobantes PDF (`frontend/src/lib/pdfGenerator.ts`) y experiencia de usuario.
* **Christian (`backend/`):**
  * Endpoints REST en `backend/src/routes.ts`, endpoints BI en `backend/src/biRoutes.ts`, seguridad JWT/scrypt en `backend/src/security.ts`, lógica de Kardex en `backend/src/dataStore.ts`, conexión MongoDB en `backend/src/mongo.ts` y auditoría en `backend/src/audit.ts`.
