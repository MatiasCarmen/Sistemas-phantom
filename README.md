# Sistemas Phantom - ERP & WMS (Inventario, Cotizaciones y Ventas)

Sistema web integral para la gestión de inventario, Kardex valorizado, cotizaciones comerciales y facturación/POS.

---

## 🏗️ Arquitectura Desacoplada (`/frontend` y `/backend`)

El repositorio está estructurado como un monorepo limpio con dos paquetes independientes para facilitar el desarrollo en paralelo de **Carmen** (Frontend) y **Christian** (Backend):

```plaintext
sistema-de-inventario-cotización-y-ventas/
├── package.json                  # Orquestador raíz (Workspaces + scripts unificados)
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
    ├── data/
    │   └── db.json               # Respaldo y persistencia local automática
    └── src/
        ├── app.ts                # Fábrica Express (CORS, JSON parser, errorHandler)
        ├── server.ts             # Punto de entrada del servidor (puerto 3000)
        ├── routes.ts             # Endpoints RESTful montados bajo /api
        ├── security.ts           # Firma/verificación JWT (HMAC-SHA256) y hash scrypt
        ├── dataStore.ts          # Lógica transaccional de inventario, Kardex y ventas
        ├── mongo.ts              # Persistencia en MongoDB con fallback automático a JSON
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
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DATABASE=phantom_erp
FRONTEND_URL=http://localhost:5173
JWT_SECRET=phantom_erp_hmac_secret_key_2026_secure
```
> **Nota:** Si MongoDB no está activo localmente en `127.0.0.1:27017`, el backend inicia automáticamente en modo de persistencia local usando `backend/data/db.json` sin interrumpir el desarrollo.

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

## 👥 Reparto de Responsabilidades

* **Carmen (`frontend/`):**
  * Vistas de interfaz en `frontend/src/components/` (`DashboardView`, `InventoryView`, `KardexView`, `QuotesView`, `SalesView`, `Header`, `LoginView`).
  * Exportación de comprobantes PDF (`frontend/src/lib/pdfGenerator.ts`) y experiencia de usuario.
* **Christian (`backend/`):**
  * Endpoints REST en `backend/src/routes.ts`, seguridad JWT/scrypt en `backend/src/security.ts`, lógica de Kardex en `backend/src/dataStore.ts`, conexión MongoDB en `backend/src/mongo.ts` y auditoría en `backend/src/audit.ts`.
