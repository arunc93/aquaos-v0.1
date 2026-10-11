-- Resident phone tokens and a delivery notification.
-- The body sentence matches mobile/src/lib/push.ts:
--   Tanker update: In transit. Vendor, 6 KL, Morning.
--   Tanker update: Delivered. Vendor, 6 KL, Morning.

create extension if not exists pg_net;

create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null check (char_length(token) between 16 and 255),
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

create index device_tokens_user_idx on public.device_tokens (user_id);

alter table public.device_tokens enable row level security;

create policy device_tokens_select on public.device_tokens
  for select to authenticated
  using (user_id = auth.uid());

create policy device_tokens_insert on public.device_tokens
  for insert to authenticated
  with check (user_id = auth.uid());

create policy device_tokens_update on public.device_tokens
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy device_tokens_delete on public.device_tokens
  for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.device_tokens to authenticated;
grant all on public.device_tokens to service_role;
revoke all on public.device_tokens from anon, public;

create or replace function public.notify_delivery_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tokens text[];
  payload jsonb;
  society_name text;
  vendor_name text;
  message text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  if new.status not in ('in_transit', 'delivered') then
    return new;
  end if;

  select coalesce(array_agg(dt.token), '{}')
    into tokens
  from public.device_tokens dt
  join public.profiles p on p.id = dt.user_id
  where p.society_id = new.society_id
    and p.role = 'resident';

  if tokens is null or cardinality(tokens) = 0 then
    return new;
  end if;

  select s.name into society_name from public.societies s where s.id = new.society_id;
  select v.name into vendor_name from public.vendors v where v.id = new.vendor_id;

  message := format(
    'Tanker update: %s. %s, %s KL, %s.',
    case new.status when 'in_transit' then 'In transit' else 'Delivered' end,
    vendor_name,
    regexp_replace(new.capacity_kl::text, '\.0$', ''),
    new.slot_label
  );

  select jsonb_agg(
    jsonb_build_object(
      'to', token,
      'title', society_name,
      'body', message,
      'sound', 'default',
      'channelId', 'deliveries',
      'data', jsonb_build_object('bookingId', new.id)
    )
  )
    into payload
  from unnest(tokens) as token;

  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    body := payload,
    headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
  );

  return new;
end;
$$;

revoke all on function public.notify_delivery_push() from public, anon, authenticated;

drop trigger if exists bookings_notify_delivery_push on public.bookings;
create trigger bookings_notify_delivery_push
  after update of status on public.bookings
  for each row
  execute function public.notify_delivery_push();
