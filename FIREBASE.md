# Accounts and Firebase

The first page has two tabs: **Sign in** and **Create account**.

* **Create account** asks for name, age, health condition (optional), email, password and confirmation. The age fixes the age group (1 to 5, 6 to 17, 18 to 60) for that account.
* **Sign in** asks for email and password. The account's saved details, assessment, sessions and reports are loaded.

Everything is checked: valid email, password of at least 8 characters, matching confirmation, age 1 to 60, one account per email.

## Two ways it stores accounts

| | Firebase off (default) | Firebase on |
|---|---|---|
| Where accounts live | this browser only | Firebase Authentication + Firestore |
| Password | salted PBKDF2 hash in the browser | handled by Firebase (never stored by the site) |
| Works on another device | no | yes |
| Secure against other people | no (casual protection only) | yes, with the rules below |

Use Firebase for real use. The browser-only mode is for trying the site out.

## What is stored (Firebase on)
* **Authentication:** the email and password of each account (the password is hashed by Firebase).
* **Firestore, collection `players`, one document per account**, the document id is the account's uid. Fields: `name`, `age`, `groupId`, `condition`, `email`, `level`, `stage`, `sessions`, `updated`, and `data` (the whole profile as JSON: assessment results, every daily session, every report). You can read these in the Firebase console.
* Details are saved 0.6 s after every change and when the account is created. The top bar shows "Saved to the cloud".

## Setup (about 10 minutes)
1. Go to https://console.firebase.google.com and choose **Add project** (Analytics can stay off).
2. **Build > Authentication > Get started > Sign-in method > Email/Password > Enable.**
3. **Project settings (gear icon) > General > Your apps > Web (`</>`).** Register an app and copy the `firebaseConfig` object into `web/js/flow/firebase-config.js`, replacing `export const FIREBASE_CONFIG = null;` with
   ```js
   export const FIREBASE_CONFIG = { apiKey: "...", authDomain: "...", projectId: "...",
     storageBucket: "...", messagingSenderId: "...", appId: "..." };
   ```
   (These values identify the project and are not secrets. The rules below do the protecting.)
4. **Build > Firestore Database > Create database** (production mode, the region nearest you).
5. **Firestore > Rules**, paste, then **Publish**:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{db}/documents {
       match /players/{uid} {
         allow read, create, update: if request.auth != null && request.auth.uid == uid;
         allow delete: if false;
       }
     }
   }
   ```
   Each signed-in account can read and write only its own document, and nobody can list or delete players from the site.
6. **Authentication > Settings > Authorized domains:** `localhost` is there already. Add your own domain when you deploy.
7. Run `python run.py`, open http://localhost:8765/, choose **Create account**. The new user appears under Authentication > Users and in Firestore > players.

## Things to know
* There is no "forgot password" screen yet. In Firebase mode you can send a reset email from Authentication > Users; adding a reset link to the sign-in page is a small next step.
* In browser-only mode a lost password cannot be recovered (clear the site data to start over).
* Health condition is personal data. Add a privacy notice and consent before storing it for real people.
* The Firebase code has not been run against a live project from this repository. Step 7 confirms it on yours; if something fails, the sign-in page shows the reason (for example "Email and password sign-in is not switched on").
