-- Convierte "unidad" de un enum fijo a una tabla editable desde la app,
-- para poder añadir nuevas unidades (kg, l, docena...) sin tocar código.
-- La vista stock_actual depende de la columna, así que hay que quitarla
-- temporalmente y volver a crearla igual.

drop view stock_actual;

create table unidades (
  nombre text primary key
);

insert into unidades (nombre) values ('g'), ('ml'), ('ud');

alter table articulos alter column unidad type text using unidad::text;
alter table articulos add constraint articulos_unidad_fkey foreign key (unidad) references unidades(nombre);

drop type unidad_base;

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

alter view stock_actual set (security_invoker = true);

alter table unidades enable row level security;
create policy "equipo_acceso_total" on unidades for all to authenticated using (true) with check (true);
