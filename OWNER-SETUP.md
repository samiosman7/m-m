# M&M Car Detailing — Owner Setup Guide

This covers two optional upgrades for your website:

- **A. Stripe** — let customers pay for gift cards online with a card.
- **B. AI Chatbot** — power the website's chat assistant with live AI.

You do **not** have to do either one — the site works without them. Do them only
if you want the features. Neither one requires you to share any banking details
with your website manager — everything financial stays between you and Stripe.

---

## A. Stripe — accept gift card payments online

**Time:** ~15 minutes. **You'll need:** your business info and a bank account
(for Stripe to deposit your money into).

### How it works
Stripe is the company that actually processes the card payment and deposits the
money into **your** bank account. The website just links to payment pages that
Stripe hosts. Your bank details go to Stripe only — never into the website.

### Step 1 — Create your Stripe account
1. Go to **https://stripe.com** and click **Start now / Sign up**.
2. Enter your email, name, and a password. Verify your email.

### Step 2 — Activate your account
Stripe will ask for:
- Your business details (name, address, phone).
- Your **bank account** (where your money gets deposited).
- Identity/tax info (SSN or EIN — this is normal and required by law).

Follow Stripe's prompts until your account says it's **activated / able to accept
live payments**.

### Step 3 — Create 6 payment links
In the Stripe Dashboard, go to **Payment Links** (under "Product catalog" or use
the search bar at the top — type "Payment Links" → **+ New**).

Create **five fixed-price links** and **one custom link**, exactly these amounts:

| Link | Price setting |
|------|----------------|
| Gift Card $50  | One-time price, **$50** |
| Gift Card $100 | One-time price, **$100** |
| Gift Card $150 | One-time price, **$150** |
| Gift Card $200 | One-time price, **$200** |
| Gift Card $300 | One-time price, **$300** |
| Gift Card (Custom) | **"Customer chooses what to pay"** (set a minimum like $25) |

For each one:
1. Click **+ New → Payment link**.
2. Add a product name (e.g. `M&M Gift Card $100`) and set the price.
3. (Optional) Turn on **"Let customers adjust quantity"** so people can buy more
   than one.
4. Click **Create link** and **copy** the link — it looks like
   `https://buy.stripe.com/xxxxxxxx`.

### Step 4 — Get the links onto the website
**Send all 6 links to your website manager (Sami)** — that's the easiest path.
Just label which link is which amount.

> If you want to install them yourself: the links go in the file
> `gift-cards/gift-cards.js`, in the block near the top that looks like this —
> paste each URL between the quotes, then save/commit:
>
> ```js
> const STRIPE = {
>   amounts: {
>     50:  "https://buy.stripe.com/...",
>     100: "https://buy.stripe.com/...",
>     150: "https://buy.stripe.com/...",
>     200: "https://buy.stripe.com/...",
>     300: "https://buy.stripe.com/...",
>   },
>   custom: "https://buy.stripe.com/...",   // the "customer chooses amount" link
> };
> ```

Until the links are added, the gift card page still works — it just collects the
order and emails it to you to arrange payment manually (cash, card, app, etc.).

### Good to know
- **Fees:** Stripe charges about **2.9% + 30¢** per payment. A $100 gift card
  nets you about $96.80.
- **Payouts:** Stripe deposits your money to your bank automatically (usually a
  couple of business days).
- **Recipient details:** even after a customer pays with Stripe, ask them to also
  tap **"Email gift details"** on the confirmation screen so you know who to send
  the card to (Stripe collects the payment + a reference code, not the gift
  message).

---

## B. AI Chatbot

### ⚠️ Please read this first — what it does and doesn't do
Your website already has a **free** chat assistant that answers common questions
(services, pricing, hours, booking, gift cards) and can take booking requests.
That works for **every visitor**, right now, with no setup.

Adding an Anthropic API key turns on **"live AI"** answers — but the way the site
is currently built, the key is stored **in the browser where you enter it**. That
means:
- ✅ Great for **you** to try the live AI on your own phone/computer.
- ❌ It does **not** turn on live AI for your customers' devices — they'll keep
  getting the free built-in answers.

So this step is **optional and mainly for testing**. If you want true live AI for
all visitors, that needs a small server add-on — **ask Sami**; it's a separate job.

### If you still want to set up a key
1. Go to **https://console.anthropic.com** and sign up.
2. Go to **Billing** → add a small amount of credit (**$5 is plenty**) and set a
   **monthly spend limit** so you can never be surprised.
3. Go to **API Keys** → **Create Key** → copy it (it starts with `sk-ant-`). You
   only see it once, so paste it somewhere safe.
4. Open your website's owner dashboard: add **`/admin/`** to your website address
   (for example `yoursite.com/admin/`).
5. Log in (default password **`mmdetailing2024`** — please change it, see below).
6. Go to the **Settings** tab → **AI Chatbot** → paste the key → **Save key**.

**Cost:** the chatbot uses Claude Haiku, which is very cheap — a typical
conversation costs a fraction of a cent.

---

## Security reminders
- **Change your admin password:** in the dashboard go to **Settings → Change
  password**. Don't keep the default.
- **Never post your Anthropic key or Stripe login** anywhere public.
- Your Stripe bank details live only in your Stripe account — the website never
  sees them.

---

*Questions on any step? Send them to Sami.*
