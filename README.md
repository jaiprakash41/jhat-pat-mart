# JhatpatMart

A responsive grocery storefront and operations demo for the Noida launch described in the attached PRD.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use `npm run lint` and `npm run build` to validate changes.

## Demo flows

- Browse categories or search by English and Hinglish/Hindi aliases such as **atta**, **aloo**, **doodh**, and **palak**.
- Add products to the basket; quantities and the guest basket persist in this browser.
- Use `FRESH10` on baskets of ₹299 or more. Delivery is free over ₹399; the minimum order is ₹149.
- Checkout supports Noida pincodes `201301`–`201307` and `201309`, delivery slots, UPI/cards/net banking and cash on delivery up to ₹2,000.
- Local OTP for sign-in and cash on delivery: `1234`. Rider delivery confirmation also uses `1234`.
- Orders, the admin demo, stock adjustments, and rider handoff are local browser state. No payment, SMS, WhatsApp, email, or customer data is sent to a service.

The app is a frontend MVP/demo. Production authentication, APIs, SQL Server/Dapper persistence, payment gateway and webhook handling, invoice PDFs, and messaging integrations still need backend services and provider credentials.
