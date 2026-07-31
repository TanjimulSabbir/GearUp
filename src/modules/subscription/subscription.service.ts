import Stripe from "stripe";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { stripe } from "../../lib/stripe";
import {
  handleCheckoutSessionCompleted,
  handleChangeSubscription,
} from "../../utils/subscription/subscription.utils";

const createSubscriptionService = async (userId: string) => {
  const transaction = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: {
        id: userId,
      },
      include: {
        subscriptions: true,
      },
    });

    let stripeCustomerId = user.subscriptions?.stripeCustomerId;

    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      stripeCustomerId = stripeCustomer.id;
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: config.stripe_product_price_id,
          quantity: 1,
        },
      ],
      mode: "subscription",
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      success_url: `${config.frontend_url}/subscription/success`,
      cancel_url: `${config.frontend_url}/subscription/cancel`,
      metadata: {
        userId: user.id,
      },
    });
    return session.url;
  });
  return {
    paymentUrl: transaction,
  };
};

const handleStripeWebhook = async (payload: Buffer, signature: string) => {
  const endpointSecret = config.stripe_webhook_secret;

  const eventPayload = stripe.webhooks.constructEvent(
    payload,
    signature,
    endpointSecret,
  );

  switch (eventPayload.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(
        eventPayload.data.object as Stripe.Checkout.Session,
      );

      break;
    case "customer.subscription.updated":
      await handleChangeSubscription(eventPayload.data.object);

      break;
    case "customer.subscription.deleted":
      //Occurs whenever a customer’s subscription ends
      await handleChangeSubscription(eventPayload.data.object);
      break;
  }
  return eventPayload;
};
export const subscriptionServices = {
  createSubscriptionService,
  handleStripeWebhook,
};
