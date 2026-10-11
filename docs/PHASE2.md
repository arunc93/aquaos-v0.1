# Deferred after Phase 1

Phase 1 is the loop book a tanker, deliver it with a photo and OTP, and log quality. These items were left out on purpose.

- Push notifications when a booking moves to in transit or delivered. The Expo app in `mobile/` is the resident home only. Admins and vendors stay on the website.
- A TDS chart on `/quality`. The rows are already stored in `quality_logs`.
- Razorpay checkout on `/billing`. The page is a static stub.
- Preferred vendors and marketplace filters.
- Map tiles. Society address is text.
- A `cities` table so rainfall and regulatory notes can be edited without a deploy. Rainfall is a constant in `src/lib/rwh.ts`.
- WhatsApp Business API. Announcements and tanker updates can already be shared with a wa.me link. The app does not send those messages itself.
- Forecasting from `tank_levels`. The dashboard shows the latest percent and does not estimate days left.
- IoT tank sensors. A later `source` column on `tank_levels` can distinguish a manual reading from a sensor reading.
