-- Uredi v2.72 — repair UNIQUE indexes required by runtime ON CONFLICT clauses.
-- Safe for the current beta database. It does not delete or rewrite rows.

begin;

do $$
begin
  if to_regclass('public.listing_images') is not null
     and exists(select 1 from information_schema.columns where table_schema='public' and table_name='listing_images' and column_name='listing_id')
     and exists(select 1 from information_schema.columns where table_schema='public' and table_name='listing_images' and column_name='position') then
    execute 'create unique index if not exists uredi_v272_listing_images_listing_position_uq on public.listing_images (listing_id, position)';
  end if;

  if to_regclass('public.listing_images') is not null
     and exists(select 1 from information_schema.columns where table_schema='public' and table_name='listing_images' and column_name='storage_bucket')
     and exists(select 1 from information_schema.columns where table_schema='public' and table_name='listing_images' and column_name='storage_path') then
    execute 'create unique index if not exists uredi_v272_listing_images_bucket_path_uq on public.listing_images (storage_bucket, storage_path)';
  end if;

  if to_regclass('public.notifications') is not null
     and exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='user_id')
     and exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='dedupe_key') then
    -- A full unique index is intentional. PostgreSQL still permits multiple NULL dedupe_key values,
    -- while ON CONFLICT(user_id, dedupe_key) can infer this index correctly.
    execute 'create unique index if not exists uredi_v272_notifications_user_dedupe_uq on public.notifications (user_id, dedupe_key)';
  end if;

  if to_regclass('public.conversations') is not null
     and exists(select 1 from information_schema.columns where table_schema='public' and table_name='conversations' and column_name='listing_id')
     and exists(select 1 from information_schema.columns where table_schema='public' and table_name='conversations' and column_name='buyer_id') then
    execute 'create unique index if not exists uredi_v272_conversations_listing_buyer_uq on public.conversations (listing_id, buyer_id)';
  end if;

  if to_regclass('public.deal_confirmations') is not null
     and exists(select 1 from information_schema.columns where table_schema='public' and table_name='deal_confirmations' and column_name='conversation_id')
     and exists(select 1 from information_schema.columns where table_schema='public' and table_name='deal_confirmations' and column_name='user_id') then
    execute 'create unique index if not exists uredi_v272_deal_confirmations_conversation_user_uq on public.deal_confirmations (conversation_id, user_id)';
  end if;

  if to_regclass('public.categories') is not null
     and exists(select 1 from information_schema.columns where table_schema='public' and table_name='categories' and column_name='slug') then
    execute 'create unique index if not exists uredi_v272_categories_slug_uq on public.categories (slug)';
  end if;
end
$$;

commit;
