# Hisaab Deployment & PWA Installation Guide

This guide provides step-by-step instructions to successfully deploy the **Hisaab** application to **GitHub Pages** or **Netlify**, and how to install it on an **Android mobile device**.

---

## 🛠️ Part 1: How we fixed the PWA install issue

When hosting an app on a local server (`http://localhost:3000/`) or directly on the root of a domain (like `https://hisaab.netlify.app/`), the path to files like `/sw.js` and `/manifest.json` starts with `/`. 

However, when you deploy to **GitHub Pages**, your app runs under a subfolder (e.g., `https://username.github.io/hisaab/`). In this scenario:
* Absolute paths like `/manifest.json` would point to `https://username.github.io/manifest.json` (which doesn't exist), resulting in a **404 error**.
* Because the browser cannot find the manifest or the icons, **the native "Install App" prompt gets disabled** on Android and desktop.

### What has been updated:
1. **Relative Paths**: Changed absolute paths to relative paths in `index.html`, `src/main.tsx`, `public/manifest.json`, and `public/sw.js`. 
2. **Dynamic PWA Scope**: Changed `"start_url": "/"` and `"scope": "/"` in `manifest.json` to `"./"` so the PWA automatically adapts to any subfolder or root domain.
3. **High-Resolution PNG Icons**: Configured actual, crystal-clear PNG icons (`icon-192.png` and `icon-512.png`) which are strictly required by Android Chrome for full PWA installation (shortcut creation isn't enough; Chrome requires valid icons and service workers).

---

## 🚀 Part 2: Step-by-Step Deployment Guides

### Option A: Deploying to Netlify (Highly Recommended)
Netlify is the easiest way to deploy SPAs because it hosts from the root domain, provides fast CDN delivery, and manages HTTPS certificates automatically.

1. **Build the Project**:
   Run the build script in your local terminal:
   ```bash
   npm run build
   ```
   This generates a production-ready `dist` folder.

2. **Manual Upload (No Git required)**:
   * Go to [app.netlify.com](https://app.netlify.com/).
   * Log in or sign up.
   * Drag and drop your local `dist` folder into the Netlify "Drag and Drop" deployment area.
   * Your app is now live!

3. **Continuous Deployment with GitHub (Recommended)**:
   * Push your code to a GitHub repository.
   * Log in to Netlify and click **Add new site** > **Import an existing project**.
   * Choose **GitHub** and authorize.
   * Select your repository.
   * Set the following configurations:
     * **Build Command**: `npm run build`
     * **Publish directory**: `dist`
   * Click **Deploy Site**. Netlify will automatically build and publish your app every time you push code to GitHub.

---

### Option B: Deploying to GitHub Pages (Subfolder Setup)
Since GitHub Pages hosts apps inside a subfolder (e.g. `https://<username>.github.io/<reponame>/`), you must instruct Vite to include your repository name as the base directory during compile time.

1. **Adjust the Build Script**:
   When compiling for GitHub Pages, use the `--base` flag to prefix your asset paths with your repository name:
   ```bash
   npm run build -- --base=/<your-repository-name>/
   ```
   *Example: If your repo is named `hisaab`, run: `npm run build -- --base=/hisaab/`*

2. **Publish via `gh-pages` branch**:
   To make publishing simple, install the `gh-pages` deployment package:
   ```bash
   npm install gh-pages --save-dev
   ```
   Open `package.json` and add a `deploy` script:
   ```json
   "scripts": {
     "predeploy": "npm run build -- --base=/<your-repository-name>/",
     "deploy": "gh-pages -d dist"
   }
   ```
   Run the command to deploy:
   ```bash
   npm run deploy
   ```
   This will automatically compile your project and push the contents of the `dist` folder to a separate `gh-pages` branch in your repository, making the app live.

---

## 📱 Part 3: How to Install on Android Mobile

To trigger the native Android "Install App" banner (which installs Hisaab as a full-fledged standalone application, rather than just a simple browser bookmark):

1. **HTTPS is Mandatory**:
   Open Chrome on your mobile device and navigate to your deployed site using the secure protocol (e.g., `https://hisaab.netlify.app` or `https://username.github.io/hisaab/`). **PWA installation will not trigger on plain HTTP.**

2. **Clear Stale Cache (If you tested earlier)**:
   If you have already loaded a previous version of the app on your mobile device, the browser might have cached the older service worker:
   * In Chrome, click the **Three Dots** menu on the top right.
   * Go to **Settings** > **Site settings** > **Data stored**.
   * Search for your deployed domain and tap **Clear & reset**.
   * Re-open the page.

3. **Install the App**:
   * Once the page finishes loading, a banner will automatically pop up at the bottom saying **"Add Hisaab to Home screen"** or **"Install Hisaab"**.
   * Click **Install**.
   * Alternatively, click the **Three Dots** menu in Chrome and select **Install App** (or **Add to Home screen**).
   * **Result**: Because we have provided perfect PNG icons and an offline service worker, the app will download to your launcher as a native-looking standalone app, and it will run instantly with zero browser address bar interference!

---

## 🔑 Part 4: Direct Google Drive Integration (No Firebase Required)

By popular request, we have removed all Firebase Authentication dependencies! The backup section now connects directly to the user's personal Google Drive using standard client-side Google OAuth 2.0.

### How it works:
* Users sign in directly to their Google Account via a standard Google login popup.
* Your application fetches their profile and coordinates backup synchronizations purely inside the client's browser.
* No data goes through Firebase, and there is no administrative Firebase Auth setup required on your side!

### If you host the app under your own domain:
If you deploy this application under your own personal domain (or a custom Netlify/GitHub Pages subdomain), you should update the Google OAuth Client ID to your own Google Cloud credentials so your users can connect their accounts:

1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Create or select a Google Cloud Project.
3. Enable the **Google Drive API** and **Google Sheets API** under "Enabled APIs & Services".
4. Configure the **OAuth Consent Screen** (set publishing status to "In Production" or "Testing").
5. Create an **OAuth 2.0 Client ID** (choose Web Application):
   * Under **Authorized JavaScript origins**, add your deployment URL (e.g. `https://hisaab.netlify.app` or `https://<username>.github.io`).
   * Under **Authorized redirect URIs**, add your exact deployment base path (e.g., `https://hisaab.netlify.app/` or `https://<username>.github.io/hisaab/`).
6. Copy your **Client ID**.
7. Open `firebase-applet-config.json` at the root of your project and paste your Client ID in the `oAuthClientId` field:
   ```json
   {
     "oAuthClientId": "YOUR_NEW_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
   }
   ```
8. Rebuild and redeploy your app. Now your users can log in securely and backup to their personal Google Drives!
