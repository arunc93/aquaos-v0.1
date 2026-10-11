-- AquaOS Phase 1. Apply in the Supabase SQL editor or with `supabase db push`.

create extension if not exists pgcrypto;

create type public.user_role as enum ('society_admin', 'resident', 'vendor', 'super_admin');
create type public.booking_status as enum ('requested', 'confirmed', 'in_transit', 'delivered', 'cancelled');
create type public.quality_source as enum ('tanker', 'borewell', 'municipal', 'other');
create type public.verification_status as enum ('pending', 'verified', 'rejected');
create type public.quality_badge as enum ('none', 'verified', 'premium');
create type public.complaint_status as enum ('open', 'resolved');
create type public.area_unit as enum ('sqft', 'sqm');

create table public.societies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  address text not null check (char_length(address) between 4 and 300),
  city text not null check (char_length(city) between 2 and 80),
  pincode text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  unit_count integer not null check (unit_count > 0),
  tank_capacity_kl numeric(8, 2) not null check (tank_capacity_kl > 0),
  admin_id uuid,
  created_at timestamptz not null default now()
);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  phone text not null check (phone ~ '^\+91[6-9][0-9]{9}$'),
  vehicle_number text not null,
  base_city text not null,
  rating numeric(2, 1) not null default 0 check (rating >= 0 and rating <= 5),
  reliability_score integer not null default 0 check (reliability_score between 0 and 100),
  verification_status public.verification_status not null default 'pending',
  quality_badge public.quality_badge not null default 'none',
  typical_eta_hours integer not null default 4 check (typical_eta_hours > 0),
  last_delivery_photo_path text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'resident',
  society_id uuid references public.societies (id) on delete set null,
  vendor_id uuid references public.vendors (id) on delete set null,
  full_name text not null check (char_length(full_name) between 2 and 80),
  phone text not null check (phone ~ '^\+91[6-9][0-9]{9}$'),
  flat_number text,
  created_at timestamptz not null default now()
);

alter table public.societies
  add constraint societies_admin_id_fkey
  foreign key (admin_id) references public.profiles (id) on delete set null;

create table public.vendor_prices (
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  capacity_kl numeric(4, 1) not null check (capacity_kl in (5, 6, 10, 12)),
  price_inr integer not null check (price_inr > 0),
  primary key (vendor_id, capacity_kl)
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  phone text not null check (phone ~ '^\+91[6-9][0-9]{9}$'),
  full_name text not null,
  flat_number text not null,
  role public.user_role not null default 'resident' check (role = 'resident'),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  accepted_at timestamptz,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id),
  requested_by uuid not null references public.profiles (id),
  capacity_kl numeric(4, 1) not null,
  price_inr integer not null check (price_inr > 0),
  status public.booking_status not null default 'requested',
  scheduled_at timestamptz not null,
  slot_label text not null check (slot_label in ('Morning', 'Afternoon', 'Evening')),
  delivered_at timestamptz,
  proof_path text,
  -- Shown to the society admin and the assigned vendor. Residents use my_deliveries(), which omits this column.
  otp text not null check (otp ~ '^[0-9]{6}$'),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quality_logs (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  source public.quality_source not null,
  tested_at date not null,
  tds numeric(6, 1) not null check (tds >= 0 and tds <= 5000),
  ph numeric(3, 1) not null check (ph >= 0 and ph <= 14),
  notes text,
  report_path text,
  logged_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  created_by uuid not null references public.profiles (id),
  message text not null check (char_length(message) between 4 and 1000),
  tds numeric(6, 1) check (tds is null or (tds >= 0 and tds <= 5000)),
  rating integer check (rating is null or rating between 1 and 5),
  status public.complaint_status not null default 'open',
  created_at timestamptz not null default now()
);

