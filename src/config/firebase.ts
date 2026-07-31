import { App, getApps, initializeApp, cert } from "firebase-admin/app";
import config from "./index";

let firebaseApp: App;

const existingApps = getApps();

if (existingApps.length) {
  firebaseApp = existingApps[0]!;
} else {
  firebaseApp = initializeApp({
    credential: cert({
      projectId: config.firebase_project_id,
      clientEmail: config.firebase_client_email,
      privateKey: config.firebase_private_key.replace(/\\n/g, "\n"),
    }),
  });
}

export default firebaseApp;