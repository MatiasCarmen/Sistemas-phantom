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
    <div id="modal-vscode-guide" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#141414] rounded-md shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-[#2D2D2D] text-[#e5e2e1]">
        
        {/* Modal Header */}
        <div className="bg-[#0E0E0E] px-6 py-5 text-white flex items-center justify-between border-b border-[#2D2D2D]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#1E1E1E] border border-[#2D2D2D] rounded text-[#ffb3b1]">
              <Code2 className="w-6 h-6 text-[#ffb3b1]" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">Guía de Ejecución Local en Visual Studio Code</h2>
              <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                Arquitectura Full-Stack: React + Node.js Express REST API + Base de Datos Integrada
              </p>
            </div>
          </div>
          <button 
            id="btn-close-vscode-guide"
            onClick={onClose}
            className="p-2 rounded text-zinc-400 hover:text-white hover:bg-[#1E1E1E] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#2D2D2D] bg-[#0E0E0E] px-6 pt-3 gap-2">
          <button
            id="tab-guide-quickstart"
            onClick={() => setActiveTab('quickstart')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t transition-colors flex items-center space-x-2 border-b-2 font-mono cursor-pointer ${
              activeTab === 'quickstart'
                ? 'border-[#C8102E] text-[#ffb3b1] bg-[#141414]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Paso a Paso en VS Code</span>
          </button>
          <button
            id="tab-guide-architecture"
            onClick={() => setActiveTab('architecture')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t transition-colors flex items-center space-x-2 border-b-2 font-mono cursor-pointer ${
              activeTab === 'architecture'
                ? 'border-[#C8102E] text-[#ffb3b1] bg-[#141414]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Estructura & Nest/Next.js</span>
          </button>
          <button
            id="tab-guide-api"
            onClick={() => setActiveTab('api')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t transition-colors flex items-center space-x-2 border-b-2 font-mono cursor-pointer ${
              activeTab === 'api'
                ? 'border-[#C8102E] text-[#ffb3b1] bg-[#141414]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Endpoints API RESTful</span>
          </button>
          <button
            id="tab-guide-database"
            onClick={() => setActiveTab('database')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t transition-colors flex items-center space-x-2 border-b-2 font-mono cursor-pointer ${
              activeTab === 'database'
                ? 'border-[#C8102E] text-[#ffb3b1] bg-[#141414]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Base de Datos & SQL</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#141414]">

          {activeTab === 'quickstart' && (
            <div className="space-y-6">
              <div className="p-4 bg-[#1E1E1E] border border-[#2D2D2D] rounded text-sm text-zinc-200 flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-[#ffb3b1] shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-white">¡El sistema está 100% preparado para ejecutar en local!</strong>
                  <p className="text-zinc-400 text-xs mt-1">
                    Puede clonar o abrir el directorio raíz directamente en Visual Studio Code.
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-zinc-400" />
                    <span>Comandos de Instalación y Ejecución Local</span>
                  </h3>
                  <button
                    id="btn-copy-bash"
                    onClick={() => handleCopy(bashScript, 'bash')}
                    className="text-xs text-[#ffb3b1] hover:text-white flex items-center space-x-1 font-medium cursor-pointer"
                  >
                    {copiedSection === 'bash' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'bash' ? 'Copiado' : 'Copiar comandos'}</span>
                  </button>
                </div>
                <pre className="bg-[#0E0E0E] text-zinc-200 p-4 rounded text-xs font-mono overflow-x-auto leading-relaxed border border-[#2D2D2D]">
                  {bashScript}
                </pre>
              </div>

              {/* Requirements & Tips */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#0E0E0E] border border-[#2D2D2D] rounded">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1 font-mono">Requisitos Previos</span>
                  <p className="text-xs text-zinc-300">
                    Node.js 18+ o 20+ LTS instalado en su estación de trabajo y Visual Studio Code.
                  </p>
                </div>
                <div className="p-4 bg-[#0E0E0E] border border-[#2D2D2D] rounded">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1 font-mono">Puerto de Red</span>
                  <p className="text-xs text-zinc-300">
                    El backend Express y Frontend Vite se sirven en el puerto <strong className="text-white font-mono">3000</strong>.
                  </p>
                </div>
                <div className="p-4 bg-[#0E0E0E] border border-[#2D2D2D] rounded">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1 font-mono">Persistencia</span>
                  <p className="text-xs text-zinc-300">
                    Los datos se sincronizan en <code className="text-[#ffb3b1] font-mono">data/db.json</code> de manera atómica.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="space-y-5">
              <div className="text-sm text-zinc-300 space-y-2">
                <p>
                  El proyecto cuenta con una arquitectura desacoplada y modular que permite utilizarlo como <strong className="text-white">SPA React + Express REST API</strong> o adaptarlo a microservicios.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#0E0E0E] rounded border border-[#2D2D2D]">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center space-x-1.5 font-mono">
                    <FileCode2 className="w-4 h-4 text-[#ffb3b1]" />
                    <span>Estructura de Directorios</span>
                  </h4>
                  <pre className="text-[11px] font-mono text-zinc-300 leading-relaxed bg-[#141414] p-3 rounded border border-[#2D2D2D]">
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

                <div className="p-4 bg-[#0E0E0E] rounded border border-[#2D2D2D] flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center space-x-1.5 font-mono">
                      <Cpu className="w-4 h-4 text-[#ffb3b1]" />
                      <span>Compatibilidad con Nest.js</span>
                    </h4>
                    <p className="text-xs text-zinc-400 mb-2">
                      Los esquemas de <code className="text-[#ffb3b1]">/server/dataStore.ts</code> y <code className="text-[#ffb3b1]">/src/types.ts</code> son 100% compatibles con DTOs y controladores.
                    </p>
                    <pre className="text-[10px] font-mono text-zinc-300 bg-[#141414] p-3 rounded border border-[#2D2D2D] overflow-x-auto">
                      {nestJsExample}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400">
                La API RESTful expone endpoints JSON estructurados que pueden ser consultados desde clientes HTTP:
              </p>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between p-2.5 bg-[#0E0E0E] border border-[#2D2D2D] rounded">
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-0.5 bg-emerald-950/50 text-emerald-400 border border-emerald-500/30 font-bold rounded text-[10px]">GET</span>
                    <span className="text-white font-semibold">/api/products</span>
                  </div>
                  <span className="text-zinc-400 text-[11px] font-sans">Listar productos con filtros (categoría, stock, búsqueda)</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-[#0E0E0E] border border-[#2D2D2D] rounded">
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-0.5 bg-[#C8102E]/20 text-[#ffb3b1] border border-[#C8102E]/40 font-bold rounded text-[10px]">POST</span>
                    <span className="text-white font-semibold">/api/products</span>
                  </div>
                  <span className="text-zinc-400 text-[11px] font-sans">Crear nuevo producto y registrar stock inicial en Kardex</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-[#0E0E0E] border border-[#2D2D2D] rounded">
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-0.5 bg-[#C8102E]/20 text-[#ffb3b1] border border-[#C8102E]/40 font-bold rounded text-[10px]">POST</span>
                    <span className="text-white font-semibold">/api/products/adjust-stock</span>
                  </div>
                  <span className="text-zinc-400 text-[11px] font-sans">Ajuste de inventario (Entrada / Salida / Merma / Kardex)</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-[#0E0E0E] border border-[#2D2D2D] rounded">
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-0.5 bg-emerald-950/50 text-emerald-400 border border-emerald-500/30 font-bold rounded text-[10px]">GET</span>
                    <span className="text-white font-semibold">/api/quotes</span>
                  </div>
                  <span className="text-zinc-400 text-[11px] font-sans">Listar cotizaciones comerciales y estados</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-[#0E0E0E] border border-[#2D2D2D] rounded">
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-0.5 bg-[#C8102E]/20 text-[#ffb3b1] border border-[#C8102E]/40 font-bold rounded text-[10px]">POST</span>
                    <span className="text-white font-semibold">/api/quotes/:id/convert-to-sale</span>
                  </div>
                  <span className="text-zinc-400 text-[11px] font-sans">Convertir cotización en venta, descontar stock y facturar</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-[#0E0E0E] border border-[#2D2D2D] rounded">
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-0.5 bg-[#C8102E]/20 text-[#ffb3b1] border border-[#C8102E]/40 font-bold rounded text-[10px]">POST</span>
                    <span className="text-white font-semibold">/api/sales</span>
                  </div>
                  <span className="text-zinc-400 text-[11px] font-sans">Registrar venta (Factura/Boleta/Ticket) con control de stock</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-[#0E0E0E] border border-[#2D2D2D] rounded">
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-0.5 bg-amber-950/50 text-amber-400 border border-amber-500/30 font-bold rounded text-[10px]">POST</span>
                    <span className="text-white font-semibold">/api/sales/:id/cancel</span>
                  </div>
                  <span className="text-zinc-400 text-[11px] font-sans">Anular venta y reincorporar stock automáticamente</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#0E0E0E] border border-[#2D2D2D] rounded space-y-2">
                <h4 className="text-sm font-semibold text-white">Almacenamiento Local y Migración a SQL</h4>
                <p className="text-xs text-zinc-400">
                  Por defecto, el sistema guarda todas las tablas y movimientos en un archivo JSON estructurado (<code className="text-[#ffb3b1]">data/db.json</code>) con escritura atómica. Si desea conectarlo a <strong className="text-white">PostgreSQL</strong> o <strong className="text-white">MySQL</strong>, puede utilizar el siguiente esquema DDL:
                </p>
              </div>

              <pre className="bg-[#0E0E0E] text-zinc-300 p-4 rounded text-xs font-mono overflow-x-auto leading-relaxed border border-[#2D2D2D]">
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
        <div className="bg-[#0E0E0E] px-6 py-4 border-t border-[#2D2D2D] flex items-center justify-between">
          <span className="text-xs text-zinc-400">
            Puede exportar y realizar backup de la base de datos completa en cualquier momento desde <strong className="text-zinc-200">Configuración</strong>.
          </span>
          <button
            id="btn-understand-vscode"
            onClick={onClose}
            className="px-5 py-2 bg-[#C8102E] hover:bg-[#A80C25] text-white text-xs font-bold rounded transition-colors shadow-sm cursor-pointer"
          >
            Entendido, cerrar guía
          </button>
        </div>

      </div>
    </div>
  );
};
