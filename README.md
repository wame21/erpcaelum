# CAELUM — Joyería de plata .925 · Tienda + ERP

> **Silentium est potentia** — El lujo real se lleva en silencio.

Sistema completo para **CAELUM**, marca de joyería de autor en plata .925: una tienda en línea pública (catálogo, carrito y pedidos) y un ERP interno para gestionar inventario, costos históricos, márgenes, gastos, caja, catálogos PDF y consignaciones con vendedores externos.

**Sitio público:** [caelumjoyeria.lovable.app](https://caelumjoyeria.lovable.app)

---

## ✨ Módulos

### Tienda pública

- **Landing** mobile-first con estética oscura, minimalista y de lujo.
- **Catálogo en línea** con categorías (cadenas / pulsos) y **filtros dinámicos por tejido**.
- **Carrito y pedidos** con precios calculados por margen y empaque.
- Páginas legales (privacidad y términos).

### ERP interno (`/admin`, protegido por autenticación y rol admin)

- **Productos**: SKUs, código de proveedor, medida, grosor, tejido, peso y costo por gramo histórico.
- **Lotes de compra**: costos congelados por lote — el costo histórico nunca se recalcula.
- **Inventario trazable**: movimientos, ajustes autorizados y estado en consignación.
- **Tejidos dinámicos**: alta de tejidos desde panel; crean sus reglas de margen automáticamente y sirven como filtro en el catálogo y el PDF.
- **Márgenes y precios**: margen por categoría/tejido, piso global por gramo, sugerencias con advertencias y excepciones por pieza.
- **Costos**: comparativo costo histórico vs. costo de reposición.
- **Gastos clasificados**: mercancía, costo directo (empaque), operativo y financiero.
- **Caja** y flujo de efectivo, **pedidos** y **dashboard** de métricas.
- **Catálogo PDF** premium agrupado por categoría y tejido.
- **Consignaciones**: vendedores externos con folio único, comisión sobre precio real, precios de negociación/mínimo autorizado, estados (preparada → entregada → vendida/devuelta → cerrada), registro de ventas y devoluciones, liquidación, **PDF para el vendedor** (sin información financiera interna) y **reporte interno** con utilidad y márgenes.

### Integridad financiera

- Precios sugeridos con `(costo histórico + empaque) / (1 − margen objetivo)`.
- Comisión sobre el **precio real de venta**: `importe_caelum = precio_real − comisión`.
- Costos históricos y ventas registradas son inmutables (integridad histórica).

---

## 🛠 Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | React 19 + TanStack Start v1 (SSR, file-based routing) |
| Build | Vite 8 · TypeScript 5.8 |
| Estilos | Tailwind CSS v4 + shadcn/ui (tema oscuro semántico) |
| Estado/datos | TanStack Query + server functions (`createServerFn`) |
| Backend/DB | Supabase (Postgres, RLS, RPC, Storage) |
| PDFs | jsPDF (catálogo, consignaciones) |
| Hosting | Lovable (Cloudflare Workers) |

---

## 🗄 Base de datos (Supabase)

Tablas principales del esquema `public`:

| Tabla | Propósito |
| --- | --- |
| `productos` | Catálogo con costo por gramo histórico, precios e imagen (`imagen_path`) |
| `lotes_compra` | Compras con costos congelados |
| `movimientos_inventario` | Trazabilidad de inventario |
| `codigos_proveedor` | Costos por gramo por código |
| `tejidos` | Tejidos dinámicos con márgenes |
| `config_margenes` | Margen por `(categoría, tejido)` |
| `gastos` | Gastos con clasificación (empaque = costo directo) |
| `pedidos` | Pedidos de la tienda |
| `caja_movimientos` | Flujo de efectivo |
| `consignaciones`, `consignacion_items`, `consignacion_ventas` | Módulo de consignaciones |
| `vendedores_externos` | Vendedores de consignación |
| `user_roles` | Roles (admin) — nunca en la tabla de perfiles |

- Bucket de imágenes: **`caelum_imagenes`** (URLs firmadas).
- Vista `productos_con_precio` para precios finales.
- Operaciones críticas (entregar, vender, devolver, liquidar consignación) mediante **funciones RPC** transaccionales.
- RLS habilitado: lectura pública solo para productos/tejidos activos; el ERP requiere sesión + rol admin.

---

## 🚀 Puesta en marcha

### Requisitos

- Node 20+ (o Bun) y acceso a un proyecto de Supabase.

### Variables de entorno

Copia `.env.example` (o crea `.env`):

```env
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

> En Lovable estas llaves se inyectan automáticamente (Lovable Cloud); solo son necesarias si ejecutas el proyecto fuera de Lovable.

### Desarrollo

```bash
bun install        # o npm install
bun run dev        # http://localhost:8080
```

### Scripts

| Comando | Descripción |
| --- | --- |
| `bun run dev` | Servidor de desarrollo |
| `bun run build` | Build de producción |
| `bun run lint` | ESLint |
| `bun run format` | Prettier |

### Estructura

```text
src/
├─ components/        # UI (tienda + paneles admin)
├─ lib/
│  ├─ *.functions.ts  # Server functions (seguras para el cliente)
│  ├─ *.server.ts     # Helpers solo-servidor
│  └─ precios.ts      # Motor de precios y márgenes
├─ routes/
│  ├─ index.tsx       # Landing
│  ├─ carrito.tsx     # Carrito y checkout
│  ├─ _authenticated/ # /admin, /dashboard (protegido)
│  └─ api/            # Endpoints HTTP
└─ integrations/supabase/
```

---

## 📦 Despliegue

El proyecto se despliega con **Lovable** (publish → `caelumjoyeria.lovable.app`). Para hosting propio: `bun run build` genera el output desplegable; configura las variables de entorno y tu proyecto de Supabase en la plataforma destino.

### Sincronización con GitHub

El repositorio tiene sincronización bidireccional con GitHub: los cambios en Lovable se empujan automáticamente, y los `push` desde local se sincronizan de vuelta. Las migraciones de base de datos **no** viajan por Git — se gestionan desde Lovable Cloud.

---

## 🔐 Seguridad

- Autenticación por Supabase; roles almacenados en `user_roles` con verificación `security definer` (nunca en perfiles ni en el cliente).
- Toda la información financiera interna (costos, utilidades, márgenes) está restringida al ERP; el PDF del vendedor solo muestra precios públicos, de negociación y el mínimo autorizado.

---

*CAELUM · Joyería de plata .925 — Guasave, Sinaloa, México.*
