-- Bucket privado de Storage para fotos de albaranes/facturas escaneados.
insert into storage.buckets (id, name, public)
values ('albaranes', 'albaranes', false)
on conflict (id) do nothing;

create policy "equipo_sube_fotos_albaranes"
on storage.objects for insert to authenticated
with check (bucket_id = 'albaranes');

create policy "equipo_lee_fotos_albaranes"
on storage.objects for select to authenticated
using (bucket_id = 'albaranes');

create policy "equipo_borra_fotos_albaranes"
on storage.objects for delete to authenticated
using (bucket_id = 'albaranes');