create table public.rwh_calculations (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  roof_area numeric(10, 2) not null check (roof_area > 0),
  area_unit public.area_unit not null,
  city_name text not null,
  rainfall_mm integer not null check (rainfall_mm > 0),
  runoff_coefficient numeric(3, 2) not null,
  estimated_harvest_liters integer not null check (estimated_harvest_liters >= 0),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  message text not null check (char_length(message) between 2 and 2000),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.tank_levels (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  level_percent numeric(5, 2) not null check (level_percent >= 0 and level_percent <= 100),
  notes text,
  recorded_at timestamptz not null default now(),
  recorded_by uuid not null references public.profiles (id)
);

create index bookings_society_scheduled_idx on public.bookings (society_id, scheduled_at desc);
create index bookings_vendor_status_idx on public.bookings (vendor_id, status);
create index quality_logs_society_tested_idx on public.quality_logs (society_id, tested_at desc);
create index tank_levels_society_recorded_idx on public.tank_levels (society_id, recorded_at desc);
create index complaints_society_status_idx on public.complaints (society_id, status);

alter table public.bookings replica identity full;

-- Helpers. Security definer so policies can read profiles without recursive RLS.

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid()
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  )
$$;

create or replace function public.same_society(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and society_id = target
  )
$$;

create or replace function public.booking_in_society(p_booking uuid, p_society uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_booking is not null and exists (
    select 1 from public.bookings
    where id = p_booking and society_id = p_society
  )
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := new.raw_user_meta_data->>'role';
  resolved_role public.user_role := 'resident';
  user_phone text := new.raw_user_meta_data->>'phone';
  user_name text := nullif(trim(new.raw_user_meta_data->>'full_name'), '');
begin
  if requested_role in ('society_admin', 'resident', 'vendor', 'super_admin') then
    resolved_role := requested_role::public.user_role;
  end if;
  if user_phone is null or user_phone !~ '^\+91[6-9][0-9]{9}$' then
    raise exception 'A valid Indian mobile number is required';
  end if;
  if user_name is null or char_length(user_name) < 2 then
    raise exception 'A name is required';
  end if;

  insert into public.profiles (id, full_name, phone, role)
  values (new.id, user_name, user_phone, resolved_role);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.protect_society_admin_id()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.admin_id is not null and new.admin_id is distinct from old.admin_id then
    raise exception 'admin_id cannot be changed';
  end if;
  return new;
end;
$$;

create trigger societies_protect_admin
  before update on public.societies
  for each row execute function public.protect_society_admin_id();

-- RPCs

create or replace function public.create_society(
  p_name text,
  p_address text,
  p_city text,
  p_pincode text,
  p_unit_count integer,
  p_tank_capacity_kl numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles;
  new_id uuid;
begin
  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null then
    raise exception 'Sign in first';
  end if;
  if actor.society_id is not null or actor.role <> 'resident' then
    raise exception 'This account cannot create a society';
  end if;
  if p_unit_count is null or p_unit_count < 1 then
    raise exception 'Enter the number of units';
  end if;
  if p_tank_capacity_kl is null or p_tank_capacity_kl <= 0 then
    raise exception 'Enter the tank capacity in KL';
  end if;

  insert into public.societies (name, address, city, pincode, unit_count, tank_capacity_kl)
  values (trim(p_name), trim(p_address), trim(p_city), trim(p_pincode), p_unit_count, p_tank_capacity_kl)
  returning id into new_id;

  update public.profiles
  set role = 'society_admin', society_id = new_id
  where id = actor.id;

  update public.societies set admin_id = actor.id where id = new_id;
  return new_id;
end;
$$;

create or replace function public.accept_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles;
  invite public.invites;
begin
  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null then
    raise exception 'Sign in first';
  end if;
  if actor.society_id is not null or actor.role <> 'resident' then
    raise exception 'This account already belongs to a society or vendor';
  end if;

  select * into invite
  from public.invites
  where code = upper(trim(p_code)) and accepted_at is null
  for update;

  if invite.id is null then
    raise exception 'Invite code was not found';
  end if;
  if invite.phone <> actor.phone then
    raise exception 'This invite was issued for a different mobile number';
  end if;

  update public.invites set accepted_at = now() where id = invite.id;
  update public.profiles
  set society_id = invite.society_id,
      role = 'resident',
      flat_number = invite.flat_number,
      full_name = invite.full_name
  where id = actor.id;

  return invite.society_id;
end;
$$;

create or replace function public.create_invite(
  p_full_name text,
  p_phone text,
  p_flat_number text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles;
  new_code text;
  tries integer := 0;
begin
  select * into actor from public.profiles where id = auth.uid();
  if actor.role <> 'society_admin' or actor.society_id is null then
    raise exception 'Only a society admin can invite residents';
  end if;
  if p_phone !~ '^\+91[6-9][0-9]{9}$' then
    raise exception 'Enter a valid Indian mobile number';
  end if;
  if char_length(trim(p_flat_number)) < 1 then
    raise exception 'Enter a flat number';
  end if;

  loop
    tries := tries + 1;
    new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.invites where code = new_code);
    if tries > 5 then
      raise exception 'Could not generate an invite code';
    end if;
  end loop;

  insert into public.invites (society_id, phone, full_name, flat_number, code, created_by)
  values (actor.society_id, p_phone, trim(p_full_name), trim(p_flat_number), new_code, actor.id);

  return new_code;
end;
$$;

create or replace function public.create_booking(
  p_vendor_id uuid,
  p_capacity_kl numeric,
  p_scheduled_at timestamptz,
  p_slot_label text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles;
  price integer;
  new_id uuid;
  new_otp text;
begin
  select * into actor from public.profiles where id = auth.uid();
  if actor.role <> 'society_admin' or actor.society_id is null then
    raise exception 'Only a society admin can book a tanker';
  end if;
  if p_slot_label not in ('Morning', 'Afternoon', 'Evening') then
    raise exception 'Choose Morning, Afternoon, or Evening';
  end if;
  if p_scheduled_at is null then
    raise exception 'Choose a delivery day';
  end if;
  if not exists (
    select 1 from public.vendors
    where id = p_vendor_id and verification_status = 'verified'
  ) then
    raise exception 'That vendor is not available';
  end if;

  select price_inr into price
  from public.vendor_prices
  where vendor_id = p_vendor_id and capacity_kl = p_capacity_kl;

  if price is null then
    raise exception 'That vendor does not offer this capacity';
  end if;

  new_otp := lpad((floor(random() * 1000000))::int::text, 6, '0');

  insert into public.bookings (
    society_id, vendor_id, requested_by, capacity_kl, price_inr,
    status, scheduled_at, slot_label, otp, notes
  )
  values (
    actor.society_id, p_vendor_id, actor.id, p_capacity_kl, price,
    'requested', p_scheduled_at, p_slot_label, new_otp, nullif(trim(p_notes), '')
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.transition_booking(
  p_booking_id uuid,
  p_next_status public.booking_status,
  p_otp text,
  p_proof_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles;
  job public.bookings;
  allowed boolean := false;
begin
  select * into actor from public.profiles where id = auth.uid();
  select * into job from public.bookings where id = p_booking_id for update;
  if job.id is null then
    raise exception 'Booking not found';
  end if;

  if actor.role = 'vendor' then
    if actor.vendor_id is distinct from job.vendor_id then
      raise exception 'This job is not assigned to you';
    end if;
    allowed :=
      (job.status = 'requested' and p_next_status = 'confirmed')
      or (job.status = 'confirmed' and p_next_status = 'in_transit')
      or (job.status = 'in_transit' and p_next_status = 'delivered');
  elsif actor.role = 'society_admin' then
    if actor.society_id is distinct from job.society_id then
      raise exception 'This booking belongs to another society';
    end if;
    allowed :=
      (job.status = 'requested' and p_next_status in ('confirmed', 'cancelled'))
      or (job.status in ('confirmed', 'in_transit') and p_next_status = 'cancelled');
  end if;

  if not allowed then
    raise exception 'That status change is not allowed';
  end if;

  if p_next_status = 'delivered' then
    if job.otp is distinct from trim(coalesce(p_otp, '')) then
      raise exception 'OTP does not match';
    end if;
    if p_proof_path is null
      or p_proof_path not like job.society_id::text || '/' || job.id::text || '/%' then
      raise exception 'Upload a delivery photo';
    end if;
    update public.bookings
    set status = 'delivered',
        delivered_at = now(),
        proof_path = p_proof_path,
        updated_at = now()
    where id = job.id;
    update public.vendors
    set last_delivery_photo_path = p_proof_path
    where id = job.vendor_id;
    return;
  end if;

  update public.bookings
  set status = p_next_status, updated_at = now()
  where id = job.id;
end;
$$;

create or replace function public.record_tank_level(
  p_level_percent numeric,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles;
  new_id uuid;
begin
  select * into actor from public.profiles where id = auth.uid();
  if actor.role <> 'society_admin' or actor.society_id is null then
    raise exception 'Only a society admin can record the tank level';
  end if;
  if p_level_percent is null or p_level_percent < 0 or p_level_percent > 100 then
    raise exception 'Tank level must be between 0 and 100';
  end if;

  insert into public.tank_levels (society_id, level_percent, notes, recorded_by)
  values (actor.society_id, p_level_percent, nullif(trim(p_notes), ''), actor.id)
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.resolve_complaint(p_complaint_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles;
begin
  select * into actor from public.profiles where id = auth.uid();
  if actor.role <> 'society_admin' or actor.society_id is null then
    raise exception 'Only a society admin can resolve a complaint';
  end if;

  update public.complaints
  set status = 'resolved'
  where id = p_complaint_id
    and society_id = actor.society_id
    and status = 'open';

  if not found then
    raise exception 'Complaint not found';
  end if;
end;
$$;

create or replace function public.set_vendor_verification(
  p_vendor_id uuid,
  p_status public.verification_status,
  p_badge public.quality_badge
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only a platform admin can verify vendors';
  end if;
  if p_status = 'pending' then
    raise exception 'Choose verify or reject';
  end if;

  update public.vendors
  set verification_status = p_status,
      quality_badge = case when p_status = 'verified' then p_badge else 'none'::public.quality_badge end
  where id = p_vendor_id;

  if not found then
    raise exception 'Vendor not found';
  end if;
end;
$$;

create or replace function public.my_deliveries()
returns table (
  id uuid,
  vendor_name text,
  capacity_kl numeric,
  price_inr integer,
  status public.booking_status,
  scheduled_at timestamptz,
  slot_label text,
  delivered_at timestamptz,
  proof_path text
)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, v.name, b.capacity_kl, b.price_inr, b.status,
         b.scheduled_at, b.slot_label, b.delivered_at, b.proof_path
  from public.bookings b
  join public.vendors v on v.id = b.vendor_id
  join public.profiles p on p.id = auth.uid()
  where p.society_id is not null
    and b.society_id = p.society_id
    and p.role in ('resident', 'society_admin')
  order by b.scheduled_at desc
$$;

-- RLS

alter table public.societies enable row level security;
alter table public.profiles enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_prices enable row level security;
alter table public.invites enable row level security;
alter table public.bookings enable row level security;
alter table public.quality_logs enable row level security;
alter table public.complaints enable row level security;
alter table public.rwh_calculations enable row level security;
alter table public.announcements enable row level security;
alter table public.tank_levels enable row level security;

create policy societies_select on public.societies
  for select to authenticated
  using (
    public.same_society(id)
    or exists (
      select 1
      from public.bookings b
      join public.profiles p on p.id = auth.uid()
      where b.society_id = societies.id
        and p.role = 'vendor'
        and p.vendor_id = b.vendor_id
    )
  );

create policy societies_update on public.societies
  for update to authenticated
  using (
    exists (
      select 1 from public.current_profile() p
      where p.role = 'society_admin' and p.society_id = societies.id
    )
  )
  with check (
    exists (
      select 1 from public.current_profile() p
      where p.role = 'society_admin' and p.society_id = societies.id
    )
  );

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or (society_id is not null and public.same_society(society_id))
  );

create policy vendors_select on public.vendors
  for select to authenticated
  using (
    verification_status = 'verified'
    or public.is_super_admin()
    or id = (select vendor_id from public.current_profile())
  );

create policy vendor_prices_select on public.vendor_prices
  for select to authenticated
  using (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_prices.vendor_id
        and (
          v.verification_status = 'verified'
          or public.is_super_admin()
          or v.id = (select vendor_id from public.current_profile())
        )
    )
  );

create policy invites_select on public.invites
  for select to authenticated
  using (
    exists (
      select 1 from public.current_profile() p
      where p.role = 'society_admin' and p.society_id = invites.society_id
    )
  );

create policy bookings_select on public.bookings
  for select to authenticated
  using (
    exists (
      select 1 from public.current_profile() p
      where (p.role = 'society_admin' and p.society_id = bookings.society_id)
         or (p.role = 'vendor' and p.vendor_id = bookings.vendor_id)
    )
  );

create policy quality_select on public.quality_logs
  for select to authenticated
  using (public.same_society(society_id));

create policy quality_insert on public.quality_logs
  for insert to authenticated
  with check (
    logged_by = auth.uid()
    and exists (
      select 1 from public.current_profile() p
      where p.role = 'society_admin' and p.society_id = quality_logs.society_id
    )
    and (
      booking_id is null
      or exists (
        select 1 from public.bookings b
        where b.id = quality_logs.booking_id and b.society_id = quality_logs.society_id
      )
    )
    and (
      report_path is null
      or report_path like society_id::text || '/%'
    )
  );

create policy complaints_select on public.complaints
  for select to authenticated
  using (public.same_society(society_id));

create policy complaints_insert on public.complaints
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.current_profile() p
      where p.role = 'resident'
        and p.society_id = complaints.society_id
    )
    and (
      booking_id is null
      or public.booking_in_society(booking_id, society_id)
    )
  );

create policy rwh_select on public.rwh_calculations
  for select to authenticated
  using (public.same_society(society_id));

create policy rwh_insert on public.rwh_calculations
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.current_profile() p
      where p.role = 'society_admin' and p.society_id = rwh_calculations.society_id
    )
  );

create policy announcements_select on public.announcements
  for select to authenticated
  using (public.same_society(society_id));

create policy announcements_insert on public.announcements
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.current_profile() p
      where p.role = 'society_admin' and p.society_id = announcements.society_id
    )
  );

