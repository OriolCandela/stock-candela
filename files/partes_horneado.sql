-- Registro diario de horneado por sabor, para poder decidir al cierre del día
-- siguiente cuánto de lo horneado se tira (no se toca el stock: hornear no
-- consume ingredientes, ya se descontaron al Formar; esto es solo un registro
-- fechado para saber qué lote de horneado corresponde tirar en cada cierre).
create table partes_horneado (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  articulo_id uuid not null references articulos(id),
  ubicacion_id uuid not null references ubicaciones(id),
  cantidad numeric not null check (cantidad > 0),
  resuelto boolean not null default false,
  usuario_id uuid,
  created_at timestamptz not null default now()
);

alter table mermas add column parte_horneado_id uuid references partes_horneado(id);

alter table partes_horneado enable row level security;

create policy "equipo_acceso_total"
on partes_horneado for all to authenticated
using (true)
with check (true);
