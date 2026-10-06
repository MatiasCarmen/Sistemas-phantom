# Sistemas Phantom

Sistema web para la gestion de inventario, cotizaciones y ventas orientado a pequenas empresas comerciales.

## Tecnologias

- React
- Vite
- TypeScript
- Express
- Node.js
- MongoDB

## Instalacion

```bash
npm install
```

## Ejecucion local

Usa Node.js 20.19 o superior. Copia `.env.example` como `.env` y configura `MONGODB_URI` para tu instancia local o MongoDB Atlas; `MONGODB_DATABASE` es opcional (por defecto `phantom_erp`).

```text
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DATABASE=phantom_erp
```

El servidor requiere MongoDB disponible para iniciar. En el primer arranque, si la colección de estado está vacía y existe `data/db.json`, importa su contenido a MongoDB sin eliminar el archivo original. Los cambios posteriores se guardan en MongoDB.

```bash
npm run dev
```

La aplicacion se ejecuta por defecto en:

```text
http://localhost:3000
```

