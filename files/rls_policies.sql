-- Políticas de acceso (RLS) — equipo pequeño, 3-5 usuarios autenticados.
-- Cualquier usuario autenticado puede leer y escribir, EXCEPTO en `movimientos`,
-- que es un libro inmutable: solo se permite insertar y leer, nunca editar ni borrar.

alter table ubicaciones enable row level security;
alter table proveedores enable row level security;
alter table articulos enable row level security;
alter table alias_proveedor enable row level security;
alter table escandallos enable row level security;
alter table escandallo_lineas enable row level security;
alter table movimientos enable row level security;
alter table albaranes enable row level security;
alter table albaran_lineas enable row level security;
alter table partes_produccion enable row level security;
alter table mermas enable row level security;
alter table ventas_import enable row level security;
alter table inventarios enable row level security;
alter table inventario_lineas enable row level security;
alter table transferencias enable row level security;
alter table transferencia_lineas enable row level security;

-- Acceso completo (select/insert/update/delete) para usuarios autenticados
create policy "equipo_acceso_total" on ubicaciones for all to authenticated using (true) with check (true);
create policy "equipo_acceso_total" on proveedores for all to authenticated using (true) with check (true);
create policy "equipo_acceso_total" on articulos for all to authenticated using (true) with check (true);
create policy "equipo_acceso_total" on alias_proveedor for all to authenticated using (true) with check (true);
create policy "equipo_acceso_total" on escandallos for all to authenticated using (true) with check (true);
create policy "equipo_acceso_total" on escandallo_lineas for all to authenticated using (true) with check (true);
create policy "equipo_acceso_total" on albaranes for all to authenticated using (true) with check (true);
create policy "equipo_acceso_total" on albaran_lineas for all to authenticated using (true) with check (true);
create policy "equipo_acceso_total" on partes_produccion for all to authenticated using (true) with check (true);
create policy "equipo_acceso_total" on mermas for all to authenticated using (true) with check (true);
create policy "equipo_acceso_total" on ventas_import for all to authenticated using (true) with check (true);
create policy "equipo_acceso_total" on inventarios for all to authenticated using (true) with check (true);
create policy "equipo_acceso_total" on inventario_lineas for all to authenticated using (true) with check (true);
create policy "equipo_acceso_total" on transferencias for all to authenticated using (true) with check (true);
create policy "equipo_acceso_total" on transferencia_lineas for all to authenticated using (true) with check (true);

-- movimientos: libro inmutable. Solo lectura + inserción, nunca update/delete.
create policy "equipo_lee_movimientos" on movimientos for select to authenticated using (true);
create policy "equipo_inserta_movimientos" on movimientos for insert to authenticated with check (true);

-- La vista stock_actual debe respetar el RLS de quien consulta, no del propietario.
alter view stock_actual set (security_invoker = true);
