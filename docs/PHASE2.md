# Deferred after Phase 1

Phase 1 is the loop book a tanker, deliver it with a photo and OTP, and log quality. These items were left out on purpose.

- A store release and an iOS push key. The resident app already asks for a push token, and a tanker moving to in transit or delivered notifies that phone. Expo Go cannot show those notifications.
- Razorpay checkout on `/billing`. The page is a static stub.
- Preferred vendors and marketplace filters.
- Map tiles. Society address is text.
- A `cities` table so rainfall and regulatory notes can be edited without a deploy. Rainfall is a constant in `src/lib/rwh.ts`.
- WhatsApp Business API. Announcements and tanker updates can already be shared with a wa.me link. The app does not send those messages itself.
- Forecasting from `tank_levels`. The dashboard shows the latest percent and does not estimate days left.
- IoT tank sensors. A later `source` column on `tank_levels` can distinguish a manual reading from a sensor reading.
