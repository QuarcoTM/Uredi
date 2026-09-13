begin;

create or replace function public.add_listing_image_metadata(
  p_listing_id uuid,
  p_storage_bucket text,
  p_storage_path text,
  p_position integer default 0,
  p_is_primary boolean default false,
  p_image_type text default 'gallery',
  p_mime_type text default null,
  p_file_size bigint default 0
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_cols text[] := array['listing_id'];
  v_vals text[] := array[format('%L::uuid', p_listing_id)];
  v_missing text;
  v_sql text;
  v_type text;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.listings
    where id = p_listing_id
      and seller_id = v_user
  ) then
    raise exception 'You can add images only to your own listing';
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listing_images' and column_name='storage_bucket') then
    v_cols := array_append(v_cols, 'storage_bucket');
    v_vals := array_append(v_vals, format('%L::text', coalesce(p_storage_bucket,'listing-images')));
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listing_images' and column_name='storage_path') then
    v_cols := array_append(v_cols, 'storage_path');
    v_vals := array_append(v_vals, format('%L::text', p_storage_path));
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listing_images' and column_name='sort_order') then
    v_cols := array_append(v_cols, 'sort_order');
    v_vals := array_append(v_vals, format('%s::integer', coalesce(p_position,0)));
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listing_images' and column_name='position') then
    v_cols := array_append(v_cols, 'position');
    v_vals := array_append(v_vals, format('%s::integer', coalesce(p_position,0)));
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listing_images' and column_name='is_primary') then
    v_cols := array_append(v_cols, 'is_primary');
    v_vals := array_append(v_vals, format('%L::boolean', coalesce(p_is_primary,false)));
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listing_images' and column_name='is_cover') then
    v_cols := array_append(v_cols, 'is_cover');
    v_vals := array_append(v_vals, format('%L::boolean', coalesce(p_is_primary,false)));
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listing_images' and column_name='uploader_id') then
    v_cols := array_append(v_cols, 'uploader_id');
    v_vals := array_append(v_vals, format('%L::uuid', v_user));
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listing_images' and column_name='user_id') then
    v_cols := array_append(v_cols, 'user_id');
    v_vals := array_append(v_vals, format('%L::uuid', v_user));
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listing_images' and column_name='owner_id') then
    v_cols := array_append(v_cols, 'owner_id');
    v_vals := array_append(v_vals, format('%L::uuid', v_user));
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listing_images' and column_name='created_by') then
    v_cols := array_append(v_cols, 'created_by');
    v_vals := array_append(v_vals, format('%L::uuid', v_user));
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listing_images' and column_name='image_type') then
    v_cols := array_append(v_cols, 'image_type');
    v_vals := array_append(v_vals, format('%L::text', coalesce(p_image_type,'gallery')));
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listing_images' and column_name='kind') then
    v_cols := array_append(v_cols, 'kind');
    v_vals := array_append(v_vals, format('%L::text', coalesce(p_image_type,'gallery')));
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listing_images' and column_name='mime_type') then
    v_cols := array_append(v_cols, 'mime_type');
    v_vals := array_append(v_vals, format('%L::text', p_mime_type));
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listing_images' and column_name='file_size') then
    select format_type(a.atttypid,a.atttypmod)
      into v_type
    from pg_attribute a
    join pg_class c on c.oid=a.attrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relname='listing_images'
      and a.attname='file_size'
      and a.attnum>0
      and not a.attisdropped;

    v_cols := array_append(v_cols, 'file_size');
    v_vals := array_append(v_vals, format('%s::%s', coalesce(p_file_size,0), v_type));
  end if;

  select string_agg(column_name, ', ' order by ordinal_position)
    into v_missing
  from information_schema.columns
  where table_schema='public'
    and table_name='listing_images'
    and is_nullable='NO'
    and column_default is null
    and is_identity='NO'
    and is_generated='NEVER'
    and column_name <> all(array[
      'listing_id','storage_bucket','storage_path','sort_order','position','is_primary','is_cover',
      'uploader_id','user_id','owner_id','created_by','image_type','kind','mime_type','file_size'
    ]);

  if v_missing is not null then
    raise exception 'listing_images has unsupported required columns: %', v_missing;
  end if;

  v_sql := format(
    'insert into public.listing_images (%s) values (%s) returning id',
    array_to_string(v_cols, ', '),
    array_to_string(v_vals, ', ')
  );

  execute v_sql into v_id;
  return v_id;
end;
$$;

revoke all on function public.add_listing_image_metadata(uuid,text,text,integer,boolean,text,text,bigint) from public;
grant execute on function public.add_listing_image_metadata(uuid,text,text,integer,boolean,text,text,bigint) to authenticated;

commit;

notify pgrst, 'reload schema';
