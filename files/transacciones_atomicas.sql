-- Operaciones que antes se hacían en varios pasos separados desde la app
-- (insertar movimientos, luego actualizar un estado) y que si fallaban a
-- mitad dejaban el registro en un estado intermedio: reintentarlas duplicaba
-- los movimientos de stock ya aplicados. Se mueven a funciones de Postgres
-- para que cada una se ejecute en una única transacción: o se aplica entera,
-- o no se aplica nada.

create or replace function confirmar_albaran(p_albaran_id uuid)
returns void
language plpgsql
as $$
declare
  v_albaran albaranes%rowtype;
  v_linea record;
  v_articulo_id uuid;
  v_nombre text;
  v_stock_actual numeric;
  v_coste_actual numeric;
  v_stock_previo numeric;
  v_nuevo_coste numeric;
  v_valor_linea numeric;
  v_alias_id uuid;
begin
  select * into v_albaran from albaranes where id = p_albaran_id for update;
  if not found then
    raise exception 'Albarán no encontrado';
  end if;
  if v_albaran.estado <> 'pendiente_revision' then
    raise exception 'Este albarán ya no está pendiente de revisión';
  end if;

  if not exists (select 1 from albaran_lineas where albaran_id = p_albaran_id) then
    raise exception 'El albarán no tiene líneas';
  end if;

  -- Resolver líneas sin artículo asignado: buscar por nombre exacto o crear uno nuevo.
  for v_linea in
    select id, texto_original from albaran_lineas
    where albaran_id = p_albaran_id and articulo_id is null
  loop
    if v_linea.texto_original is null then
      raise exception 'Hay una línea sin artículo ni texto original';
    end if;
    v_nombre := trim(v_linea.texto_original);

    select id into v_articulo_id from articulos where lower(nombre) = lower(v_nombre) limit 1;
    if v_articulo_id is null then
      insert into articulos (nombre, tipo, unidad) values (v_nombre, 'materia_prima', 'ud')
      returning id into v_articulo_id;
    end if;

    update albaran_lineas set articulo_id = v_articulo_id where id = v_linea.id;
  end loop;

  -- Por cada línea: movimiento de compra, recálculo de coste medio y alias de proveedor.
  for v_linea in
    select id, articulo_id, texto_original, cantidad_base, factor_conversion, precio_unitario, cantidad_albaran
    from albaran_lineas
    where albaran_id = p_albaran_id
  loop
    select coalesce(sum(cantidad), 0) into v_stock_actual
    from movimientos where articulo_id = v_linea.articulo_id;

    insert into movimientos (tipo, articulo_id, ubicacion_id, cantidad, ref_tabla, ref_id, usuario_id)
    values ('compra', v_linea.articulo_id, v_albaran.ubicacion_id, v_linea.cantidad_base, 'albaranes', v_albaran.id, auth.uid());

    if v_linea.precio_unitario is not null then
      select coste_medio into v_coste_actual from articulos where id = v_linea.articulo_id;
      v_coste_actual := coalesce(v_coste_actual, 0);
      v_stock_previo := greatest(v_stock_actual, 0);
      v_valor_linea := v_linea.precio_unitario * v_linea.cantidad_albaran;
      v_nuevo_coste := (v_stock_previo * v_coste_actual + v_valor_linea) / (v_stock_previo + v_linea.cantidad_base);
      update articulos set coste_medio = v_nuevo_coste where id = v_linea.articulo_id;
    end if;

    if v_albaran.proveedor_id is not null and v_linea.texto_original is not null then
      select id into v_alias_id from alias_proveedor
        where proveedor_id = v_albaran.proveedor_id and texto_albaran = v_linea.texto_original;
      if v_alias_id is null then
        insert into alias_proveedor (proveedor_id, texto_albaran, articulo_id, factor_conversion)
        values (v_albaran.proveedor_id, v_linea.texto_original, v_linea.articulo_id, coalesce(v_linea.factor_conversion, 1));
      end if;
    end if;
  end loop;

  update albaranes set estado = 'confirmado' where id = p_albaran_id;
end;
$$;

