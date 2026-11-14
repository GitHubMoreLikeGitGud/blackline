# Blackline

The cloud only sees what you let through.

Blackline is a web app for people who have to read a medical bill, a lease, or a payslip and want to ask a question without pasting the whole page into a chatbot. You drop a JPEG or PNG. Gemini Nano, on this computer, transcribes it and flags personal details. A deterministic pattern check runs beside the model. You see a blackline: every held detail is struck out, and you can reveal or add one with a tap. Only the redacted text is sent with your question.

This is an entry for Google's [#BuildHybridAI](https://firebasehybridaihackathon.devpost.com/) hackathon. The audience is renters, patients, and migrants who are handed official paper and then told to "just ask an AI."

**Try it:** [blackline-7c4df.web.app](https://blackline-7c4df.web.app). Reads on the device need desktop Chrome with Gemini Nano (see step 6 under Firebase setup). In a browser without Nano, the app sends a photo to the cloud only after you press its consent button. Three fictional specimens are built in.

**Demo video:** [youtu.be/dSKjH0GC0zQ](https://youtu.be/dSKjH0GC0zQ) (2:18, captions, no voice).

## How hybrid inference is used

Every model call goes through the Firebase AI Logic web SDK (`firebase/ai`), in hybrid mode, with the Gemini Developer API backend. There is no direct call to any other model API.

| Step | Mode | What leaves the device |
| --- | --- | --- |
| Prepare Gemini Nano | `initializeDeviceModel()` after a click | Nothing. This starts the on-device download and reports progress. |
| Read a scan on this device, online or offline | `InferenceMode.ONLY_ON_DEVICE` | Nothing. If Nano cannot run, the read stops with an error. It never falls back to the cloud on its own, because the SDK's `PREFER_ON_DEVICE` would send the photo to the cloud whenever the on-device model is not available. |
| Read a scan when Nano is unavailable | `InferenceMode.ONLY_IN_CLOUD`, only after an explicit consent button | The image. The page says so. |
| Ask a question online | `InferenceMode.PREFER_IN_CLOUD` | The redacted text and the question. Not the image. Not the held spans. The exact string is in **What the cloud saw**. If the cloud call fails, the SDK answers with Gemini Nano on this device instead, and the badge says ON DEVICE. The panel then shows the string as sent toward the cloud, because a server error can come after the request arrived. Only redacted text is involved either way. |
| Ask a question offline | `InferenceMode.ONLY_ON_DEVICE` | Nothing. A limited answer comes from Gemini Nano. |
| Pattern check on a specimen | No model call | Nothing. The specimen text is already in this repo. |

The badges say **ON DEVICE** or **CLOUD** from `response.inferenceSource` (`InferenceSource.ON_DEVICE` / `InferenceSource.IN_CLOUD`, the strings `on_device` and `in_cloud` in JS SDK 13.3.0). A pattern-only pass is also badged ON DEVICE, with the words "No model call," because it never leaves the browser and it is not an inference.

Structured output is configured for both paths, as the hybrid docs require: `inCloudParams.generationConfig.responseSchema` plus `onDeviceParams.promptOptions.responseConstraint`. The cloud model is set to `gemini-3.5-flash-lite`, the documented default for JS SDK 13. Images are inline JPEG or PNG data. On-device inference is single-turn, which matches both the read and the question.

API names were checked against the live guide on 12 Nov 2026 (page last updated 2026-11-10): [Build hybrid experiences for web](https://firebase.google.com/docs/ai-logic/hybrid/web/get-started), [configuration options](https://firebase.google.com/docs/ai-logic/hybrid/web/configuration-options), and [structured output](https://firebase.google.com/docs/ai-logic/hybrid/web/generate-structured-output).

The pattern check does not depend on the model. It flags emails, phone numbers including Singapore `+65` followed by 8 digits, NRIC/FIN-like tokens (`S`/`T`/`F`/`G`/`M` + 7 digits + a letter), card-like 13–19 digit runs, IBANs, labelled account numbers, and dates of birth that sit next to a birth label. Invoice dates are left alone. Names and street addresses are left for the model or for you to select.

## Run it

```bash
npm install
npm test
npm run dev
```

The dev server is [http://127.0.0.1:43123](http://127.0.0.1:43123).

With no `.env.local`, or with the placeholders from `.env.example` left as they are, the app opens and shows **Add your Firebase config**. It does not call Firebase and it does not throw. You can still open a specimen and run **Pattern-check the specimen text**.

`npm run build` typechecks and writes `dist/`.

`npm install` may warn that current Firebase packages want Node.js 24.12 or newer. Blackline is a browser bundle: install, test, and build were run here on Node.js 22, and the warning did not stop them. Use Node 24 if you want a clean install.

## Firebase setup

1. Create a Firebase project. The Spark plan is enough. Analytics is optional, and you do not need Vertex AI or billing to start.
2. Register a web app in that project.
3. Enable Firebase AI Logic with the Gemini Developer API (the free tier). In the console, open **AI Services → AI Logic**, finish **Get started**, and choose the **Gemini Developer API** provider.
4. Copy the web config into `.env.local`, using the names in `.env.example`. Restart `npm run dev`. Do not commit `.env.local`. Placeholder values such as `your-api-key` keep the app on the setup screen.
5. App Check on localhost: the app sets `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` before `initializeAppCheck` when the hostname is localhost. Open the browser console, copy the printed debug token, and register it under **Security → App Check → Apps → Manage debug tokens**. Never commit that token. A hosted build needs a real attestation provider and must not ship the debug flag. Blackline uses `ReCaptchaEnterpriseProvider` with a score-based web key from Google Cloud Fraud Defense (formerly reCAPTCHA Enterprise): create the key for your hosting domains, put its ID in `VITE_FIREBASE_APPCHECK_SITE_KEY`, and register it under **App Check → Apps** with the Fraud Defense provider. Only the site key is entered; there is no secret. Without billing, the key runs on the free Essentials tier (10,000 assessments a month, then requests fail until the next month). The console no longer registers classic reCAPTCHA v3 keys for App Check. Firebase AI Logic starts enforcing App Check automatically on the date shown under **App Check → APIs**; turn enforcement on yourself once the metrics show verified requests.
6. On-device model: desktop Chrome 139 or newer. Chrome 156 on Windows 11 needed no flag (checked 13 Nov 2026). On a version where `LanguageModel` is missing, enable `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` and restart. In DevTools you can confirm `await LanguageModel.availability()` is `available`, `downloadable`, or `downloading`. In Blackline, click **Prepare on-device model** and wait for the progress bar. The first download can take several minutes. Phones are not supported for this web SDK.

There is a checkbox, **Act as if offline**, so the offline path can be shown without pulling the network cable. The app also follows the browser's real online/offline state.

A second checkbox, **Simulate a cloud failure for questions**, builds the question model with `requestOptions.baseUrl` set to `http://127.0.0.1:9`, a port browsers refuse to connect to. The model request fails on this computer, and Firebase AI Logic's own `PREFER_IN_CLOUD` fallback answers with Gemini Nano if it is ready (otherwise the question ends with an error). The question never leaves the device, though an App Check token refresh can still go out. Reads are not affected: the consent button still sends the photo to the real cloud.

After every model read, the page reports the requests the browser recorded going from the page to other computers during the read, using the Resource Timing API (`src/net/watch.ts`). A device read normally shows none; a consented cloud read lists the Firebase AI Logic host, and App Check if it refreshed its token. The count is a lower bound: the page cannot see requests still running when the read ends, requests from embedded frames or workers, or Chrome's own traffic such as a model download.

## Specimens

Three fictional pages live in `public/samples/` and are drawn by `scripts/generate-samples.py` from `src/specimens.json`:

- a clinic invoice for Alex Specimen
- a tenancy page for Jordan Placeholder
- a payslip for Casey Notaperson

They use reserved `example.com` addresses, a public test card number, a documentation IBAN, and ID-shaped tokens that do not belong to a real person. Each page says it is fictional. Do not replace them with real documents.

Regenerate the PNGs with `python3 scripts/generate-samples.py` (Pillow, and DejaVu Sans). The committed PNGs are the ones the app serves.

## Built during the submission period

The contest opened at 1:30 p.m. Pacific on 11 Nov 2026 and closes at 2:00 p.m. Pacific on 30 Nov 2026 ([official rules](https://firebasehybridaihackathon.devpost.com/rules)). Work started on 12 Nov 2026 as a new project; none of it existed before the submission period. This public repository is a single snapshot of that work, published on 14 Nov 2026.

The app was scaffolded with the official Vite React TypeScript template. Everything past that starter — the hybrid calls, the blackline, the pattern check, the specimen pages, and this README — was written for this contest. No other pre-existing product code was reused.

AI coding assistants were used to write and revise this repository, including Cursor's agent. The rules allow standard tools, starter templates, and AI coding assistants, and this note is the disclosure.

## License

Apache License 2.0. Copyright 2026 Umar Mohktar. See [LICENSE](LICENSE).
