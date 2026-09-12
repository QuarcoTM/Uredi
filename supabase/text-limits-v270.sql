-- v2.70 — server-side limits for new/updated user-generated data.
-- Constraints are added as NOT VALID: they immediately protect new/updated rows
-- without failing because of any older prototype data already in the database.

begin;

do $$
begin
  -- LISTINGS ---------------------------------------------------------------
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listings' and column_name='title') then
    execute 'alter table public.listings drop constraint if exists uredi_listings_title_len';
    execute 'alter table public.listings add constraint uredi_listings_title_len check (title is not null and char_length(trim(title)) >= 3 and char_length(title) <= 120) not valid';
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listings' and column_name='brand') then
    execute 'alter table public.listings drop constraint if exists uredi_listings_brand_len';
    execute 'alter table public.listings add constraint uredi_listings_brand_len check (brand is not null and char_length(trim(brand)) >= 1 and char_length(brand) <= 50) not valid';
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listings' and column_name='model') then
    execute 'alter table public.listings drop constraint if exists uredi_listings_model_len';
    execute 'alter table public.listings add constraint uredi_listings_model_len check (model is null or char_length(model) <= 60) not valid';
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listings' and column_name='description') then
    execute 'alter table public.listings drop constraint if exists uredi_listings_description_len';
    execute 'alter table public.listings add constraint uredi_listings_description_len check (description is not null and char_length(trim(description)) >= 20 and char_length(description) <= 2000) not valid';
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listings' and column_name='defects') then
    execute 'alter table public.listings drop constraint if exists uredi_listings_defects_len';
    execute 'alter table public.listings add constraint uredi_listings_defects_len check (defects is not null and char_length(trim(defects)) >= 1 and char_length(defects) <= 1000) not valid';
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listings' and column_name='city') then
    execute 'alter table public.listings drop constraint if exists uredi_listings_city_len';
    execute 'alter table public.listings add constraint uredi_listings_city_len check (city is not null and char_length(trim(city)) >= 2 and char_length(city) <= 60) not valid';
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listings' and column_name='phone') then
    execute 'alter table public.listings drop constraint if exists uredi_listings_phone_format';
    execute $sql$alter table public.listings add constraint uredi_listings_phone_format check (phone is null or phone ~ '^[0-9]{6,15}$') not valid$sql$;
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listings' and column_name='price') then
    execute 'alter table public.listings drop constraint if exists uredi_listings_price_range';
    execute 'alter table public.listings add constraint uredi_listings_price_range check (price is not null and price > 0 and price <= 1000000) not valid';
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listings' and column_name='delivery') then
    execute 'alter table public.listings drop constraint if exists uredi_listings_delivery_allowed';
    execute $sql$alter table public.listings add constraint uredi_listings_delivery_allowed check (delivery is not null and delivery in ('Лично предаване','Куриер','Собствен транспорт')) not valid$sql$;
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listings' and column_name='warranty') then
    execute 'alter table public.listings drop constraint if exists uredi_listings_warranty_allowed';
    execute $sql$alter table public.listings add constraint uredi_listings_warranty_allowed check (warranty is not null and warranty in ('Без гаранция','3 месеца','6 месеца','12 месеца','24+ месеца')) not valid$sql$;
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listings' and column_name='category') then
    execute 'alter table public.listings drop constraint if exists uredi_listings_category_allowed';
    execute $sql$alter table public.listings add constraint uredi_listings_category_allowed check (category is not null and category in ('Перални','Сушилни','Перални със сушилни','Хладилници','Фризери','Съдомиялни','Фурни','Готварски печки','Котлони','Аспиратори','Микровълнови','Климатици','Бойлери','Друга бяла техника')) not valid$sql$;
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='listings' and column_name='year') then
    execute 'alter table public.listings drop constraint if exists uredi_listings_year_range';
    execute 'alter table public.listings add constraint uredi_listings_year_range check (year is null or year between 1900 and extract(year from current_date)::int + 1) not valid';
  end if;

  -- PROFILE ----------------------------------------------------------------
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='display_name') then
    execute 'alter table public.profiles drop constraint if exists uredi_profiles_display_name_len';
    execute 'alter table public.profiles add constraint uredi_profiles_display_name_len check (display_name is not null and char_length(trim(display_name)) >= 2 and char_length(display_name) <= 80) not valid';
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profile_private' and column_name='phone') then
    execute 'alter table public.profile_private drop constraint if exists uredi_profile_private_phone_format';
    execute $sql$alter table public.profile_private add constraint uredi_profile_private_phone_format check (phone is null or phone ~ '^[0-9]{6,15}$') not valid$sql$;
  end if;

  -- DEALER PROFILE ---------------------------------------------------------
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='dealer_profiles' and column_name='company_name') then
    execute 'alter table public.dealer_profiles drop constraint if exists uredi_dealer_company_name_len';
    execute 'alter table public.dealer_profiles add constraint uredi_dealer_company_name_len check (company_name is not null and char_length(trim(company_name)) >= 2 and char_length(company_name) <= 120) not valid';
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='dealer_profiles' and column_name='company_city') then
    execute 'alter table public.dealer_profiles drop constraint if exists uredi_dealer_company_city_len';
    execute 'alter table public.dealer_profiles add constraint uredi_dealer_company_city_len check (company_city is not null and char_length(trim(company_city)) >= 2 and char_length(company_city) <= 60) not valid';
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='dealer_profiles' and column_name='eik') then
    execute 'alter table public.dealer_profiles drop constraint if exists uredi_dealer_eik_format';
    execute $sql$alter table public.dealer_profiles add constraint uredi_dealer_eik_format check (eik is not null and eik ~ '^([0-9]{9}|[0-9]{13})$') not valid$sql$;
  end if;

  -- CHAT (applies when the real Supabase chat is connected) ----------------
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='messages' and column_name='body') then
    execute 'alter table public.messages drop constraint if exists uredi_messages_body_len';
    execute 'alter table public.messages add constraint uredi_messages_body_len check (char_length(body) between 1 and 2000) not valid';
  elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='messages' and column_name='content') then
    execute 'alter table public.messages drop constraint if exists uredi_messages_content_len';
    execute 'alter table public.messages add constraint uredi_messages_content_len check (char_length(content) between 1 and 2000) not valid';
  end if;
end
$$;

commit;