create or replace function cerrar_inventario(p_inventario_id uuid, p_lineas jsonb)
returns void
language plpgsql
as $$
declare
  v_inventario inventarios%rowtype;
  v_item jsonb;
  v_articulo_id uuid;
  v_cantidad_contada numeric;
  v_teorica numeric;
  v_diferencia numeric;
begin
  select * into v_inventario from inventarios where id = p_inventario_id for update;
  if not found then
    raise exception 'Inventario no encontrado';
  end if;
  if v_inventario.cerrado then
    raise exception 'Este inventario ya está cerrado';
  end if;
  if jsonb_array_length(p_lineas) = 0 then
    raise exception 'Cuenta al menos un artículo antes de cerrar el inventario';
  end if;

  for v_item in select * from jsonb_array_elements(p_lineas)
  loop
    v_articulo_id := (v_item->>'articulo_id')::uuid;
    v_cantidad_contada := (v_item->>'cantidad_contada')::numeric;

    insert into inventario_lineas (inventario_id, articulo_id, cantidad_contada)
    values (p_inventario_id, v_articulo_id, v_cantidad_contada)
    on conflict (inventario_id, articulo_id)
    do update set cantidad_contada = excluded.cantidad_contada;

    select coalesce(sum(stock), 0) into v_teorica
    from stock_actual
    where articulo_id = v_articulo_id and ubicacion_id = v_inventario.ubicacion_id;

    update inventario_lineas set cantidad_teorica = v_teorica
    where inventario_id = p_inventario_id and articulo_id = v_articulo_id;

    v_diferencia := v_cantidad_contada - v_teorica;
    if v_diferencia <> 0 then
      insert into movimientos (tipo, articulo_id, ubicacion_id, cantidad, ref_tabla, ref_id, usuario_id)
      values ('ajuste', v_articulo_id, v_inventario.ubicacion_id, v_diferencia, 'inventarios', p_inventario_id, auth.uid());
    end if;
  end loop;

  update inventarios set cerrado = true where id = p_inventario_id;
end;
$$;

create or replace function confirmar_ventas()
returns integer
language plpgsql
as $$
declare
  v_count integer;
begin
  if exists (select 1 from ventas_import where procesado = false and articulo_id is null) then
    raise exception 'Todavía hay ventas sin artículo asignado';
  end if;

  insert into movimientos (tipo, articulo_id, ubicacion_id, cantidad, ref_tabla, ref_id, usuario_id)
  select 'venta', articulo_id, ubicacion_id, -unidades, 'ventas_import', id, auth.uid()
  from ventas_import
  where procesado = false;

  get diagnostics v_count = row_count;

  update ventas_import set procesado = true where procesado = false;

  return v_count;
end;
$$;

create or replace function registrar_formado(p_ubicacion_id uuid, p_lineas jsonb)
returns void
language plpgsql
as $$
declare
  v_linea jsonb;
  v_escandallo_id uuid;
  v_unidades numeric;
  v_producto_id uuid;
  v_rendimiento numeric;
  v_lotes numeric;
  v_parte_id uuid;
  v_ing record;
begin
  if not exists (
    select 1 from jsonb_array_elements(p_lineas) e
    where (e->>'escandallo_id') is not null and (e->>'unidades')::numeric > 0
  ) then
    raise exception 'Añade al menos un sabor con unidades';
  end if;

  for v_linea in select * from jsonb_array_elements(p_lineas)
  loop
    v_escandallo_id := (v_linea->>'escandallo_id')::uuid;
    v_unidades := (v_linea->>'unidades')::numeric;
    if v_escandallo_id is null or v_unidades is null or v_unidades <= 0 then
      continue;
    end if;

    select producto_id, rendimiento into v_producto_id, v_rendimiento
    from escandallos where id = v_escandallo_id;
    if not found then
      raise exception 'Escandallo no encontrado';
    end if;

    v_lotes := v_unidades / v_rendimiento;

    insert into partes_produccion (escandallo_id, ubicacion_id, lotes, usuario_id)
    values (v_escandallo_id, p_ubicacion_id, v_lotes, auth.uid())
    returning id into v_parte_id;

    for v_ing in
      select ingrediente_id, cantidad_por_lote from escandallo_lineas where escandallo_id = v_escandallo_id
    loop
      insert into movimientos (tipo, articulo_id, ubicacion_id, cantidad, ref_tabla, ref_id, usuario_id)
      values ('produccion_consumo', v_ing.ingrediente_id, p_ubicacion_id, -(v_ing.cantidad_por_lote * v_lotes), 'partes_produccion', v_parte_id, auth.uid());
    end loop;

    insert into movimientos (tipo, articulo_id, ubicacion_id, cantidad, ref_tabla, ref_id, usuario_id)
    values ('produccion_alta', v_producto_id, p_ubicacion_id, v_unidades, 'partes_produccion', v_parte_id, auth.uid());
  end loop;
