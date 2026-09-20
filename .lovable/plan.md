# Complete Greeting Advert and Admin Access

## Changes
- Make the mobile phone, Agent, and Advert controls slightly smaller, centered, and width-safe on narrow phones.
- Add a Greeting Advert entry to the desktop sidebar that opens the existing greeting form.
- Remove only the “Upload Luo Champion” card from the admin dashboard and the Luo Champion checkbox from the movie upload form. Keep the existing Luo Champion page and uploads untouched.
- Add a Greetings card and `/admin/greetings` view to the admin dashboard.
- Keep greeting records inside the existing transactions collection, deduplicated by payment reference, and display only records saved after verified successful payment.

## Verification
- Check narrow mobile and desktop layouts for overflow and visibility.
- Confirm admin navigation opens the paid Greetings list.
- Confirm the success gate requires a completed, matching UGX 5,000 payment with a confirmation code, while failed or pending payments are not saved.
- Confirm the app builds without errors.

## Technical details
- Reuse the existing greeting form, payment verification, and Firestore transaction storage.
- Preserve all existing Luo Champion public pages and previously uploaded content.
