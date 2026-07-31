import Stripe from "stripe";
import { stripe } from "../../lib/stripe";
import { prisma } from "../../lib/prisma";
import { SubscribtionStatus } from "../../../generated/prisma/enums";

export const getPeriodEnd = (payload: Stripe.Subscription) => {
  const currentPeriodEndInMilliseconds = payload.items.data[0]
    ?.current_period_end as number;

  const currentPeriodEnd = new Date(currentPeriodEndInMilliseconds * 1000);

  return currentPeriodEnd;
};

export const handleCheckoutSessionCompleted = async (
  session: Stripe.Checkout.Session,
) => {
  const userId = session.metadata?.userId as string;
  const stripeCustomerId = session.customer as string;
  const stripeSubscriptionId = session.subscription as string;
  if (!userId || !stripeCustomerId || !stripeSubscriptionId) {
    throw new Error("Invalid session");
  }
  const stripeSubscription =
    await stripe.subscriptions.retrieve(stripeSubscriptionId);

  if (stripeSubscription.status !== "active") {
    throw new Error("Subscription is not active");
  }

  const currentPeriodEnd = getPeriodEnd(stripeSubscription);

  await prisma.subscription.upsert({
    where: {
      userId,
    },
    create: {
      userId,
      stripeCustomerId,
      stripeSubscriptionId,
      status: "ACTIVE",
      currentPeriodEnd,
    },
    update: {
      stripeCustomerId,
      stripeSubscriptionId,
      status: "ACTIVE",
      currentPeriodEnd,
    },
  });
};

export const handleChangeSubscription = async (
  payload: Stripe.Subscription,
) => {
  const stripeSubscriptionId = payload.id;

  const status =
    payload.status === "active" || payload.status === "trialing"
      ? SubscribtionStatus.ACTIVE
      : payload.status === "canceled"
        ? SubscribtionStatus.CANCELLED
        : SubscribtionStatus.EXPIRED;

  const currentPeriodEnd = getPeriodEnd(payload);

  const isSubscriptionExist = await prisma.subscription.findUnique({
    where: {
      stripeSubscriptionId,
    },
  });

  if (!isSubscriptionExist) {
    console.log(
      `Webhook : No Subscription found for subscription id : ${stripeSubscriptionId}`,
    );

    return;
  }

  await prisma.subscription.update({
    where: {
      stripeSubscriptionId,
    },
    data: {
      status,
      currentPeriodEnd,
    },
  });
};