end;
$$;

create or replace function registrar_cierre_mermas(p_ubicacion_id uuid, p_lineas jsonb)
returns void
language plpgsql
as $$
declare
  v_linea jsonb;
  v_parte_horneado_id uuid;
  v_articulo_id uuid;
  v_cantidad numeric;
  v_merma_id uuid;
begin
  if jsonb_array_length(p_lineas) = 0 then
    raise exception 'No hay lotes de ayer pendientes de cerrar';
  end if;

  for v_linea in select * from jsonb_array_elements(p_lineas)
  loop
    v_parte_horneado_id := (v_linea->>'parte_horneado_id')::uuid;
    v_articulo_id := (v_linea->>'articulo_id')::uuid;
    v_cantidad := (v_linea->>'cantidad_tirada')::numeric;

    if v_cantidad > 0 then
      insert into mermas (articulo_id, ubicacion_id, cantidad, motivo, notas, parte_horneado_id, usuario_id)
      values (v_articulo_id, p_ubicacion_id, v_cantidad, 'caducado', 'Cierre: sobrante de lo horneado el día anterior', v_parte_horneado_id, auth.uid())
      returning id into v_merma_id;

      insert into movimientos (tipo, articulo_id, ubicacion_id, cantidad, ref_tabla, ref_id, usuario_id)
      values ('merma', v_articulo_id, p_ubicacion_id, -v_cantidad, 'mermas', v_merma_id, auth.uid());
    end if;

    update partes_horneado set resuelto = true where id = v_parte_horneado_id;
  end loop;
end;
$$;

-- Horneado con traspaso automático de congelado: el producto formado (y
-- congelado) vive en la ubicación de origen (Obrador); al hornearlo en otra
-- ubicación (Candela Gràcia), se traspasa esa cantidad de origen a destino
-- en el mismo movimiento, sin paso manual de "Transferencias".

create or replace function registrar_horneado(
  p_ubicacion_destino_id uuid,
  p_ubicacion_origen_id uuid,
  p_lineas jsonb
)
returns void
language plpgsql
as $$
declare
  v_linea jsonb;
  v_articulo_id uuid;
  v_cantidad numeric;
  v_parte_id uuid;
begin
  if not exists (
    select 1 from jsonb_array_elements(p_lineas) e
    where (e->>'articulo_id') is not null and (e->>'cantidad')::numeric > 0
  ) then
    raise exception 'Marca al menos un sabor con unidades horneadas';
  end if;

  for v_linea in select * from jsonb_array_elements(p_lineas)
  loop
    v_articulo_id := (v_linea->>'articulo_id')::uuid;
    v_cantidad := (v_linea->>'cantidad')::numeric;
    if v_articulo_id is null or v_cantidad is null or v_cantidad <= 0 then
      continue;
    end if;

    insert into partes_horneado (articulo_id, ubicacion_id, cantidad, usuario_id)
    values (v_articulo_id, p_ubicacion_destino_id, v_cantidad, auth.uid())
    returning id into v_parte_id;

    if p_ubicacion_origen_id is not null and p_ubicacion_origen_id <> p_ubicacion_destino_id then
      insert into movimientos (tipo, articulo_id, ubicacion_id, cantidad, ref_tabla, ref_id, usuario_id)
      values
        ('transferencia_salida', v_articulo_id, p_ubicacion_origen_id, -v_cantidad, 'partes_horneado', v_parte_id, auth.uid()),
        ('transferencia_entrada', v_articulo_id, p_ubicacion_destino_id, v_cantidad, 'partes_horneado', v_parte_id, auth.uid());
    end if;
  end loop;
