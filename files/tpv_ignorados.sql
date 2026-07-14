-- Códigos/nombres del TPV que NO son artículos vendibles reales
-- (ej. "Take away", "Local", "VACA", "AVENA": modificadores o etiquetas de servicio,
-- no productos que consuman stock). Una vez marcados aquí, el import de ventas
-- los ignora automáticamente sin volver a preguntar cada día.
create table tpv_ignorados (
  codigo_tpv text primary key,
  motivo text,
  created_at timestamptz not null default now()
);

alter table tpv_ignorados enable row level security;
create policy "equipo_acceso_total" on tpv_ignorados for all to authenticated using (true) with check (true);
