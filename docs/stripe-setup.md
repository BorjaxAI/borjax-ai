# Stripe Setup Guide for BorjaxAI

## Step 1: Create Stripe Account
1. Go to https://dashboard.stripe.com/register
2. Complete onboarding (business name: BorjaxAI)

## Step 2: Get API Keys
1. Go to https://dashboard.stripe.com/apikeys
2. Copy **Secret key** (`sk_test_...` for test, `sk_live_...` for production)
3. Copy **Publishable key** (`pk_test_...`)

## Step 3: Create Products & Prices

In Stripe Dashboard → Products, create:

| Product | Price | Billing | Price ID (save this) |
|---------|-------|---------|---------------------|
| BorjaxAI Starter | $9/month | Recurring monthly | `price_xxx` |
| BorjaxAI Pro | $29/month | Recurring monthly | `price_xxx` |
| BorjaxAI Agency | $99/month | Recurring monthly | `price_xxx` |

Or use the Stripe CLI:
```bash
stripe products create --name="BorjaxAI Starter" --description="100k tokens/mo, 5 agents"
stripe prices create --product=prod_xxx --unit-amount=900 --currency=usd --recurring[interval]=month

stripe products create --name="BorjaxAI Pro" --description="500k tokens/mo, unlimited agents"
stripe prices create --product=prod_xxx --unit-amount=2900 --currency=usd --recurring[interval]=month

stripe products create --name="BorjaxAI Agency" --description="2M tokens/mo, team seats, whitelabel"
stripe prices create --product=prod_xxx --unit-amount=9900 --currency=usd --recurring[interval]=month
```

## Step 4: Set Environment Variables

Add to `.env` on EC2 (`/opt/borjax-ai/.env`):
```
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_PRICE_STARTER=price_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_AGENCY=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## Step 5: Create Webhook
1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://api.borjaxai.com/v1/billing/webhook`
3. Events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook signing secret → `STRIPE_WEBHOOK_SECRET`

## Step 6: Restart Services
```bash
ssh -i ~/.ssh/borjaxai-key.pem ubuntu@35.153.204.139
cd /opt/borjax-ai
docker compose restart gateway ai
```

## Step 7: Test
1. Use Stripe test card: `4242 4242 4242 4242` (any future expiry, any CVC)
2. Go to app → Billing → click "Upgrade to Starter"
3. Complete checkout
4. Verify plan updates in app
