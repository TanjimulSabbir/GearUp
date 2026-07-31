import { getMessaging } from "firebase-admin/messaging";
import firebaseApp from "../config/firebase";

interface NotificationPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export const sendNotification = async (payload: NotificationPayload) => {
  const message = {
    token: payload.token,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data ?? {},
  };

  try {
    const response = await getMessaging(firebaseApp).send(message);
    return response;
  } catch (error) {
    console.log("FCM Notification Error:", error);
    throw error;
  }
};
