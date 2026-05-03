"""Internal routes — called only by the gateway (internal secret required)."""
import os
from fastapi import APIRouter, Header, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from db.database import get_db
from db.models import User

internal_router = APIRouter()

INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "borjax_internal")

PLAN_TOKEN_LIMITS = {
    "free": 10_000,
    "starter": 100_000,
    "pro": 500_000,
    "agency": 2_000_000,
}


def verify_internal(x_internal_secret: str = Header(...)):
    if x_internal_secret != INTERNAL_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")


@internal_router.get("/token-usage/{user_id}")
def token_usage(
    user_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(verify_internal),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "tokens_used": user.tokens_used,
        "tokens_limit": user.tokens_limit,
        "plan": user.plan,
        "is_guest": getattr(user, 'is_guest', False),
    }


class BillingWebhookEvent(BaseModel):
    type: str
    data: dict


@internal_router.post("/billing-webhook")
def billing_webhook(
    event: BillingWebhookEvent,
    db: Session = Depends(get_db),
    _: None = Depends(verify_internal),
):
    """Handle Stripe webhook events forwarded from the gateway."""
    event_type = event.type
    obj = event.data.get("object", {})

    if event_type == "customer.subscription.updated":
        # Update user plan based on subscription
        customer_id = obj.get("customer")
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            # Extract plan from metadata or price ID
            items = obj.get("items", {}).get("data", [])
            if items:
                metadata = items[0].get("price", {}).get("metadata", {})
                new_plan = metadata.get("plan", user.plan)
                user.plan = new_plan
                user.tokens_limit = PLAN_TOKEN_LIMITS.get(new_plan, user.tokens_limit)
                db.commit()

    elif event_type == "customer.subscription.deleted":
        customer_id = obj.get("customer")
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            user.plan = "free"
            user.tokens_limit = PLAN_TOKEN_LIMITS["free"]
            db.commit()

    elif event_type == "checkout.session.completed":
        customer_id = obj.get("customer")
        metadata = obj.get("metadata", {})
        user_id = metadata.get("user_id")
        plan = metadata.get("plan", "starter")

        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.stripe_customer_id = customer_id
                user.plan = plan
                user.tokens_limit = PLAN_TOKEN_LIMITS.get(plan, 100_000)
                db.commit()

    return {"ok": True}
