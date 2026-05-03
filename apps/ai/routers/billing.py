import os
import json
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from db.database import get_db
from db.models import User
from routers.auth import require_auth

router = APIRouter()

PLANS = {
    "free":    {"name": "Free",    "price": 0,  "tokens": 10_000,   "agents": 1,  "features": ["chat"]},
    "starter": {"name": "Starter", "price": 9,  "tokens": 100_000,  "agents": 5,  "features": ["chat", "tasks"]},
    "pro":     {"name": "Pro",     "price": 29, "tokens": 500_000,  "agents": -1, "features": ["chat", "tasks", "agents", "connectors"]},
    "agency":  {"name": "Agency",  "price": 99, "tokens": 2_000_000,"agents": -1, "features": ["chat", "tasks", "agents", "connectors", "whitelabel", "team"]},
}


def _get_stripe():
    """Return configured stripe module or None if not configured."""
    key = os.getenv("STRIPE_SECRET_KEY")
    if not key:
        return None
    try:
        import stripe
        stripe.api_key = key
        return stripe
    except ImportError:
        return None


# ── Schemas ───────────────────────────────────────────────────────────────────
class CheckoutRequest(BaseModel):
    plan: str


class PortalRequest(BaseModel):
    pass


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.get("/plans")
def get_plans():
    return {"plans": PLANS}


@router.get("/usage")
def get_usage(
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    return {
        "plan": current_user.plan,
        "tokens_used": current_user.tokens_used,
        "tokens_limit": current_user.tokens_limit,
        "percent": round((current_user.tokens_used / max(current_user.tokens_limit, 1)) * 100, 1),
    }


@router.post("/create-checkout")
async def create_checkout(
    payload: CheckoutRequest,
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    stripe = _get_stripe()
    if not stripe:
        return {"error": "Stripe not configured yet", "coming_soon": True}

    price_map = {
        "starter": os.getenv("STRIPE_PRICE_STARTER"),
        "pro":     os.getenv("STRIPE_PRICE_PRO"),
        "agency":  os.getenv("STRIPE_PRICE_AGENCY"),
    }
    price_id = price_map.get(payload.plan)
    if not price_id:
        raise HTTPException(status_code=400, detail=f"Invalid plan: {payload.plan}")

    # Create or reuse Stripe customer
    if not current_user.stripe_customer_id:
        customer = stripe.Customer.create(
            email=current_user.email,
            name=current_user.full_name,
            metadata={"user_id": str(current_user.id)},
        )
        current_user.stripe_customer_id = customer.id
        db.commit()

    app_url = os.getenv("APP_URL", "https://d18813a3in0ap7.cloudfront.net")
    session = stripe.checkout.Session.create(
        customer=current_user.stripe_customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=f"{app_url}/#/billing?success=true",
        cancel_url=f"{app_url}/#/billing?cancelled=true",
        metadata={"user_id": str(current_user.id), "plan": payload.plan},
    )
    return {"url": session.url, "session_id": session.id}


@router.post("/portal")
async def create_portal(
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    stripe = _get_stripe()
    if not stripe:
        return {"error": "Stripe not configured yet", "coming_soon": True}

    if not current_user.stripe_customer_id:
        raise HTTPException(status_code=404, detail="No subscription found. Subscribe to a plan first.")

    app_url = os.getenv("APP_URL", "https://d18813a3in0ap7.cloudfront.net")
    session = stripe.billing_portal.Session.create(
        customer=current_user.stripe_customer_id,
        return_url=f"{app_url}/#/billing",
    )
    return {"url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhook events — no auth required (Stripe signs the payload)."""
    stripe = _get_stripe()
    if not stripe:
        return {"error": "Stripe not configured"}, 400

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    try:
        if webhook_secret and sig_header:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        else:
            event = json.loads(payload)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_type = event.get("type", "") if isinstance(event, dict) else event["type"]

    if event_type in ("customer.subscription.created", "customer.subscription.updated"):
        sub = event["data"]["object"]
        customer_id = sub["customer"]
        status = sub["status"]

        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user and status == "active":
            price_id = sub["items"]["data"][0]["price"]["id"]
            plan_map = {
                os.getenv("STRIPE_PRICE_STARTER"): ("starter", 100_000),
                os.getenv("STRIPE_PRICE_PRO"):     ("pro",     500_000),
                os.getenv("STRIPE_PRICE_AGENCY"):   ("agency",  2_000_000),
            }
            plan_info = plan_map.get(price_id, ("starter", 100_000))
            user.plan = plan_info[0]
            user.tokens_limit = plan_info[1]
            user.tokens_used = 0  # reset on new billing cycle
            db.commit()

    elif event_type == "customer.subscription.deleted":
        sub = event["data"]["object"]
        customer_id = sub["customer"]
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            user.plan = "free"
            user.tokens_limit = 10_000
            db.commit()

    elif event_type == "invoice.payment_failed":
        sub = event["data"]["object"]
        customer_id = sub.get("customer")
        # Log but don't downgrade immediately — Stripe retries
        print(f"[billing] Payment failed for customer {customer_id}")

    return {"status": "ok"}
