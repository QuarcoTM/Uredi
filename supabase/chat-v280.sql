-- Uredi v2.80 — real chat, attachments, blocking, deals, reviews and realtime
-- Run once in Supabase > SQL Editor. Safe to re-run.

begin;

create extension if not exists pgcrypto;

create table if not exists public.market_conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  listing_title text,
  listing_price numeric,
  listing_city text,
  listing_image_path text,
  last_message_id uuid,
  last_message_preview text,
  last_message_sender_id uuid references public.profiles(id) on delete set null,
  last_message_at timestamptz not null default now(),
  seller_unread integer not null default 0 check (seller_unread >= 0),
  buyer_unread integer not null default 0 check (buyer_unread >= 0),
  seller_archived boolean not null default false,
  buyer_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_conversations_distinct_users check (seller_id <> buyer_id),
  constraint market_conversations_listing_buyer_uq unique (listing_id, buyer_id)
);

create table if not exists public.market_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.market_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  has_attachment boolean not null default false,
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  constraint market_messages_body_len check (body is null or char_length(body) <= 2000),
  constraint market_messages_content_check check (
    (body is not null and char_length(trim(body)) > 0) or has_attachment
  )
);


create table if not exists public.market_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.market_messages(id) on delete cascade,
  conversation_id uuid not null references public.market_conversations(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  storage_bucket text not null default 'chat-attachments',
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint not null default 0 check (file_size >= 0 and file_size <= 15728640),
  created_at timestamptz not null default now(),
  constraint market_message_attachments_path_uq unique (storage_bucket, storage_path)
);

create table if not exists public.market_user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint market_user_blocks_distinct check (blocker_id <> blocked_id)
);

create table if not exists public.market_deals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  conversation_id uuid not null references public.market_conversations(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint market_deals_listing_uq unique (listing_id),
  constraint market_deals_conversation_uq unique (conversation_id),
  constraint market_deals_distinct_users check (seller_id <> buyer_id)
);

