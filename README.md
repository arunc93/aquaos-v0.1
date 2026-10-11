# AquaOS

AquaOS is a small web app for an apartment association to book a water tanker, confirm the delivery with a photo and a one-time code, and log a water-quality result.

This phase is a pilot for one society. Residents can use the website or the Expo app in `mobile/`. Admins and vendors use the website.

## What you can do

- A society admin sees tank level, the next booking, this month’s delivered spend, and open complaints.
- The admin books a verified tanker. Status moves from Requested to Confirmed, In transit, and Delivered.
- The vendor marks the job out for delivery, then completes it only with a photo and the matching OTP.
- The admin logs TDS and pH against that delivery, or against borewell or municipal water.
- A resident sees the next delivery and announcements, and can send feedback.
- An admin or a resident can open WhatsApp with an announcement or a tanker update already written. The message does not include the delivery OTP.
- A platform admin can verify or reject a vendor.

## Requirements

- Node.js 22 or newer
- A Supabase project (Postgres, Auth, Storage)

## Setup

1. Create a Supabase project.
2. In Authentication → Providers → Email, turn **off** “Confirm email”. Self-serve signup needs this. The seed script confirms its own demo users either way.
3. Open the SQL editor and run `supabase/migrations/20261011120000_init.sql`.
4. Copy `.env.example` to `.env.local` and fill in the project URL, anon key, and service role key. `DATABASE_URL` is only for external SQL tools. The app and the seed script do not open it.
5. Install and seed:

```bash
npm install
npm run seed
npm run dev
```

The app runs at http://localhost:3000.

## Demo logins

Password for every account: `AquaOS-pilot-2026`

| Email | Role |
| --- | --- |
| admin@lakeview.aquaos.demo | Society admin, Lakeview Residency Association, HSR Layout |
| resident@lakeview.aquaos.demo | Resident, flat A-204 |
| vendor@manjunatha.aquaos.demo | Sri Manjunatha Water Supply |
| super@aquaos.demo | Platform admin |

The seeded in-transit job uses OTP `333333`. The admin also sees that code on the booking page. Give it to the vendor account, upload a photo, and the job can be marked delivered.

An unused invite `JOIN86` is for mobile `+91 98000 00099` (Priya Nair, B-12). Sign up with that number and the code to join the society.

## Core loop

1. Sign in as the admin. Open **Book tanker**, pick Sri Manjunatha or Kaveri, and request a slot.
2. Open the booking and read the OTP.
3. Sign in as the vendor. Confirm the job, mark it out for delivery, then upload a photo and enter the OTP.
4. Sign in as the admin again. Open **Quality** and add a log against that delivery.
5. Sign in as the resident to read the announcement and send feedback. The admin sees the open complaint on the dashboard and can mark it resolved.

## Access control

Row Level Security is on for every table. A signed-in user reads society data only for their own society. Residents cannot read the `bookings` table, because the OTP is on that row. They call `my_deliveries()`, which returns the schedule and the proof path and never the OTP. Booking status changes go through `transition_booking`. A delivery is stored only when the OTP matches and a proof photo path is present.

`npm run test` checks the harvest figure, phone formatting, and the booking status table. `npm run typecheck` checks the TypeScript project.

## Resident phone app

The Expo app in `mobile/` is the resident home: next delivery, announcements, WhatsApp share, and feedback. It does not send push notifications.

```bash
cd mobile
npm install
```

Copy the Supabase project URL and anon key into `mobile/.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Do not put the service role key in the phone app. Then start Expo and open the project in Expo Go:

```bash
npm start
```

Sign in as `resident@lakeview.aquaos.demo`. An admin or vendor sign-in is asked to use the website.

## Later

See `docs/PHASE2.md` for push notifications, charts, payments, maps, and sensors.