create policy tank_select on public.tank_levels
  for select to authenticated
  using (public.same_society(society_id));

-- Residents have no select on bookings, so the delivery list is this function.
revoke all on function public.current_profile() from public, anon;
revoke all on function public.is_super_admin() from public, anon;
revoke all on function public.same_society(uuid) from public, anon;
revoke all on function public.booking_in_society(uuid, uuid) from public, anon;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.protect_society_admin_id() from public, anon, authenticated;
revoke all on function public.create_society(text, text, text, text, integer, numeric) from public, anon;
revoke all on function public.accept_invite(text) from public, anon;
revoke all on function public.create_invite(text, text, text) from public, anon;
revoke all on function public.create_booking(uuid, numeric, timestamptz, text, text) from public, anon;
revoke all on function public.transition_booking(uuid, public.booking_status, text, text) from public, anon;
revoke all on function public.record_tank_level(numeric, text) from public, anon;
revoke all on function public.resolve_complaint(uuid) from public, anon;
revoke all on function public.set_vendor_verification(uuid, public.verification_status, public.quality_badge) from public, anon;
revoke all on function public.my_deliveries() from public, anon;

grant execute on function public.current_profile() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.same_society(uuid) to authenticated;
grant execute on function public.booking_in_society(uuid, uuid) to authenticated;
grant execute on function public.create_society(text, text, text, text, integer, numeric) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.create_invite(text, text, text) to authenticated;
grant execute on function public.create_booking(uuid, numeric, timestamptz, text, text) to authenticated;
grant execute on function public.transition_booking(uuid, public.booking_status, text, text) to authenticated;
grant execute on function public.record_tank_level(numeric, text) to authenticated;
grant execute on function public.resolve_complaint(uuid) to authenticated;
grant execute on function public.set_vendor_verification(uuid, public.verification_status, public.quality_badge) to authenticated;
grant execute on function public.my_deliveries() to authenticated;