create table if not exists public.market_reviews (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.market_deals(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewed_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  constraint market_reviews_comment_len check (comment is null or char_length(comment) <= 1000),
  constraint market_reviews_deal_reviewer_uq unique (deal_id, reviewer_id),
  constraint market_reviews_distinct_users check (reviewer_id <> reviewed_id)
);

create index if not exists market_conversations_seller_last_idx
  on public.market_conversations (seller_id, last_message_at desc);
create index if not exists market_conversations_buyer_last_idx
  on public.market_conversations (buyer_id, last_message_at desc);
create index if not exists market_messages_conversation_created_idx
  on public.market_messages (conversation_id, created_at, id);
create index if not exists market_messages_unseen_idx
  on public.market_messages (conversation_id, seen_at)
  where seen_at is null;
create index if not exists market_attachments_message_idx
  on public.market_message_attachments (message_id, created_at);
create index if not exists market_deals_buyer_idx
  on public.market_deals (buyer_id, completed_at desc);
create index if not exists market_reviews_reviewed_idx
  on public.market_reviews (reviewed_id, created_at desc);

alter table public.market_conversations enable row level security;
alter table public.market_messages enable row level security;
alter table public.market_message_attachments enable row level security;
alter table public.market_user_blocks enable row level security;
alter table public.market_deals enable row level security;
alter table public.market_reviews enable row level security;

revoke all on public.market_conversations from anon;
revoke all on public.market_messages from anon;
revoke all on public.market_message_attachments from anon;
revoke all on public.market_user_blocks from anon;
revoke all on public.market_deals from anon;
revoke all on public.market_reviews from anon;

revoke insert, update, delete on public.market_conversations from authenticated;
revoke insert, update, delete on public.market_messages from authenticated;
revoke insert, update, delete on public.market_message_attachments from authenticated;
revoke insert, update, delete on public.market_user_blocks from authenticated;
revoke insert, update, delete on public.market_deals from authenticated;
revoke insert, update, delete on public.market_reviews from authenticated;

grant select on public.market_conversations to authenticated;
grant select on public.market_messages to authenticated;
grant select on public.market_message_attachments to authenticated;
grant select on public.market_deals to authenticated;
grant select on public.market_reviews to anon, authenticated;

drop policy if exists "market conversations participants read" on public.market_conversations;
create policy "market conversations participants read"
on public.market_conversations for select to authenticated
using (auth.uid() = seller_id or auth.uid() = buyer_id);

drop policy if exists "market messages participants read" on public.market_messages;
create policy "market messages participants read"
on public.market_messages for select to authenticated
using (
  exists (
    select 1 from public.market_conversations c
    where c.id = market_messages.conversation_id
      and (c.seller_id = auth.uid() or c.buyer_id = auth.uid())
  )
);

drop policy if exists "market attachments participants read" on public.market_message_attachments;
create policy "market attachments participants read"
on public.market_message_attachments for select to authenticated
using (
  exists (
    select 1 from public.market_conversations c
    where c.id = market_message_attachments.conversation_id
      and (c.seller_id = auth.uid() or c.buyer_id = auth.uid())
  )
);

drop policy if exists "market deals participants read" on public.market_deals;
create policy "market deals participants read"
on public.market_deals for select to authenticated
using (auth.uid() = seller_id or auth.uid() = buyer_id);

drop policy if exists "market reviews public read" on public.market_reviews;
create policy "market reviews public read"
on public.market_reviews for select to anon, authenticated
using (true);

-- The confirmed buyer keeps read access to the sold listing after completion.
drop policy if exists "v280 completed buyer listing read" on public.listings;
create policy "v280 completed buyer listing read"
on public.listings for select to authenticated
using (
  exists (
    select 1 from public.market_deals d
    where d.listing_id = listings.id and d.buyer_id = auth.uid()
  )
);

-- Create/open a real conversation from a listing page.
create or replace function public.market_get_or_create_conversation(p_listing_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_seller uuid;
  v_status text;
  v_title text;
  v_price numeric;
  v_city text;
  v_image_path text;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select l.seller_id,
         l.status::text,
         l.title,
         l.price,
         l.city,
         case
           when jsonb_typeof(coalesce(to_jsonb(l.specs), '{}'::jsonb)->'__image_paths') = 'array'
           then coalesce(to_jsonb(l.specs)->'__image_paths'->>0, '')
           else ''
         end
  into v_seller, v_status, v_title, v_price, v_city, v_image_path
  from public.listings l
  where l.id = p_listing_id;

  if v_seller is null then
    raise exception 'LISTING_NOT_FOUND';
  end if;
  if v_seller = v_user then
    raise exception 'CANNOT_MESSAGE_YOURSELF';
  end if;

  select c.id into v_id
  from public.market_conversations c
  where c.listing_id = p_listing_id and c.buyer_id = v_user
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  if v_status not in ('active','reserved') then
    raise exception 'LISTING_NOT_AVAILABLE';
  end if;

  insert into public.market_conversations(
    listing_id, seller_id, buyer_id,
    listing_title, listing_price, listing_city, listing_image_path,
    last_message_at
  ) values (
    p_listing_id, v_seller, v_user,
    v_title, v_price, v_city, nullif(v_image_path,''),
    now()
  )
  on conflict (listing_id, buyer_id) do update
  set updated_at = now(),
      listing_title = excluded.listing_title,
      listing_price = excluded.listing_price,
      listing_city = excluded.listing_city,
      listing_image_path = coalesce(excluded.listing_image_path, market_conversations.listing_image_path)
  returning id into v_id;

  return v_id;
end;
$$;

-- Send a message. Blocking is enforced server-side, not only in the UI.
create or replace function public.market_send_message(
  p_conversation_id uuid,
  p_body text default null,
  p_has_attachment boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_seller uuid;
  v_buyer uuid;
  v_other uuid;
  v_body text;
  v_id uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  select seller_id, buyer_id into v_seller, v_buyer
  from public.market_conversations
  where id = p_conversation_id;

  if v_seller is null or (v_user <> v_seller and v_user <> v_buyer) then
    raise exception 'CHAT_FORBIDDEN';
  end if;

  v_other := case when v_user = v_seller then v_buyer else v_seller end;

  if exists (
    select 1 from public.market_user_blocks b
    where (b.blocker_id = v_user and b.blocked_id = v_other)
       or (b.blocker_id = v_other and b.blocked_id = v_user)
  ) then
    raise exception 'CHAT_BLOCKED';
  end if;

  v_body := nullif(trim(coalesce(p_body,'')), '');
  if v_body is not null and char_length(v_body) > 2000 then
    raise exception 'MESSAGE_TOO_LONG';
  end if;
  if v_body is null and not coalesce(p_has_attachment,false) then
    raise exception 'EMPTY_MESSAGE';
  end if;

  insert into public.market_messages(conversation_id, sender_id, body, has_attachment)
  values (p_conversation_id, v_user, v_body, coalesce(p_has_attachment,false))
  returning id into v_id;

  update public.market_conversations c
  set last_message_id = v_id,
      last_message_preview = case when v_body is not null then left(v_body,120) else '📎 Прикачен файл' end,
      last_message_sender_id = v_user,
      last_message_at = now(),
      updated_at = now(),
      seller_archived = false,
      buyer_archived = false,
      seller_unread = case when v_user = v_buyer then c.seller_unread + 1 else c.seller_unread end,
      buyer_unread  = case when v_user = v_seller then c.buyer_unread + 1 else c.buyer_unread end
  where c.id = p_conversation_id;

  return v_id;
end;
$$;

create or replace function public.market_add_message_attachment(
  p_message_id uuid,
  p_storage_path text,
  p_file_name text,
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
  v_conversation uuid;
  v_sender uuid;
  v_id uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_file_size < 0 or p_file_size > 15728640 then raise exception 'FILE_TOO_LARGE'; end if;

  select conversation_id, sender_id into v_conversation, v_sender
  from public.market_messages
  where id = p_message_id;

  if v_conversation is null or v_sender <> v_user then
    raise exception 'ATTACHMENT_FORBIDDEN';
  end if;

  if not exists (
    select 1 from public.market_conversations c
    where c.id = v_conversation and (c.seller_id = v_user or c.buyer_id = v_user)
  ) then
    raise exception 'ATTACHMENT_FORBIDDEN';
  end if;
  if p_storage_path is null
     or p_storage_path not like v_conversation::text || '/' || v_user::text || '/%' then
    raise exception 'INVALID_ATTACHMENT_PATH';
  end if;

  insert into public.market_message_attachments(
    message_id, conversation_id, uploader_id,
    storage_bucket, storage_path, file_name, mime_type, file_size
  ) values (
    p_message_id, v_conversation, v_user,
    'chat-attachments', p_storage_path, left(coalesce(nullif(p_file_name,''),'Файл'),255),
    nullif(p_mime_type,''), coalesce(p_file_size,0)
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.market_mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_seller uuid;
  v_buyer uuid;
begin
  if v_user is null then return; end if;
  select seller_id, buyer_id into v_seller, v_buyer
  from public.market_conversations where id = p_conversation_id;
  if v_seller is null then raise exception 'CHAT_NOT_FOUND'; end if;
  if v_user <> v_seller and v_user <> v_buyer then raise exception 'CHAT_FORBIDDEN'; end if;

  update public.market_messages
  set seen_at = coalesce(seen_at, now())
  where conversation_id = p_conversation_id
    and sender_id <> v_user
    and seen_at is null;

  update public.market_conversations c
  set seller_unread = case when v_user = v_seller then 0 else c.seller_unread end,
      buyer_unread = case when v_user = v_buyer then 0 else c.buyer_unread end,
      updated_at = now()
  where c.id = p_conversation_id;
end;
$$;

create or replace function public.market_set_conversation_archived(
  p_conversation_id uuid,
  p_archived boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_seller uuid;
  v_buyer uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select seller_id, buyer_id into v_seller, v_buyer
  from public.market_conversations where id = p_conversation_id;
  if v_seller is null then raise exception 'CHAT_NOT_FOUND'; end if;
  if v_user <> v_seller and v_user <> v_buyer then raise exception 'CHAT_FORBIDDEN'; end if;

  update public.market_conversations c
  set seller_archived = case when v_user = v_seller then coalesce(p_archived,false) else c.seller_archived end,
      buyer_archived = case when v_user = v_buyer then coalesce(p_archived,false) else c.buyer_archived end,
      updated_at = now()
  where c.id = p_conversation_id;
end;
$$;

create or replace function public.market_set_user_block(
  p_user_id uuid,
  p_blocked boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_user_id is null or p_user_id = v_user then raise exception 'INVALID_BLOCK_TARGET'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then raise exception 'USER_NOT_FOUND'; end if;

  if coalesce(p_blocked,false) then
    insert into public.market_user_blocks(blocker_id, blocked_id)
    values (v_user, p_user_id)
    on conflict (blocker_id, blocked_id) do nothing;
  else
    delete from public.market_user_blocks
    where blocker_id = v_user and blocked_id = p_user_id;
  end if;
end;
$$;

create or replace function public.market_conversation_flags(p_conversation_id uuid)
returns table(
  user_role text,
  other_user_id uuid,
  my_archived boolean,
  blocked_by_me boolean,
  blocked_me boolean,
  deal_id uuid,
  deal_buyer_id uuid,
  review_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_seller uuid;
  v_buyer uuid;
  v_other uuid;
  v_role text;
  v_archived boolean;
  v_deal uuid;
  v_deal_buyer uuid;
  v_review uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select c.seller_id, c.buyer_id,
         case when v_user = c.seller_id then c.seller_archived else c.buyer_archived end
  into v_seller, v_buyer, v_archived
  from public.market_conversations c
  where c.id = p_conversation_id;

  if v_seller is null then raise exception 'CHAT_NOT_FOUND'; end if;
  if v_user <> v_seller and v_user <> v_buyer then raise exception 'CHAT_FORBIDDEN'; end if;
  v_role := case when v_user = v_seller then 'seller' else 'buyer' end;
  v_other := case when v_user = v_seller then v_buyer else v_seller end;

  select d.id, d.buyer_id into v_deal, v_deal_buyer
  from public.market_deals d
  where d.listing_id = (select listing_id from public.market_conversations where id=p_conversation_id)
    and (v_user = v_seller or d.buyer_id = v_user)
  order by d.completed_at desc
  limit 1;

  if v_deal is not null then
    select r.id into v_review
    from public.market_reviews r
    where r.deal_id = v_deal and r.reviewer_id = v_user
    limit 1;
  end if;

  return query select
    v_role,
    v_other,
    coalesce(v_archived,false),
    exists(select 1 from public.market_user_blocks b where b.blocker_id=v_user and b.blocked_id=v_other),
    exists(select 1 from public.market_user_blocks b where b.blocker_id=v_other and b.blocked_id=v_user),
    v_deal,
    v_deal_buyer,
    v_review;
end;
$$;

create or replace function public.market_complete_deal(
  p_listing_id uuid,
  p_buyer_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_seller uuid;
  v_conversation uuid;
  v_existing uuid;
  v_existing_buyer uuid;
  v_id uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select seller_id into v_seller from public.listings where id=p_listing_id;
  if v_seller is null then raise exception 'LISTING_NOT_FOUND'; end if;
  if v_seller <> v_user then raise exception 'ONLY_SELLER_CAN_COMPLETE'; end if;
  if p_buyer_id is null or p_buyer_id = v_user then raise exception 'INVALID_BUYER'; end if;

  select id into v_conversation
  from public.market_conversations
  where listing_id=p_listing_id and seller_id=v_user and buyer_id=p_buyer_id
  limit 1;
  if v_conversation is null then raise exception 'BUYER_HAS_NO_CONVERSATION'; end if;

  select id,buyer_id into v_existing,v_existing_buyer
  from public.market_deals where listing_id=p_listing_id limit 1;
  if v_existing is not null then
    if v_existing_buyer = p_buyer_id then return v_existing; end if;
    raise exception 'DEAL_ALREADY_COMPLETED';
  end if;

  insert into public.market_deals(listing_id,conversation_id,seller_id,buyer_id)
  values(p_listing_id,v_conversation,v_user,p_buyer_id)
  returning id into v_id;

  update public.listings
  set status='sold', updated_at=now()
  where id=p_listing_id and seller_id=v_user;

  return v_id;
end;
$$;

create or replace function public.market_submit_review(
  p_deal_id uuid,
  p_rating smallint,
  p_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_seller uuid;
  v_buyer uuid;
  v_comment text;
  v_id uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'INVALID_RATING'; end if;

  select seller_id,buyer_id into v_seller,v_buyer
  from public.market_deals where id=p_deal_id;
  if v_buyer is null then raise exception 'DEAL_NOT_FOUND'; end if;
  if v_user <> v_buyer then raise exception 'ONLY_BUYER_CAN_REVIEW'; end if;

  v_comment := nullif(trim(coalesce(p_comment,'')),'');
  if v_comment is not null and char_length(v_comment)>1000 then raise exception 'REVIEW_TOO_LONG'; end if;

  insert into public.market_reviews(deal_id,reviewer_id,reviewed_id,rating,comment)
  values(p_deal_id,v_user,v_seller,p_rating,v_comment)
  on conflict (deal_id,reviewer_id) do update
  set rating=excluded.rating, comment=excluded.comment
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.market_unread_message_count()
returns bigint
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select coalesce(sum(
    case
      when c.seller_id = auth.uid() then c.seller_unread
      when c.buyer_id = auth.uid() then c.buyer_unread
      else 0
    end
  ),0)::bigint
  from public.market_conversations c
  where c.seller_id=auth.uid() or c.buyer_id=auth.uid();
$$;

revoke all on function public.market_get_or_create_conversation(uuid) from public;
revoke all on function public.market_send_message(uuid,text,boolean) from public;
revoke all on function public.market_add_message_attachment(uuid,text,text,text,bigint) from public;
revoke all on function public.market_mark_conversation_read(uuid) from public;
revoke all on function public.market_set_conversation_archived(uuid,boolean) from public;
revoke all on function public.market_set_user_block(uuid,boolean) from public;
revoke all on function public.market_conversation_flags(uuid) from public;
revoke all on function public.market_complete_deal(uuid,uuid) from public;
revoke all on function public.market_submit_review(uuid,smallint,text) from public;
revoke all on function public.market_unread_message_count() from public;

grant execute on function public.market_get_or_create_conversation(uuid) to authenticated;
grant execute on function public.market_send_message(uuid,text,boolean) to authenticated;
grant execute on function public.market_add_message_attachment(uuid,text,text,text,bigint) to authenticated;
grant execute on function public.market_mark_conversation_read(uuid) to authenticated;
grant execute on function public.market_set_conversation_archived(uuid,boolean) to authenticated;
grant execute on function public.market_set_user_block(uuid,boolean) to authenticated;
grant execute on function public.market_conversation_flags(uuid) to authenticated;
grant execute on function public.market_complete_deal(uuid,uuid) to authenticated;
grant execute on function public.market_submit_review(uuid,smallint,text) to authenticated;
grant execute on function public.market_unread_message_count() to authenticated;

-- Private chat attachments bucket. Existing bucket settings are normalized.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'chat-attachments','chat-attachments',false,15728640,
  array[
    'image/jpeg','image/png','image/webp','image/heic','image/heif',
    'application/pdf','text/plain','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set public=false,
    file_size_limit=15728640,
    allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "market chat attachments read participant" on storage.objects;
create policy "market chat attachments read participant"
on storage.objects for select to authenticated
using (
  bucket_id='chat-attachments'
  and exists (
    select 1 from public.market_conversations c
    where c.id::text=(storage.foldername(name))[1]
      and (c.seller_id=auth.uid() or c.buyer_id=auth.uid())
  )
);

drop policy if exists "market chat attachments upload participant" on storage.objects;
create policy "market chat attachments upload participant"
on storage.objects for insert to authenticated
with check (
  bucket_id='chat-attachments'
  and (storage.foldername(name))[2]=auth.uid()::text
  and exists (
    select 1 from public.market_conversations c
    where c.id::text=(storage.foldername(name))[1]
      and (c.seller_id=auth.uid() or c.buyer_id=auth.uid())
  )
);

drop policy if exists "market chat attachments delete uploader" on storage.objects;
create policy "market chat attachments delete uploader"
on storage.objects for delete to authenticated
using (
  bucket_id='chat-attachments'
  and (storage.foldername(name))[2]=auth.uid()::text
  and exists (
    select 1 from public.market_conversations c
    where c.id::text=(storage.foldername(name))[1]
      and (c.seller_id=auth.uid() or c.buyer_id=auth.uid())
  )
);

alter table public.market_messages replica identity full;
alter table public.market_conversations replica identity full;
alter table public.market_message_attachments replica identity full;
alter table public.market_deals replica identity full;

-- Realtime: add only when not already in the publication.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='market_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.market_messages';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='market_conversations'
  ) then
    execute 'alter publication supabase_realtime add table public.market_conversations';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='market_message_attachments'
  ) then
    execute 'alter publication supabase_realtime add table public.market_message_attachments';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='market_deals'
  ) then
    execute 'alter publication supabase_realtime add table public.market_deals';
  end if;
end $$;

commit;

notify pgrst, 'reload schema';
