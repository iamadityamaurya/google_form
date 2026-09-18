# Chrome Web Store Listing Content

Use the content below when submitting or updating the extension on the Chrome Web Store dashboard.

## Product Details

**Title**: `AI Filler for Google Forms (BYOK)`
**Summary**: `Automatically detects and answers Google Forms questions using Gemini or Groq AI.`

**Description**:
```text
🚀 AI Filler for Google Forms - Bring Your Own Key (BYOK) Edition

Tired of manually filling out repetitive Google Forms? Let Google Gemini AI or Groq AI do the work for you with complete privacy and zero server middlemen!

AI Filler for Google Forms is a powerful, 100% serverless Chrome extension that detects questions on any Google Form and populates accurate answers directly using your personal Gemini or Groq API key.

✨ Key Features:
• 🤖 Direct AI Providers: Direct HTTPS connection from your browser to Google AI Studio or Groq Cloud. No middleman servers!
• ⚡ Instant Auto-Fill: Answer complex forms in seconds with a single click.
• 🔒 Safe & Private: Your API key is stored locally in your browser storage. Questions travel straight to the provider.
• 🧠 Smart PII Protection: Automatically skips personal info fields (Name, Email, Student ID) so you stay in control.
• ✅ Supports All Question Types:
    - Multiple Choice (Radio Buttons)
    - Checkboxes (Multiple Selections)
    - Dropdown Menus
    - Short & Long Text Answers
• ⚙️ Multiple Providers & Models:
    - Google Gemini (Gemini 2.5 Flash, Gemini 3.5 Flash)
    - Groq (openai/gpt-oss-120b, openai/gpt-oss-20b, qwen/qwen3.8-27b, groq/compound, etc.)
• 👆 Draggable Widget: Move the floating widget anywhere on your screen.

How to Use:
1. Open any Google Form.
2. Click the floating 'Auto Fill' button.
3. If it's your first time, enter your free Gemini or Groq API key.
4. Watch the answers fill in automatically!
5. Review and submit.
```

**Category**: `Productivity` or `Developer Tools`
**Language**: `English`

---

## Privacy Practices (CWS Developer Dashboard)

### Host Permission Justification
*For `https://generativelanguage.googleapis.com/*` and `https://api.groq.com/*`:*
```text
The extension connects directly to Google's official Gemini API (https://generativelanguage.googleapis.com) and Groq's official API (https://api.groq.com) to generate answers for Google Form questions using the user's personal API keys. No intermediary servers are used.
```

### Storage Permission Justification
*For `storage`:*
```text
The storage permission is required to locally store and sync the user's API key and model preferences securely across their browser sessions.
```

### Remote Code Justification
*Select "No, I am not using remote code":*
```text
The extension does not execute any remote code. All logic, DOM parsing, and UI elements are bundled locally within the extension package. The network connection is solely for standard REST JSON payloads sent to Google's Gemini API and Groq API.
```

### Data Collection (Privacy Tab)
*Select:*
* [x] **Website content** (Text, images, sounds, videos, or hyperlinks)

*Justification:*
```text
The extension reads the text of questions on the active Google Form to send them to the user's configured AI provider (Google Gemini or Groq) for answer generation.
```
