# Setting up amoka.online

This guide takes you from this code to a live store, assuming no technical background. Work through it in order. Expect it to take an afternoon, plus any waiting time for business verification.

The store sells to **Singapore only**, in **Singapore dollars**, and takes payment by card, PayNow and GrabPay through Stripe.

You'll create these accounts:

| Service | What it does | Cost |
|---|---|---|
| [GitHub](https://github.com) | Stores your code | Free (you already have this) |
| [Supabase](https://supabase.com) | Database, logins, product photos | Free to start. Pro is about US$25/month |
| [Stripe](https://stripe.com/en-sg) | Takes payments | No monthly fee, a charge on each sale |
| [Vercel](https://vercel.com) | Runs the website | Free to test. Pro is about US$20/month |
| [Resend](https://resend.com) or [Brevo](https://www.brevo.com) | Sends login emails | Free tier available |

Check current prices when you sign up. Two of these matter once you're live:
- **Vercel's free Hobby plan is for non-commercial use.** A shop taking payments needs Pro.
- **Supabase's free plan pauses inactive projects and has no automatic backups.** Move to Pro before taking real orders.

---

## 1. Run the project on your computer

Node.js and Git are already installed on this PC. On another computer, install [Node.js LTS](https://nodejs.org) and [Git](https://git-scm.com) first.

1. Open this folder in VS Code.
2. Open a terminal: **Terminal > New Terminal**.
3. Install the project's packages:
   ```
   npm install
   ```
4. Copy the settings template. In the VS Code file list, right-click `.env.example`, copy it, paste it, and rename the copy to `.env.local`.

   Or run this in the terminal:
   ```
   Copy-Item .env.example .env.local
   ```

   `.env.local` will hold your secret keys. Git is set to ignore it, so it won't be uploaded. Never share it.

5. Start the site:
   ```
   npm run dev
   ```
6. Open <http://localhost:3000>. You'll see the home page with no products yet. Press `Ctrl+C` in the terminal to stop it.

Keep going: the store fills in once Supabase is connected.

---

## 2. Set up Supabase

### Create the project

1. Sign up at [supabase.com](https://supabase.com) and click **New project**.
2. Name it `amoka`.
3. Choose a strong database password and save it in a password manager.
4. For **Region**, choose **Southeast Asia (Singapore)**.
5. Click **Create new project** and wait a minute or two.

### Run the SQL files

The `supabase/` folder holds 9 files. Run them **in this exact order**, once each:

| Order | File | What it does |
|---|---|---|
| 1 | `01_tables.sql` | Creates the tables |
| 2 | `02_indexes.sql` | Makes lookups fast |
| 3 | `03_functions_triggers.sql` | Automatic behaviour, such as creating a profile on signup |
| 4 | `04_rls_policies.sql` | Security rules |
| 5 | `05_storage.sql` | Storage for product photos |
| 6 | `06_checkout_functions.sql` | Checkout, payment and stock logic |
| 7 | `07_seed.sql` | Your 20 categories and default settings |
| 8 | `08_guest_checkout_pay_later.sql` | Guest checkout and "pay later" orders |
| 9 | `09_banners.sql` | Home page slides you manage in admin |

If you ran files 1 to 7 before file 8 existed, just run file 8 once. It's safe on a store that already has orders.

For each file:

1. In Supabase, click **SQL Editor** in the left menu, then **New query**.
2. In VS Code, open the file, press `Ctrl+A` then `Ctrl+C`.
3. Paste it into Supabase and click **Run**.
4. Check you see **Success**. If you see an error, stop and fix it before the next file.

If file 6 fails with an error mentioning `pg_cron`, go to **Database > Extensions**, search for `pg_cron`, turn it on, and run file 6 in a new query. Before re-running, delete anything it partly created, or ask for help: re-running after a partial success gives "already exists" errors.

### Check the photo bucket

File 5 creates it for you. Go to **Storage** and check you can see `product-images`, marked **Public**.

### Set up login emails

Supabase's built-in email only reaches your own team and has a very low limit, so **customers won't get confirmation emails until you do this**.

1. Create a free [Resend](https://resend.com) account (or Brevo).
2. Add and verify your domain `amoka.online`. Resend will show you DNS records to add at your domain provider.
3. Create the SMTP login. Resend shows a host, port, username and password.
4. In Supabase go to **Authentication > Emails > SMTP Settings** and turn on custom SMTP.
5. Enter those details, with a sender such as `hello@amoka.online`.

### Set the login addresses

In Supabase go to **Authentication > URL Configuration**:

- **Site URL:** `https://amoka.online`
- **Redirect URLs:** add both of these:
  ```
  https://amoka.online/auth/callback
  http://localhost:3000/auth/callback
  ```

Check that **Authentication > Sign In / Providers > Email** is on, with **Confirm email** turned on.

### Make yourself an admin

1. Finish step 4 below, then run `npm run dev`, open <http://localhost:3000/signup> and create your account.
2. Confirm your email.
3. In Supabase, open **SQL Editor** and run this with your own email:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
4. Sign out and back in. **My account** now shows an **Admin** link, and <http://localhost:3000/admin> opens.

The admin console has its own sign-in page at `/admin/login`, for example <https://amoka.online/admin/login>. Bookmark it. Customer accounts that try to open it are told they aren't an admin.

---

## 3. Set up Stripe

1. Sign up at [stripe.com](https://stripe.com/en-sg), choosing **Singapore** as your country.
2. You can test immediately. Live payments need your business details, UEN and bank account: complete these under **Settings > Business**.

### Get your test keys

1. Turn on **Test mode** (or open the test environment) in the Stripe dashboard.
2. Go to **Developers > API keys**.
3. Reveal the **Secret key**, which starts `sk_test_`. You'll use it in step 4.

### Turn on PayNow and GrabPay

Go to **Settings > Payments > Payment methods** and enable **Cards**, **PayNow** and **GrabPay**. The checkout page shows whatever you enable here, so no code changes are needed.

### Create the webhook

The webhook is how Stripe tells your store a payment succeeded, even if the customer closes their browser. Set it up after you've deployed (step 6), because it needs your live address.

1. Go to **Developers > Webhooks > Add endpoint**.
2. **Endpoint URL:** `https://amoka.online/api/webhooks/stripe`
3. Under **Select events**, add these four:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
4. Save, then reveal the **Signing secret**, which starts `whsec_`. You'll put this in Vercel.

Test mode and live mode have **separate** webhooks and keys. You'll repeat this for live mode in step 8.

---

## 4. Fill in your settings

### Environment variables

Open `.env.local` and replace each value:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` on your PC, `https://amoka.online` on Vercel |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase: **Project Settings > API**, Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase: **Project Settings > API Keys**, publishable key (older projects: `anon` key) |
| `SUPABASE_SECRET_KEY` | Supabase: **Project Settings > API Keys**, secret key (older projects: `service_role` key). **Keep private** |
| `STRIPE_SECRET_KEY` | Stripe: **Developers > API keys**. **Keep private** |
| `STRIPE_WEBHOOK_SECRET` | Stripe: your webhook's signing secret, from step 3. **Keep private** |
| `RESEND_API_KEY` | Resend: **API Keys > Create API Key**, with sending access. **Keep private** |
| `EMAIL_FROM` | The sender of order emails, on the domain you verified in Resend. Leave it as `amoka.online <orders@amoka.online>` |
| `ADMIN_ORDER_EMAIL` | The one address that receives new order emails, for example `order@starlucents.com` |

On your PC you can leave `STRIPE_WEBHOOK_SECRET` as it is. Local test payments are confirmed when you return to the confirmation page.

Order emails need a Resend account even if you chose Brevo for login emails. Without `RESEND_API_KEY` and `EMAIL_FROM`, the store still works but doesn't send them.

Restart `npm run dev` after changing this file.

### Store details

Your company name, UEN, SFA licence, address, email, phone, support hours, delivery time and return window are already filled in. To change any of them, edit `config/site.ts`. These details appear in the footer, policy pages and invoices.

### GST

Sign in as admin and open **Admin > Settings**:

- Enter your **GST registration number**. It prints on tax invoices.
- Check the **GST rate** is correct (Singapore's rate was 9% when this was built; confirm it with IRAS).
- Set your real **shipping fee** and **free shipping** amount. They start as placeholders: S$6, free from S$60.

---

## 5. Add the sample products

1. Open `scripts/seed/products.csv` in Excel. Save it as CSV when done.
2. Run:
   ```
   npm run seed:products
   ```
3. It uploads each image and prints `live` or `hidden` beside each product.

You can edit the CSV and run it again whenever you like. It updates names and prices, but it won't overwrite stock levels you've since changed.

### What you need to fix before launch

The script creates 45 products:

**22 are live, all with a placeholder price of S$5.00 and stock of 25.** None of your images show a price, so **every price must be replaced**. Several also say "confirm pack size" in the `note` column.

**23 are hidden**, and the `note` column says why:
- **Unnamed packs:** 15 packs have no product name, so they're listed as "Unnamed candy 1" and so on. The note gives a guess at what's inside. Confirm the real name and allergens. A wrong name on food is an allergy risk.
- **Old dates on the photo:** `salt/image1` (expiry June 2023), `grocerys/image2` (Exp 19/12/25) and `appalam/image1` (packed May 2022). Customers would see these.
- **Bad or tiny photos:** `beverages/image4`, `beverages/image6`, `semiya/image1`, `snacks/image4` and `chips/image3`.

Not used at all: `pickles/image1`, `pickles/image3` (it has a designer's watermark), `oil/image1`, and the group shots `dhall/image1` and `snacks/image9`.

**9 categories start empty:** Nuts, Rice, Paakku, Chocolate and Coffee & Tea have no images, and Candy, Chips, Appalam & Vadagam and Semiya have only hidden products. They show a "Coming soon" page until you add products.

Also check label images for details that are out of date, such as the typo "QUERRIES" and postcode "63996".

---

## 6. Deploy to Vercel

1. Sign up at [vercel.com](https://vercel.com) using **Continue with GitHub**.
2. Click **Add New > Project** and import `amoka.online`.
3. Leave the build settings as they are. Vercel detects Next.js.
4. Open **Environment Variables** and add all nine from step 4, with these changes:
   - `NEXT_PUBLIC_SITE_URL` = `https://amoka.online`
   - `STRIPE_WEBHOOK_SECRET` = a temporary value for now. You'll replace it below.
5. Click **Deploy**.

The project is already set to run in Singapore, via `vercel.json`.

From now on, every push to the `main` branch on GitHub deploys automatically.

---

## 7. Connect amoka.online

1. In Vercel open your project, then **Settings > Domains**.
2. Add `amoka.online`, then add `www.amoka.online` and set it to redirect to `amoka.online`.
3. Vercel shows the exact DNS records to create. Use the values it shows you.
4. Sign in where you bought the domain. Your domain's nameservers look like Hostinger's parking service, so check there first. If you can't find it, a WHOIS lookup shows your registrar.
5. Add the records in that provider's DNS settings, and remove any old parking records for the same names.
6. Wait for Vercel to show **Valid Configuration**. This can take from minutes to a few hours. HTTPS is set up automatically.

Then create the Stripe **test mode** webhook from step 3, put its `whsec_` secret in Vercel as `STRIPE_WEBHOOK_SECRET`, and click **Redeploy** on the latest deployment. Environment changes only take effect after a redeploy.

---

## 8. Test a purchase, then go live

### Test mode

1. Open <https://amoka.online> on your phone and sign up with a new account.
2. Confirm the email. If it doesn't arrive, check your SMTP setup from step 2.
3. Add products to your cart and go to checkout.
4. Add a Singapore address and click **Pay**.
5. On the Stripe page, use test card `4242 4242 4242 4242`, any future expiry date and any 3-digit CVC.
6. Check each of these:
   - The confirmation page says **Thank you for your order**.
   - The order appears under **My account > Orders**, with a tax invoice.
   - **Admin > Orders** shows it as **Paid**.
   - The product's stock went down.
   - Stripe's **Developers > Webhooks** page shows successful deliveries.
   - One **New order** email reached your `ADMIN_ORDER_EMAIL` inbox, with the items and delivery address. Check your spam folder too.
7. Try the other paths:
   - Choose PayNow and use the test screen.
   - Click back on the Stripe page: you should see "Payment cancelled".
   - In admin, move an order to **Shipped**, then **Delivered**.
   - Cancel a paid order and check the stock returns.
8. Sign in to a second account and confirm you can't see the first account's orders.
9. Sign out, add products to your cart and go to checkout as a guest:
   - The **Register Your Account & Enjoy More Rewards!** popup appears. Choose **Continue as Guest**.
   - Fill in your details, choose **Place order & pay later** and click **Place order**.
   - The confirmation page says **Thank you, your order is placed**.
   - Your `ADMIN_ORDER_EMAIL` inbox gets a **New pay-later order** email, and the email you typed gets an order confirmation.
   - **Admin > Orders** shows it with a **Pay later** label. Cancel it and check the stock returns.

### Before going live

- [ ] The details in `config/site.ts` are correct
- [ ] All S$5.00 placeholder prices are replaced
- [ ] Shipping fee and free shipping amount are set
- [ ] GST registration number is entered
- [ ] Hidden products are fixed or left hidden
- [ ] Allergens and ingredients are filled in for food products
- [ ] Policy pages are reviewed. They're drafts, so have them checked for your business
- [ ] Check your SFA licence covers everything you sell, including online sales and any food you import yourself, with the [Singapore Food Agency](https://www.sfa.gov.sg/food-import-export/commercial-imports)
- [ ] Your GST treatment is confirmed with IRAS or your accountant
- [ ] Supabase and Vercel are on paid plans

### Switch to live mode

1. Complete Stripe's business verification.
2. In Stripe, leave test mode.
3. Enable PayNow and GrabPay in live mode too.
4. Copy your live secret key, which starts `sk_live_`.
5. Create the webhook again in live mode, with the same address and four events, and copy its new signing secret.
6. In Vercel, update `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, then redeploy.
7. Make one small real purchase with your own card, then refund it in the Stripe dashboard.

---

## 9. Everyday use

### Add a product

1. Go to **Admin > Products > Add product**.
2. Enter the name, then upload photos under **Photos**. The first one is the main photo. Square photos on a plain background look best.
3. Choose a category.
4. Add each size with its price and stock. Use **Add another size** for more. **Was price** is optional and shows a "Save X%" badge.
5. Fill in the description, ingredients, allergens and country of origin.
6. Click **Save product**. The next page lets you add or remove photos later.

### Add a category

1. Go to **Admin > Add category**, or **Categories > Add new category**.
2. Enter the name and upload a photo, then click **Save category**.
3. To change one later, open it from **Admin > Categories**.

### Manage your shop

- **Change a price or stock:** Admin > Products, type the new price or stock beside the size and click **Save**. Tick **Low stock** to see what's running out.
- **Mark something out of stock:** click **Out of stock** beside the size. Its stock becomes 0, and the shop shows "Out of stock" under the product and stops it being added to carts. Type a new stock number and click **Save** when it's back.
- **Run an offer:** open the product and set a **Was price** above the selling price. The product then shows "Save X%", appears under **Special offers** on the home page and in the home page slideshow.
- **Hide a product:** open it and untick **Show in the store**.
- **Delete a product:** open it and click **Delete product**. Products with past orders are archived instead, so your records stay correct.
- **Feature on the home page:** tick **Feature on the home page**.

### Home page slides

1. Go to **Admin > Home slides > Add new slide**.
2. Upload a wide photo (at least 1600 × 600 pixels). Keep the important part on the right, because the left is darkened behind the text.
3. Write the title, for example "20% off all pickles", and optionally a small heading, text and a button with a link such as `/c/pickles`.
4. Optionally choose **Show from** and **Show until** dates, so an offer starts and ends by itself.
5. Click **Save slide**.

When you have at least one live slide, the home page shows your slides only. With none, it shows automatic slides built from your products.

### Handle orders

1. Go to **Admin > Orders**. Every order is listed, from guests and account holders, with its number, date, customer, items, payment, status and total. Search by customer name, email or order number.
2. Open an order to see everything about it. **Print order** gives a packing sheet with tick boxes; **Invoice** gives the customer's invoice (a tax invoice once paid) to print or save as PDF.
3. **Paid** orders need shipping. After posting one, change the status to **Shipped**, then **Delivered** once it arrives.

### Sales report

**Admin > Reports** shows orders and sales for **Today**, **This week** (from Monday), **This month**, or any dates you choose with **Apply dates**. It lists the number of orders and customers, paid sales, average order, pay-later orders still to collect, cancellations, a day-by-day table, best sellers and every order in the period. Search by customer name to see one customer's orders, and use **Print report** to print or save it as PDF. Times are Singapore time.

**Pay-later orders** are marked **Pay later** and show as **Awaiting payment**. The dashboard counts them. For each one:

1. Contact the customer using the email and phone number on the order, and arrange payment.
2. When you've received the money, change the status to **Paid**, then ship it as usual.
3. If the customer doesn't pay, change it to **Cancelled**. This returns the stock.

Their stock stays reserved until you do one of these, so don't leave them sitting. One email address can have at most 3 unpaid pay-later orders at a time.

**Guest orders** say **(guest)** beside the email. Guests see their order through the link in their confirmation email. If a guest later creates an account, their earlier guest orders don't appear in it.

Orders marked **Review** need your attention. For example, a customer may have paid after their order expired and the stock had gone. The order page says what happened.

**Refunds:** do these in your Stripe dashboard. Cancelling an order returns the stock but does **not** refund the customer.

**Order emails:** you get one email for each order, listing the items, totals and delivery address, with a link to the order. Online orders are emailed once paid, and pay-later orders as soon as they're placed, with **pay-later** in the subject. Replying goes to the customer. If an order needs review, the subject says so. Treat **Admin > Orders** as your full record, because an email can occasionally fail or land in spam.

Customers also get a confirmation email with their order and a link to view it. Replies go to your store email. Resend only delivers to customers once `amoka.online` is verified there. Stripe can also send its own receipt for online payments if you turn on **Settings > Customer emails > Successful payments**.

---

## If something goes wrong

| Problem | Likely cause |
|---|---|
| Site shows no products | Seed script not run, or the Supabase values are wrong |
| Confirmation emails don't arrive | Custom SMTP isn't set up (step 2) |
| No email for a paid order | Check spam, then `RESEND_API_KEY`, `EMAIL_FROM` and your verified domain in Resend. Vercel's logs show the reason. The order is safe in Admin > Orders |
| Email link goes to the wrong page | Supabase Site URL or Redirect URLs are wrong |
| "We couldn't place your order" at checkout | File `08_guest_checkout_pay_later.sql` hasn't been run in Supabase |
| "We couldn't start the payment" | `STRIPE_SECRET_KEY` is wrong, or test and live keys are mixed |
| Paid, but the order stays "Awaiting payment" | Webhook address or `STRIPE_WEBHOOK_SECRET` is wrong. Check Stripe's webhook page |
| Admin page sends you to the home page | Your role isn't `admin` yet. Run the SQL in step 2, then sign in again |
| Product photos don't appear | `NEXT_PUBLIC_SUPABASE_URL` wasn't set when Vercel built the site. Set it and redeploy |
| Vercel build fails | Open the deployment's logs. Run `npm run build` on your PC to reproduce it |

## For developers

```
npm run dev            Start locally
npm run build          Production build
npm test               Run all tests (includes the SQL files, on a local Postgres)
npm run typecheck      Type check
npm run lint           Lint
npm run seed:products  Upload sample products
```

Before pushing a change, run `npm test` and `npm run build`.