end;
$$;

create or replace function actualizar_horneado(
  p_id uuid,
  p_nueva_cantidad numeric,
  p_ubicacion_origen_id uuid
)
returns void
language plpgsql
as $$
declare
  v_articulo_id uuid;
  v_ubicacion_destino_id uuid;
  v_cantidad_actual numeric;
  v_delta numeric;
begin
  select articulo_id, ubicacion_id, cantidad into v_articulo_id, v_ubicacion_destino_id, v_cantidad_actual
  from partes_horneado where id = p_id and resuelto = false;
  if not found then
    raise exception 'Registro no encontrado o ya cerrado';
  end if;

  v_delta := p_nueva_cantidad - v_cantidad_actual;

  if v_delta <> 0 and p_ubicacion_origen_id is not null and p_ubicacion_origen_id <> v_ubicacion_destino_id then
    insert into movimientos (tipo, articulo_id, ubicacion_id, cantidad, ref_tabla, ref_id, usuario_id)
    values
      ('transferencia_salida', v_articulo_id, p_ubicacion_origen_id, -v_delta, 'partes_horneado', p_id, auth.uid()),
      ('transferencia_entrada', v_articulo_id, v_ubicacion_destino_id, v_delta, 'partes_horneado', p_id, auth.uid());
  end if;

  update partes_horneado set cantidad = p_nueva_cantidad where id = p_id and resuelto = false;
end;
$$;

create or replace function eliminar_horneado(
  p_id uuid,
  p_ubicacion_origen_id uuid
)
returns void
language plpgsql
as $$
declare
  v_articulo_id uuid;
  v_ubicacion_destino_id uuid;
  v_cantidad numeric;
begin
  select articulo_id, ubicacion_id, cantidad into v_articulo_id, v_ubicacion_destino_id, v_cantidad
  from partes_horneado where id = p_id and resuelto = false;
  if not found then
    raise exception 'Registro no encontrado o ya cerrado';
  end if;

  if p_ubicacion_origen_id is not null and p_ubicacion_origen_id <> v_ubicacion_destino_id then
    insert into movimientos (tipo, articulo_id, ubicacion_id, cantidad, ref_tabla, ref_id, usuario_id)
    values
      ('transferencia_entrada', v_articulo_id, p_ubicacion_origen_id, v_cantidad, 'partes_horneado', p_id, auth.uid()),
      ('transferencia_salida', v_articulo_id, v_ubicacion_destino_id, -v_cantidad, 'partes_horneado', p_id, auth.uid());
  end if;

  delete from partes_horneado where id = p_id and resuelto = false;
end;
$$;

revoke execute on function confirmar_albaran(uuid) from public;
revoke execute on function cerrar_inventario(uuid, jsonb) from public;
revoke execute on function confirmar_ventas() from public;
revoke execute on function registrar_formado(uuid, jsonb) from public;
revoke execute on function registrar_cierre_mermas(uuid, jsonb) from public;
revoke execute on function registrar_horneado(uuid, uuid, jsonb) from public;
revoke execute on function actualizar_horneado(uuid, numeric, uuid) from public;
revoke execute on function eliminar_horneado(uuid, uuid) from public;

grant execute on function confirmar_albaran(uuid) to authenticated;
grant execute on function cerrar_inventario(uuid, jsonb) to authenticated;
grant execute on function confirmar_ventas() to authenticated;
grant execute on function registrar_formado(uuid, jsonb) to authenticated;
grant execute on function registrar_cierre_mermas(uuid, jsonb) to authenticated;
grant execute on function registrar_horneado(uuid, uuid, jsonb) to authenticated;
grant execute on function actualizar_horneado(uuid, numeric, uuid) to authenticated;
grant execute on function eliminar_horneado(uuid, uuid) to authenticated;
