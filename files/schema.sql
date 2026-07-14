-- Sistema de Control de Stock — IGGE Group
-- Postgres / Supabase
-- Principio: libro de movimientos inmutable, multi-ubicación desde el día 1.

create type tipo_articulo as enum ('materia_prima', 'producto_terminado', 'consumible');
create type unidad_base as enum ('g', 'ml', 'ud');
create type tipo_movimiento as enum (
  'compra', 'venta', 'produccion_consumo', 'produccion_alta',
  'merma', 'transferencia_salida', 'transferencia_entrada', 'ajuste'
);
create type motivo_merma as enum ('caducado', 'error_produccion', 'invitacion', 'rotura', 'otro');
create type estado_albaran as enum ('pendiente_revision', 'confirmado', 'anulado');

create table ubicaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

create table proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  nif text,
  contacto text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table articulos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  tipo tipo_articulo not null,
  unidad unidad_base not null,
  stock_minimo numeric,             -- en unidad base, por defecto aplica a todas las ubicaciones
  coste_medio numeric,              -- precio medio ponderado por unidad base, se recalcula al confirmar albaranes
  codigo_tpv text,                  -- mapeo con el artículo de Hiopos (solo producto_terminado)
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Mapeo texto-del-albarán -> artículo interno, con conversión de unidades.
-- Ej.: proveedor X, "HARINA GRAN FUERZA W300 SACO 25KG" -> harina de fuerza, factor 25000 (g por unidad de albarán)
create table alias_proveedor (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references proveedores(id),
  texto_albaran text not null,
  articulo_id uuid not null references articulos(id),
  factor_conversion numeric not null check (factor_conversion > 0),
  unique (proveedor_id, texto_albaran)
);

-- Escandallos: cabecera con rendimiento (ej. 1 lote de masa -> 24 rolls)
create table escandallos (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references articulos(id),
  nombre text not null,             -- "Roll clásico", "Roll vegano"
  rendimiento numeric not null check (rendimiento > 0),  -- unidades de producto por lote
  activo boolean not null default true,
  unique (producto_id, nombre)
);

create table escandallo_lineas (
  id uuid primary key default gen_random_uuid(),
  escandallo_id uuid not null references escandallos(id) on delete cascade,
  ingrediente_id uuid not null references articulos(id),
  cantidad_por_lote numeric not null check (cantidad_por_lote > 0)  -- en unidad base del ingrediente
);

-- LIBRO DE MOVIMIENTOS: inmutable. Los errores se corrigen con ajustes, nunca con update/delete.
create table movimientos (
  id uuid primary key default gen_random_uuid(),
  tipo tipo_movimiento not null,
  articulo_id uuid not null references articulos(id),
  ubicacion_id uuid not null references ubicaciones(id),
  cantidad numeric not null,        -- positiva (entrada) o negativa (salida), en unidad base
  ref_tabla text,                   -- 'albaranes', 'partes_produccion', 'mermas', 'ventas_import', 'inventarios', 'transferencias'
  ref_id uuid,
  notas text,
  usuario_id uuid,                  -- auth.users
  created_at timestamptz not null default now()
);
create index idx_mov_articulo_ubicacion on movimientos (articulo_id, ubicacion_id);
create index idx_mov_ref on movimientos (ref_tabla, ref_id);

-- Vista de stock actual
create view stock_actual as
select
  m.articulo_id,
  a.nombre as articulo,
  a.tipo,
  a.unidad,
  m.ubicacion_id,
  u.nombre as ubicacion,
  sum(m.cantidad) as stock,
  a.stock_minimo,
  (a.stock_minimo is not null and sum(m.cantidad) < a.stock_minimo) as bajo_minimo
from movimientos m
join articulos a on a.id = m.articulo_id
join ubicaciones u on u.id = m.ubicacion_id
group by m.articulo_id, a.nombre, a.tipo, a.unidad, m.ubicacion_id, u.nombre, a.stock_minimo;

