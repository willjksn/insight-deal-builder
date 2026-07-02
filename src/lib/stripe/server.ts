import Stripe from "stripe";
import { assertStripeConfigured } from "@/lib/stripe/config";

let stripeClient: Stripe | null | undefined;

export function getStripe(): Stripe {
  if (stripeClient !== undefined) return stripeClient!;
  assertStripeConfigured();
  stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), {
    apiVersion: "2025-08-27.basil",
    typescript: true,
  });
  return stripeClient;
}
