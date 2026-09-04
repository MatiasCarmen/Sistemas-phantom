import React, { useState } from 'react';
import { 
  X, 
  Terminal, 
  Copy, 
  Check, 
  FolderTree, 
  Database, 
  Server, 
  Code2, 
  Download, 
  Sparkles,
  Layers,
  ArrowRight,
  FileCode2,
  Cpu
} from 'lucide-react';

interface LocalVsCodeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocalVsCodeGuideModal: React.FC<LocalVsCodeGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'quickstart' | 'architecture' | 'api' | 'database'>('quickstart');

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const bashScript = `# 1. Clonar o descargar el repositorio / ZIP
# Abre tu terminal de Visual Studio Code (Ctrl + \`) en la carpeta del proyecto

# 2. Instalar dependencias del sistema
npm install

# 3. Iniciar el servidor Full-Stack (Backend Express API + Frontend React en vivo)
npm run dev

# 4. Abrir en tu navegador local
# Ingresa a: http://localhost:3000`;

  const envContent = `# Configuración de variables de entorno para ejecución local
PORT=3000
NODE_ENV=development
DATA_STORAGE_PATH=./data/db.json`;

  const nestJsExample = `// Estructura para migración opcional a Nest.js / PostgreSQL (TypeORM/Prisma)
// src/products/products.controller.ts
import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';

@Controller('api/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Post('adjust-stock')
  adjustStock(@Body() adjustDto: any) {
    return this.productsService.adjustStock(adjustDto);
  }
}`;

  return (
    <div id="modal-vscode-guide" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-400/30 rounded-xl">
              <Code2 className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Guía de Ejecución Local en Visual Studio Code</h2>
              <p className="text-xs text-blue-200 mt-0.5">
                Arquitectura Full-Stack: React + Node.js Express REST API + Base de Datos Integrada
              </p>
            </div>
          </div>
          <button 
            id="btn-close-vscode-guide"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            id="tab-guide-quickstart"
            onClick={() => setActiveTab('quickstart')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors flex items-center space-x-2 border-b-2 ${
              activeTab === 'quickstart'
                ? 'border-blue-600 text-blue-700 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Paso a Paso en VS Code</span>
          </button>
          <button
            id="tab-guide-architecture"
            onClick={() => setActiveTab('architecture')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors flex items-center space-x-2 border-b-2 ${
              activeTab === 'architecture'
                ? 'border-blue-600 text-blue-700 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Estructura & Nest/Next.js</span>
          </button>
          <button
            id="tab-guide-api"
            onClick={() => setActiveTab('api')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors flex items-center space-x-2 border-b-2 ${
              activeTab === 'api'
                ? 'border-blue-600 text-blue-700 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Endpoints API RESTful</span>
          </button>
          <button
            id="tab-guide-database"
            onClick={() => setActiveTab('database')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors flex items-center space-x-2 border-b-2 ${
              activeTab === 'database'
                ? 'border-blue-600 text-blue-700 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Base de Datos & SQL</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {activeTab === 'quickstart' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50/80 border border-blue-100 rounded-xl text-sm text-blue-900 flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">¡El sistema ya está 100% listo para ejecutar en local!</strong>
                  <p className="text-blue-800 text-xs mt-1">
                    Puedes descargar el código fuente (Export to ZIP / GitHub desde el menú superior) y abrirlo directamente en Visual Studio Code.
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-slate-600" />
                    <span>Comandos de Instalación y Ejecución Local</span>
                  </h3>
                  <button
                    id="btn-copy-bash"
                    onClick={() => handleCopy(bashScript, 'bash')}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1 font-medium"
                  >
                    {copiedSection === 'bash' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'bash' ? 'Copiado' : 'Copiar comandos'}</span>
                  </button>
                </div>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
                  {bashScript}
                </pre>
              </div>

              {/* Requirements & Tips */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Requisitos Previos</span>
                  <p className="text-xs text-slate-700">
                    Node.js 18+ o 20+ LTS instalado en tu computadora y Visual Studio Code.
                  </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Puerto de Red</span>
                  <p className="text-xs text-slate-700">
                    El backend Express y Frontend Vite se sirven en el puerto <strong>3000</strong>.
                  </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Persistencia</span>
                  <p className="text-xs text-slate-700">
                    Los datos se guardan automáticamente en <code>data/db.json</code> sin requerir configuración extra.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="space-y-5">
              <div className="text-sm text-slate-700 space-y-2">
                <p>
                  El proyecto cuenta con una arquitectura desacoplada y modular que permite utilizarlo como <strong>SPA React + Express REST API</strong> o migrar fácilmente a <strong>Next.js App Router</strong> o <strong>Nest.js</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                    <FileCode2 className="w-4 h-4 text-blue-600" />
                    <span>Estructura de Directorios</span>
                  </h4>
                  <pre className="text-[11px] font-mono text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
{`├── server.ts              # Entry point Express + Vite
├── server/
│   ├── routes.ts         # Endpoints REST API (/api/*)
│   ├── dataStore.ts      # Lógica de datos y persistencia
│   └── initialData.ts    # Seed data inicial
├── src/
│   ├── components/       # Módulos UI (Inventario, Cotizaciones, POS)
│   ├── lib/              # api.ts (cliente HTTP) y pdfGenerator.ts
│   ├── types.ts          # Modelos TypeScript compartidos
│   ├── App.tsx           # Router de vistas y estado global
│   └── main.tsx          # Bootstrap React
└── data/
    └── db.json           # Almacenamiento local persistente`}
                  </pre>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                      <Cpu className="w-4 h-4 text-indigo-600" />
                      <span>Compatibilidad con Nest.js</span>
                    </h4>
                    <p className="text-xs text-slate-600 mb-2">
                      Los servicios de <code>/server/dataStore.ts</code> y <code>/src/types.ts</code> son 100% compatibles con controladores e inyección de dependencias de Nest.js.
                    </p>
                    <pre className="text-[10px] font-mono text-slate-800 bg-white p-3 rounded-lg border border-slate-200 overflow-x-auto">
                      {nestJsExample}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                La API RESTful expone endpoints JSON completos que pueden ser consumidos desde Postman, Frontend Web o Apps Móviles:
              </p>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">GET</span>
                    <span className="text-slate-800 font-semibold">/api/products</span>
                  </div>
                  <span className="text-slate-500 text-[11px] font-sans">Listar productos con filtros (categoría, stock, búsqueda)</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded text-[10px]">POST</span>
                    <span className="text-slate-800 font-semibold">/api/products</span>
                  </div>
                  <span className="text-slate-500 text-[11px] font-sans">Crear nuevo producto y registrar stock inicial en Kardex</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded text-[10px]">POST</span>
                    <span className="text-slate-800 font-semibold">/api/products/adjust-stock</span>
                  </div>
                  <span className="text-slate-500 text-[11px] font-sans">Ajuste de inventario (Entrada / Salida / Merma / Kardex)</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">GET</span>
                    <span className="text-slate-800 font-semibold">/api/quotes</span>
                  </div>
                  <span className="text-slate-500 text-[11px] font-sans">Listar cotizaciones comerciales y estados</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold rounded text-[10px]">POST</span>
                    <span className="text-slate-800 font-semibold">/api/quotes/:id/convert-to-sale</span>
                  </div>
                  <span className="text-slate-500 text-[11px] font-sans">Convertir cotización en venta, descontar stock y facturar</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded text-[10px]">POST</span>
                    <span className="text-slate-800 font-semibold">/api/sales</span>
                  </div>
                  <span className="text-slate-500 text-[11px] font-sans">Registrar venta (Factura/Boleta/Ticket) con control de stock</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded text-[10px]">POST</span>
                    <span className="text-slate-800 font-semibold">/api/sales/:id/cancel</span>
                  </div>
                  <span className="text-slate-500 text-[11px] font-sans">Anular venta y reincorporar stock automáticamente</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <h4 className="text-sm font-semibold text-slate-800">Almacenamiento Local y Migración a SQL</h4>
                <p className="text-xs text-slate-600">
                  Por defecto, el sistema guarda todas las tablas y movimientos en un archivo JSON estructurado (<code>data/db.json</code>) con escritura atómica. Si deseas conectarlo a <strong>PostgreSQL</strong> o <strong>MySQL</strong> en Visual Studio Code, puedes usar el siguiente esquema DDL:
                </p>
              </div>

              <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
{`-- Esquema SQL Relacional para PostgreSQL / MySQL
CREATE TABLE products (
  id VARCHAR(64) PRIMARY KEY,
  sku VARCHAR(64) UNIQUE NOT NULL,
  barcode VARCHAR(64),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  brand VARCHAR(100),
  cost_price DECIMAL(12,2) NOT NULL,
  selling_price DECIMAL(12,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 18.00,
  stock INT NOT NULL DEFAULT 0,
  min_stock INT NOT NULL DEFAULT 5,
  unit VARCHAR(20) DEFAULT 'UND',
  location VARCHAR(100),
  status VARCHAR(20) DEFAULT 'in_stock',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_movements (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) REFERENCES products(id),
  type VARCHAR(30) NOT NULL, -- 'IN_PURCHASE', 'OUT_SALE', 'IN_ADJUSTMENT', etc.
  quantity INT NOT NULL,
  previous_stock INT NOT NULL,
  new_stock INT NOT NULL,
  unit_cost DECIMAL(12,2),
  reference_id VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quotes (
  id VARCHAR(64) PRIMARY KEY,
  quote_number VARCHAR(64) UNIQUE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_tax_id VARCHAR(50),
  date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  status VARCHAR(30) DEFAULT 'SENT',
  subtotal DECIMAL(12,2) NOT NULL,
  tax_total DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL
);

CREATE TABLE sales (
  id VARCHAR(64) PRIMARY KEY,
  sale_number VARCHAR(64) UNIQUE NOT NULL,
  voucher_type VARCHAR(20) NOT NULL, -- 'FACTURA', 'BOLETA', 'TICKET'
  customer_name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  status VARCHAR(20) DEFAULT 'COMPLETED'
);`}
              </pre>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Puedes exportar y hacer backup de tu base de datos completa en cualquier momento desde <strong>Configuración</strong>.
          </span>
          <button
            id="btn-understand-vscode"
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
          >
            Entendido, cerrar guía
          </button>
        </div>

      </div>
    </div>
  );
};