-- Recepción de albaranes
create table albaranes (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid references proveedores(id),
  ubicacion_id uuid not null references ubicaciones(id),
  numero text,
  fecha date not null default current_date,
  foto_path text,                   -- Supabase Storage
  estado estado_albaran not null default 'pendiente_revision',
  usuario_id uuid,
  created_at timestamptz not null default now()
);

create table albaran_lineas (
  id uuid primary key default gen_random_uuid(),
  albaran_id uuid not null references albaranes(id) on delete cascade,
  texto_original text,              -- lo que decía el albarán (OCR o manual)
  articulo_id uuid references articulos(id),   -- null hasta que se mapea
  cantidad_albaran numeric not null check (cantidad_albaran > 0),  -- en unidades del albarán (sacos, cajas...)
  factor_conversion numeric,        -- copiado del alias al mapear
  cantidad_base numeric generated always as (cantidad_albaran * coalesce(factor_conversion, 1)) stored,
  precio_unitario numeric           -- por unidad de albarán, opcional
);

-- Partes de producción
create table partes_produccion (
  id uuid primary key default gen_random_uuid(),
  escandallo_id uuid not null references escandallos(id),
  ubicacion_id uuid not null references ubicaciones(id),
  lotes numeric not null check (lotes > 0),   -- nº de masas/lotes producidos
  fecha date not null default current_date,
  usuario_id uuid,
  created_at timestamptz not null default now()
);

-- Mermas
create table mermas (
  id uuid primary key default gen_random_uuid(),
  articulo_id uuid not null references articulos(id),
  ubicacion_id uuid not null references ubicaciones(id),
  cantidad numeric not null check (cantidad > 0),
  motivo motivo_merma not null,
  notas text,
  foto_path text,
  usuario_id uuid,
  created_at timestamptz not null default now()
);

-- Import de ventas (staging desde CSV de Hiopos; fase 2: API)
create table ventas_import (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  ubicacion_id uuid not null references ubicaciones(id),
  codigo_tpv text not null,
  descripcion_tpv text,
  unidades numeric not null,
  articulo_id uuid references articulos(id),  -- resuelto por codigo_tpv
  procesado boolean not null default false,
  created_at timestamptz not null default now(),
  unique (fecha, ubicacion_id, codigo_tpv)    -- evita duplicar el mismo día dos veces
);

-- Inventarios físicos
create table inventarios (
  id uuid primary key default gen_random_uuid(),
  ubicacion_id uuid not null references ubicaciones(id),
  fecha date not null default current_date,
  cerrado boolean not null default false,
  usuario_id uuid,
  created_at timestamptz not null default now()
);

create table inventario_lineas (
  id uuid primary key default gen_random_uuid(),
  inventario_id uuid not null references inventarios(id) on delete cascade,
  articulo_id uuid not null references articulos(id),
  cantidad_contada numeric not null check (cantidad_contada >= 0),
  cantidad_teorica numeric,         -- snapshot al cerrar
  unique (inventario_id, articulo_id)
);

-- Transferencias entre ubicaciones (fase 2)
create table transferencias (
  id uuid primary key default gen_random_uuid(),
  origen_id uuid not null references ubicaciones(id),
  destino_id uuid not null references ubicaciones(id),
  fecha date not null default current_date,
  confirmada boolean not null default false,
  usuario_id uuid,
  created_at timestamptz not null default now(),
  check (origen_id <> destino_id)
);

create table transferencia_lineas (
  id uuid primary key default gen_random_uuid(),
  transferencia_id uuid not null references transferencias(id) on delete cascade,
  articulo_id uuid not null references articulos(id),
  cantidad numeric not null check (cantidad > 0)
);

-- Datos semilla
insert into ubicaciones (nombre, activa) values
  ('Candela Gràcia', true),
  ('Almacén Central', false),
  ('Good Cherry', false);
