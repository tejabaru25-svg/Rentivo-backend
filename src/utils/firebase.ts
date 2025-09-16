import admin from "firebase-admin";

// Initialize Firebase Admin SDK (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

export const sendPushNotification = async (
  fcmToken: string,
  title: string,
  body: string
) => {
  try {
    const message = {
      notification: {
        title,
        body,
      },
      token: fcmToken,
    };

    const response = await admin.messaging().send(message);
    console.log("✅ Push notification sent:", response);
    return response;
  } catch (err) {
    console.error("❌ Error sending push notification:", err);
    throw err;
  }
};
