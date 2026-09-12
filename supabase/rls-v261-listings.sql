-- Uredi v2.61 — real listing publish RLS patch
-- Run once in Supabase > SQL Editor as the project owner.
-- Safe to re-run: only the v261 policies are replaced.

begin;

alter table public.listings enable row level security;
alter table public.listing_images enable row level security;

-- REST table grants. RLS still decides which rows are allowed.
grant select on public.listings to anon, authenticated;
grant insert, update, delete on public.listings to authenticated;
grant select on public.listing_images to anon, authenticated;
grant insert, update, delete on public.listing_images to authenticated;

-- Listings: everyone can read active ads; an authenticated seller can also read/manage their own rows.
drop policy if exists "v261 listings select public or own" on public.listings;
create policy "v261 listings select public or own"
on public.listings
for select
to anon, authenticated
using (
  status = 'active'
  or seller_id = auth.uid()
);

drop policy if exists "v261 listings insert own" on public.listings;
create policy "v261 listings insert own"
on public.listings
for insert
to authenticated
with check (
  seller_id = auth.uid()
);

drop policy if exists "v261 listings update own" on public.listings;
create policy "v261 listings update own"
on public.listings
for update
to authenticated
using (
  seller_id = auth.uid()
)
with check (
  seller_id = auth.uid()
);

drop policy if exists "v261 listings delete own" on public.listings;
create policy "v261 listings delete own"
on public.listings
for delete
to authenticated
using (
  seller_id = auth.uid()
);

-- Image metadata: public only for an active ad; owner can manage metadata while the ad is draft/active/etc.
drop policy if exists "v261 listing images select public or own" on public.listing_images;
create policy "v261 listing images select public or own"
on public.listing_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_images.listing_id
      and (l.status = 'active' or l.seller_id = auth.uid())
  )
);

drop policy if exists "v261 listing images insert own" on public.listing_images;
create policy "v261 listing images insert own"
on public.listing_images
for insert
to authenticated
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_images.listing_id
      and l.seller_id = auth.uid()
  )
);

drop policy if exists "v261 listing images update own" on public.listing_images;
create policy "v261 listing images update own"
on public.listing_images
for update
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_images.listing_id
      and l.seller_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_images.listing_id
      and l.seller_id = auth.uid()
  )
);

drop policy if exists "v261 listing images delete own" on public.listing_images;
create policy "v261 listing images delete own"
on public.listing_images
for delete
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_images.listing_id
      and l.seller_id = auth.uid()
  )
);

-- Storage bucket: uploads are namespaced as <auth.uid()>/<listing-id>/...
-- The bucket itself is public, so public image URLs keep working.
drop policy if exists "v261 listing images storage read" on storage.objects;
create policy "v261 listing images storage read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'listing-images');

drop policy if exists "v261 listing images storage insert own folder" on storage.objects;
create policy "v261 listing images storage insert own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "v261 listing images storage update own folder" on storage.objects;
create policy "v261 listing images storage update own folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "v261 listing images storage delete own folder" on storage.objects;
create policy "v261 listing images storage delete own folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
