# AI Filler for Google Forms 🤖 (BYOK Edition)

## 🎉 Version 2.2 - Direct AI Integration (Gemini & Groq BYOK)

A privacy-focused, zero-backend Chrome extension that automatically detects and answers **all types of questions** on Google Forms using your own **Google Gemini** or **Groq** API key.

---

## 🔑 Why Bring Your Own Key (BYOK)?

- **100% Serverless & Private**: No intermediary backend servers. Your questions and responses travel directly between your browser and the official AI provider (Google Gemini or Groq).
- **Zero Cost & Free Tier**: Uses free API key tiers via [Google AI Studio](https://aistudio.google.com/app/apikey) or [Groq Console](https://console.groq.com/keys).
- **Customizable AI Providers & Models**:
  - **Google Gemini**: `Gemini 2.5 Flash`, `Gemini 3.5 Flash`
  - **Groq (Ultra Fast Inference)**: `openai/gpt-oss-120b` (Recommended), `openai/gpt-oss-20b`, `qwen/qwen3.8-27b`, `groq/compound`, `groq/compound-mini`, `allam-2-7b`, `meta-llama/llama-prompt-guard-2-86m`, `meta-llama/llama-prompt-guard-2-22m`, `openai/gpt-oss-safeguard-20b`

---

## 📦 Installation

1. **Clone or Download** this repository to your computer.
2. Open the extensions page in your browser:
   - **Chrome**: `chrome://extensions`
   - **Edge**: `edge://extensions`
   - **Brave**: `brave://extensions`
   - **Opera**: `opera://extensions`
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **"Load unpacked"**.
5. Select this project directory (`google_form`).
6. The extension is now installed!

---

## ⚙️ Quick Setup

1. Get a free API key:
   - **Gemini**: [Google AI Studio](https://aistudio.google.com/app/apikey)
   - **Groq**: [Groq Cloud Console](https://console.groq.com/keys)
2. Click the **AI Filler for Google Forms** icon in your browser extension toolbar (or click the ⚙️ settings button on any Google Form).
3. Select your provider (**Google Gemini** or **Groq**), paste your API key, and click **"Save Settings"** (or **"Test Key"** to verify).
4. You're ready to auto-fill!

---

## ✨ Features

- 🔍 **Detects All Question Types**:
  - ✅ Multiple choice (radio buttons)
  - ✅ Checkboxes (multiple selections)
  - ✅ Dropdown menus
  - ✅ Short & long text fields
- 👤 **Custom Personal Info Profile**: Save your personal details (Name, Email, Phone, College, Roll Number, etc.) so the AI automatically fills them for you!
- 🔒 **Smart Privacy Fallback**: If personal questions appear that aren't in your saved profile, the AI leaves them blank for manual entry.
- ⚡ **Single Click Auto-Fill**: Floating draggable widget on all Google Forms.
- 🛠️ **In-Page & Toolbar Settings**: Configure keys, switch models, and edit personal fields on the fly.

---

## 🚀 How to Use

1. Navigate to any Google Form (`docs.google.com/forms/...`).
2. Click the floating **"Auto Fill"** button in the top-right corner.
3. If it's your first time, an in-page settings dialog will prompt you to choose your provider and enter your API key.
4. Watch the AI automatically evaluate questions and populate answers in seconds!
5. Review your answers and submit.

---

## 🌐 Supported Browsers

- ✅ **Google Chrome**
- ✅ **Microsoft Edge**
- ✅ **Brave**
- ✅ **Opera / Opera GX**

---

Made with ❤️ using Google Gemini & Groq AI
