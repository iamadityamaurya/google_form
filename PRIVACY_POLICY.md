# Privacy Policy for AI Filler for Google Forms

**Last Updated:** September 18, 2026

**1. Architecture & Data Processing**
AI Filler for Google Forms operates entirely client-side using a "Bring Your Own Key" (BYOK) model. There are no intermediary or third-party servers operated by the extension developer.

**2. Data Collection & Transmission**
* **Form Content:** When you explicitly click "Auto Fill", the questions and available answer choices from the active Google Form are read from your browser DOM and transmitted securely over HTTPS directly to Google's official Gemini API (`https://generativelanguage.googleapis.com/`).
* **API Keys:** Your Google Gemini API key is stored locally in your browser's protected extension storage (`chrome.storage.sync` / `chrome.storage.local`). It is never transmitted to any third party other than Google's Gemini API endpoints to authenticate your requests.

**3. Data Retention & Storage**
* We do not operate any database or logging servers.
* No personal data or form responses are collected, recorded, or retained by this extension.

**4. Google AI Terms**
Requests made using your API key are subject to Google's Generative AI terms and privacy policies.

**5. Contact**
If you have any questions or feedback regarding this policy, please submit an issue on our GitHub repository.
