# Phantom WMS - Design System Specification

## 1. Fundamentos de Identidad & Color

### Tokens de Color Oficiales
```yaml
name: Phantom Logistics / Phantom WMS
colors:
  # Primario Corporativo
  primary: '#C8102E'                # Rojo Phantom corporativo de alto impacto
  on-primary: '#FFFFFF'             # Texto blanco puro de alto contraste
  primary-hover: '#A80C25'          # Estado hover controlado
  primary-container: '#8A091E'      # Rojo vino oscuro para contenedores y hover secundario
  on-primary-container: '#FFDAD8'   # Tono claro de alto contraste para contenedores primarios
  inverse-primary: '#bf0229'

  # Superficies Tonales Industriales
  surface-container-lowest: '#000000' # Fondo de contraste absoluto
  surface-dim: '#0B0B0B'              # Fondo atenuado / login
  surface-container-low: '#0E0E0E'    # Fondo de sidebar y barras base
  surface: '#111111'                  # Superficie de lienzo principal
  surface-container: '#141414'        # Paneles, tablas y contenedores de trabajo
  surface-bright: '#1E1E1E'           # Tarjetas activas, barras de filtros, cabeceras
  surface-container-high: '#1E1E1E'   # Tarjetas elevadas
  surface-container-highest: '#2D2D2D'# Estados hover de filas, chips interactivos

  # Texto y Contraste
  on-surface: '#FFFFFF'               # Texto principal de alta legibilidad
  on-surface-variant: '#D1D5DB'       # Texto secundario / etiquetas
  on-surface-dim: '#9CA3AF'           # Texto atenuado / placeholders

  # Microbordes y Estructura
  outline: '#2D2D2D'                  # Microborde estructural estándar (1px solid #2D2D2D)
  outline-variant: '#1E1E1E'          # Separador sutil secundario

  # Paleta Semántica
  success: '#10B981'                  # Stock disponible, validado, cobrado
  on-success: '#FFFFFF'
  success-container: '#064E3B'
  on-success-container: '#A7F3D0'

  warning: '#F59E0B'                  # Stock mínimo, cotización pendiente, preventivo
  on-warning: '#000000'
  warning-container: '#78350F'
  on-warning-container: '#FDE68A'

  info: '#3B82F6'                     # En tránsito, despachos entre almacenes
  on-info: '#FFFFFF'
  info-container: '#1E3A8A'
  on-info-container: '#DBEAFE'

  error: '#C8102E'                    # Quiebre de stock, anulado, error crítico
  on-error: '#FFFFFF'
  error-container: '#410006'
  on-error-container: '#FFDAD8'
```

### Regla Operativa Crítica: Botón Primario vs Quiebre de Stock / Error
Dado que el rojo corporativo (`#C8102E`) coincide con el código cromático de alerta:
1. **Acciones Principales (CTA / Guardar / Nueva Venta / Iniciar Sesión):**
   - Fondo sólido `#C8102E` con texto `#FFFFFF`.
   - Efecto hover con oscurecimiento controlado a `#A80C25`.
2. **Alertas / Quiebre de Stock / Error Crítico:**
   - **Nunca** usar un botón o tarjeta de fondo sólido rojo plano sin diferenciar.
   - Usar fondo tintado `rgba(200, 16, 46, 0.14)` (o `bg-[#410006]/50`).
   - Microborde estructurado de `1px solid #C8102E`.
   - Acompañamiento obligatorio de icono de advertencia (`AlertTriangle`, `AlertCircle` u `OctagonX`).

---

## 2. Tipografía Industrial & Alineación de Datos

- **Fuente Primaria UI**: `Geist`, con fallbacks a `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
- **Fuente de Datos & Kardex**: `JetBrains Mono` con `font-variant-numeric: tabular-nums;`.
  - Imprescindible para evitar saltos o desalineaciones en columnas numéricas de stock, precios en Soles (S/.), SKUs, códigos de barra EAN-13 y correlativos de documentos.

---

## 3. Geometría y Tonal Layering Industrial

- **Radio de curvatura (Border Radius)**:
  - `sm`: 2px
  - `DEFAULT` / `md`: 4px (`rounded` o `rounded-md`)
  - `lg`: 6px (`rounded-lg`)
  - Se eliminan redondeados excesivos tipo app móvil (`rounded-3xl`, `rounded-2xl`) para mantener un acabado industrial serio y compacto.
- **Tonal Layering sin sombras difusas**:
  - Evitar sombras `box-shadow` difusas y de colores.
  - Separación visual mediante microbordes nítidos de `1px solid #2D2D2D` sobre superficies `#1E1E1E` y base `#141414` / `#0E0E0E`.

---

## 4. Arquitectura Dual de Temas (Dark & Clean White)

El sistema incorpora un interruptor de tema dinámico persistido en `localStorage` (`phantom_theme: 'dark' | 'light'`) y sincronizado mediante la clase `.theme-light` en `document.documentElement`:

| Token Semántico | Modo Oscuro (Phantom Dark) | Modo Claro (Phantom Clean White) |
| :--- | :--- | :--- |
| **Lienzo Base (Canvas)** | `#0E0E0E` | `#F4F5F7` (Gris frío industrial) |
| **Paneles & Tablas (Container)** | `#141414` | `#FFFFFF` (Blanco puro) |
| **Tarjetas & Filtros (Bright)** | `#1E1E1E` | `#F8FAFC` / `#FFFFFF` |
| **Microbordes Estructurales** | `#2D2D2D` | `#E2E8F0` |
| **Texto Principal** | `#FFFFFF` | `#0F172A` (Slate 900) |
| **Texto Secundario** | `#c8c6c6` / `zinc-300` | `#334155` (Slate 700) |
| **Texto Muted** | `zinc-400` / `zinc-500` | `#64748B` (Slate 500) |
| **Acento Texto Primario** | `#ffb3b1` | `#C8102E` (Rojo corporativo) |
| **Botones Principales CTA** | Sólido `#C8102E` + Texto Blanco | Sólido `#C8102E` + Texto Blanco |

**Garantía de Contraste:** Los botones y badges con fondos coloreados (`#C8102E`, `#A80C25`, verde, azul, ámbar) conservan de manera estricta el color de texto blanco (`#FFFFFF`) para cumplir con accesibilidad WCAG AAA en ambos modos.