-- Storage

insert into storage.buckets (id, name, public)
values
  ('delivery-proofs', 'delivery-proofs', false),
  ('quality-reports', 'quality-reports', false)
on conflict (id) do nothing;

create policy delivery_proofs_vendor_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'delivery-proofs'
    and exists (
      select 1
      from public.bookings b
      join public.profiles p on p.vendor_id = b.vendor_id
      where p.id = auth.uid()
        and p.role = 'vendor'
        and b.status = 'in_transit'
        and (storage.foldername(name))[1] = b.society_id::text
        and (storage.foldername(name))[2] = b.id::text
    )
  );

create policy delivery_proofs_read on storage.objects
  for select to authenticated
  using (bucket_id = 'delivery-proofs');

create policy quality_reports_admin on storage.objects
  for all to authenticated
  using (
    bucket_id = 'quality-reports'
    and (storage.foldername(name))[1] = (select society_id::text from public.current_profile())
    and (select role from public.current_profile()) = 'society_admin'
  )
  with check (
    bucket_id = 'quality-reports'
    and (storage.foldername(name))[1] = (select society_id::text from public.current_profile())
    and (select role from public.current_profile()) = 'society_admin'
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'bookings'
     ) then
    alter publication supabase_realtime add table public.bookings;
  end if;
end $$;
