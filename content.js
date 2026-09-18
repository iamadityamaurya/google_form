// AI Filler for Google Forms - Direct Client-Side Multi-Provider BYOK (Gemini & Groq)

const PROVIDER_MODELS = {
  gemini: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recommended)' },
    { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' }
  ],
  groq: [
    { value: 'openai/gpt-oss-120b', label: 'openai/gpt-oss-120b (Recommended)' },
    { value: 'openai/gpt-oss-20b', label: 'openai/gpt-oss-20b' },
    { value: 'qwen/qwen3.8-27b', label: 'qwen/qwen3.8-27b' },
    { value: 'groq/compound', label: 'groq/compound' },
    { value: 'groq/compound-mini', label: 'groq/compound-mini' },
    { value: 'allam-2-7b', label: 'allam-2-7b' },
    { value: 'meta-llama/llama-prompt-guard-2-86m', label: 'meta-llama/llama-prompt-guard-2-86m' },
    { value: 'meta-llama/llama-prompt-guard-2-22m', label: 'meta-llama/llama-prompt-guard-2-22m' },
    { value: 'openai/gpt-oss-safeguard-20b', label: 'openai/gpt-oss-safeguard-20b' }
  ]
};

const PROVIDER_CONFIG = {
  gemini: {
    label: 'Google Gemini API Key',
    placeholder: 'AIzaSy...',
    keyLink: 'https://aistudio.google.com/app/apikey',
    defaultModel: 'gemini-2.5-flash'
  },
  groq: {
    label: 'Groq API Key',
    placeholder: 'gsk_...',
    keyLink: 'https://console.groq.com/keys',
    defaultModel: 'openai/gpt-oss-120b'
  }
};

// Helper: Retrieve settings from Chrome Storage
function getExtensionSettings() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const storageArea = chrome.storage.sync || chrome.storage.local;
      storageArea.get(['aiProvider', 'geminiApiKey', 'geminiModel', 'groqApiKey', 'groqModel'], (result) => {
        resolve(result || {});
      });
    } else {
      resolve({
        aiProvider: localStorage.getItem('aiProvider') || 'gemini',
        geminiApiKey: localStorage.getItem('geminiApiKey') || '',
        geminiModel: localStorage.getItem('geminiModel') || 'gemini-2.5-flash',
        groqApiKey: localStorage.getItem('groqApiKey') || '',
        groqModel: localStorage.getItem('groqModel') || 'openai/gpt-oss-120b'
      });
    }
  });
}

// Helper: Save settings to Chrome Storage
function saveExtensionSettings(settings) {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const storageArea = chrome.storage.sync || chrome.storage.local;
      storageArea.set(settings, () => {
        if (chrome.storage.local) {
          chrome.storage.local.set(settings, resolve);
        } else {
          resolve();
        }
      });
    } else {
      for (const [k, v] of Object.entries(settings)) {
        localStorage.setItem(k, v || '');
      }
      resolve();
    }
  });
}

// Extract all form questions from Google Forms DOM
function findAllQuestions() {
  const questions = [];
  const allContainers = Array.from(
    document.querySelectorAll('div[role="listitem"], .freebirdFormviewerComponentsQuestionContainer, .freebirdFormviewerComponentsQuestionBaseRoot')
  );
  const seen = new Set();

  for (const container of allContainers) {
    if (seen.has(container)) continue;
    seen.add(container);

    // Question heading
    const qTextEl =
      container.querySelector('div[role="heading"], .freebirdFormviewerComponentsQuestionBaseTitle') ||
      container.querySelector('h2, h3');
    const question = qTextEl ? (qTextEl.innerText || '').trim() : '';

    if (!question) continue;

    // Question ID
    let qid = null;
    if (qTextEl && qTextEl.id) {
      qid = qTextEl.id.trim();
    } else if (container.id) {
      qid = container.id.trim();
    } else {
      const insideInput = container.querySelector('input[name]');
      if (insideInput && insideInput.name) qid = insideInput.name.trim();
    }

    if (!qid) continue;

    // Detect question type
    const radioInputs = container.querySelectorAll('input[type="radio"]');
    const checkboxInputs = container.querySelectorAll('input[type="checkbox"]');
    const textInputs = container.querySelectorAll('input[type="text"], textarea');
    const selectInputs = container.querySelectorAll('select');
    const divRadios = container.querySelectorAll('div[role="radio"]');
    const divCheckboxes = container.querySelectorAll('div[role="checkbox"]');

    let type = 'unknown';
    let options = [];

    // Multiple choice (radio buttons)
    if (radioInputs.length > 0 || divRadios.length > 0) {
      type = 'multiple_choice';
      const optionEls = Array.from(divRadios.length > 0 ? divRadios : radioInputs);
      options = optionEls.map(el => {
        if (el.getAttribute && el.getAttribute('role') === 'radio') {
          return el.getAttribute('aria-label') || el.getAttribute('data-value') || el.innerText || '';
        }
        return getRadioLabel(el, container);
      }).map(t => t.trim()).filter(Boolean);
    }
    // Checkboxes
    else if (checkboxInputs.length > 0 || divCheckboxes.length > 0) {
      type = 'checkbox';
      const optionEls = Array.from(divCheckboxes.length > 0 ? divCheckboxes : checkboxInputs);
      options = optionEls.map(el => {
        if (el.getAttribute && el.getAttribute('role') === 'checkbox') {
          return el.getAttribute('aria-label') || el.getAttribute('data-value') || el.innerText || '';
        }
        return getRadioLabel(el, container);
      }).map(t => t.trim()).filter(Boolean);
    }
    // Dropdown
    else if (selectInputs.length > 0) {
      type = 'dropdown';
      const select = selectInputs[0];
      options = Array.from(select.options).map(opt => opt.text.trim()).filter(Boolean);
    }
    // Text input
    else if (textInputs.length > 0) {
      type = 'text';
      options = [];
    }

    if (type !== 'unknown') {
      questions.push({ id: qid, question, type, options });
    }
  }

  return questions;
}

function normalizeText(s) {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\d ]+/g, '').trim();
}

function buildPromptInstructions(questions) {
  return `You are an expert automated form-filling assistant.
Analyze the following Google Form questions and provide the most accurate, appropriate answers.

CRITICAL INSTRUCTIONS:
1. For 'multiple_choice': Pick the single best matching option from the provided "options" list.
2. For 'checkbox': Return a JSON array of the best matching option strings from the provided "options" list.
3. For 'dropdown': Pick the single best matching option string from the "options" list.
4. For 'text': Provide a concise, accurate, and relevant answer.
5. PERSONAL IDENTIFIABLE INFORMATION (PII): If a question asks for personal or unique identity info (e.g., full name, first name, last name, personal email, student ID, roll number, phone number, physical address, signature, photo upload), return an empty string "" so the user can fill it manually.
6. Return a valid JSON object strictly matching this schema:
{
  "results": [
    {
      "questionId": "string (the exact id passed in)",
      "questionType": "multiple_choice | checkbox | dropdown | text",
      "answer": "string or array of strings (for checkbox)"
    }
  ]
}

Questions to answer:
${JSON.stringify(questions, null, 2)}`;
}

// Generate Answers directly via Google Gemini API
async function queryGeminiDirectly(questions, apiKey, model = 'gemini-2.5-flash') {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const promptText = buildPromptInstructions(questions);

  const requestBody = {
    contents: [
      {
        parts: [
          { text: promptText }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.error?.message || `Gemini API Error (HTTP ${response.status})`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const rawContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawContent) {
    throw new Error('No content returned by Gemini AI.');
  }

  return JSON.parse(rawContent);
}

// Generate Answers directly via Groq API
async function queryGroqDirectly(questions, apiKey, model = 'openai/gpt-oss-120b') {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const promptText = buildPromptInstructions(questions);

  const requestBody = {
    model: model,
    messages: [
      {
        role: 'system',
        content: 'You are an AI assistant that answers Google Form questions. You MUST reply ONLY with valid JSON matching the requested schema.'
      },
      {
        role: 'user',
        content: promptText
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.error?.message || `Groq API Error (HTTP ${response.status})`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const rawContent = data?.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error('No content returned by Groq AI.');
  }

  return JSON.parse(rawContent);
}

// Unified Query Handler
async function queryAiDirectly(questions, provider, apiKey, model) {
  if (provider === 'groq') {
    return queryGroqDirectly(questions, apiKey, model || 'openai/gpt-oss-120b');
  }
  return queryGeminiDirectly(questions, apiKey, model || 'gemini-2.5-flash');
}

// Fill detected answer into the Google Form DOM
function fillAnswerForQuestion(questionId, answer, questionType) {
  if (!questionId || answer === undefined || answer === null || answer === '') {
    return false;
  }

  // Find heading
  const heading = document.getElementById(questionId);
  if (!heading) return false;

  // Find container
  const container = heading.closest('div[role="listitem"]') ||
    heading.closest('.freebirdFormviewerComponentsQuestionContainer') ||
    heading.closest('.freebirdFormviewerComponentsQuestionBaseRoot') ||
    heading.closest('div');

  if (!container) return false;

  // Text inputs
  if (questionType === 'text') {
    const textInputs = container.querySelectorAll('input[type="text"], textarea');
    if (textInputs.length > 0) {
      const input = textInputs[0];
      input.value = String(answer);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }

  // Dropdown
  if (questionType === 'dropdown') {
    const normalizedAnswer = normalizeText(String(answer));
    const selects = container.querySelectorAll('select');
    if (selects.length > 0) {
      const select = selects[0];
      for (let i = 0; i < select.options.length; i++) {
        const optText = normalizeText(select.options[i].text);
        if (optText === normalizedAnswer ||
          optText.includes(normalizedAnswer) ||
          normalizedAnswer.includes(optText)) {
          select.selectedIndex = i;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
    }
    return false;
  }

  // Checkboxes
  if (questionType === 'checkbox') {
    const answers = Array.isArray(answer) ? answer : [answer];
    const checkboxInputs = Array.from(container.querySelectorAll('input[type="checkbox"]'));
    const divCheckboxes = Array.from(container.querySelectorAll('div[role="checkbox"]'));
    let filled = false;

    for (const ans of answers) {
      const normAns = normalizeText(String(ans));
      if (!normAns) continue;

      for (const checkbox of checkboxInputs) {
        const label = getRadioLabel(checkbox, container);
        const normalizedLabel = normalizeText(label);
        if (normalizedLabel === normAns ||
          normalizedLabel.includes(normAns) ||
          normAns.includes(normalizedLabel)) {
          checkbox.checked = true;
          checkbox.click();
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
          filled = true;
        }
      }

      for (const div of divCheckboxes) {
        const label = div.getAttribute('aria-label') || div.getAttribute('data-value') || div.innerText || '';
        const normalizedLabel = normalizeText(label);
        if (label && (normalizedLabel === normAns ||
          normalizedLabel.includes(normAns) ||
          normAns.includes(normalizedLabel))) {
          div.click();
          div.dispatchEvent(new Event('click', { bubbles: true }));
          filled = true;
        }
      }
    }
    return filled;
  }

  // Multiple choice (radio buttons)
  const normalizedAnswer = normalizeText(String(answer));
  const radioInputs = Array.from(container.querySelectorAll('input[type="radio"]'));
  const divRadios = Array.from(container.querySelectorAll('div[role="radio"]'));

  for (const radio of radioInputs) {
    const label = getRadioLabel(radio, container);
    const normalizedLabel = normalizeText(label);

    if (normalizedLabel === normalizedAnswer ||
      normalizedLabel.includes(normalizedAnswer) ||
      normalizedAnswer.includes(normalizedLabel)) {

      radio.checked = true;
      radio.click();
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      radio.dispatchEvent(new Event('input', { bubbles: true }));

      const parent = radio.closest('div[role="radio"]') || radio.parentElement;
      if (parent) parent.click();

      return true;
    }
  }

  for (const div of divRadios) {
    const label = div.getAttribute('aria-label') || div.getAttribute('data-value') || div.innerText || '';
    const normalizedLabel = normalizeText(label);

    if (label && (normalizedLabel === normalizedAnswer ||
      normalizedLabel.includes(normalizedAnswer) ||
      normalizedAnswer.includes(normalizedLabel))) {

      div.click();
      div.dispatchEvent(new Event('click', { bubbles: true }));
      return true;
    }
  }

  return false;
}

function getRadioLabel(radioInput, container) {
  if (radioInput.id) {
    const label = container.querySelector(`label[for="${radioInput.id}"]`);
    if (label && label.innerText) return label.innerText.trim();
  }
  const parent = radioInput.closest('div[role="radio"], .exportLabel') || radioInput.parentElement;
  return parent?.innerText?.trim() || '';
}

// In-Page Settings Modal (Supports both Gemini and Groq)
function showSettingsModal(onSavedCallback) {
  let modalOverlay = document.getElementById('gf-settings-modal-overlay');
  if (modalOverlay) {
    modalOverlay.remove();
  }

  modalOverlay = document.createElement('div');
  modalOverlay.id = 'gf-settings-modal-overlay';
  modalOverlay.innerHTML = `
    <div class="gf-modal-card">
      <div class="gf-modal-header">
        <div class="gf-modal-title-row">
          <div class="gf-modal-logo">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L9.19 8.63L2 12L9.19 15.37L12 22L14.81 15.37L22 12L14.81 8.63L12 2Z"/>
            </svg>
          </div>
          <div>
            <h3 class="gf-modal-title">AI Filler Settings</h3>
            <p class="gf-modal-subtitle">Bring Your Own API Key (BYOK)</p>
          </div>
        </div>
        <button type="button" class="gf-modal-close" id="gf-modal-close-btn">&times;</button>
      </div>

      <div class="gf-modal-body">
        <div class="gf-modal-field">
          <label for="gf-modal-provider">AI Provider</label>
          <select id="gf-modal-provider" class="gf-modal-select">
            <option value="gemini">Google Gemini</option>
            <option value="groq">Groq (Ultra Fast Inference)</option>
          </select>
        </div>

        <div class="gf-modal-field">
          <div class="gf-modal-label-row">
            <label id="gf-modal-key-label" for="gf-modal-key">API Key</label>
            <a id="gf-modal-key-link" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" class="gf-modal-link">
              Get Free Key &rarr;
            </a>
          </div>
          <input type="password" id="gf-modal-key" placeholder="AIzaSy..." class="gf-modal-input" />
          <p class="gf-modal-hint">Key is saved securely inside your browser.</p>
        </div>

        <div class="gf-modal-field">
          <label for="gf-modal-model">Model</label>
          <select id="gf-modal-model" class="gf-modal-select">
          </select>
        </div>

        <div id="gf-modal-status" class="gf-modal-status-msg hidden"></div>
      </div>

      <div class="gf-modal-footer">
        <button type="button" id="gf-modal-cancel" class="gf-modal-btn gf-btn-cancel">Cancel</button>
        <button type="button" id="gf-modal-save" class="gf-modal-btn gf-btn-save">Save & Continue</button>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  const providerSelect = document.getElementById('gf-modal-provider');
  const keyLabel = document.getElementById('gf-modal-key-label');
  const keyLink = document.getElementById('gf-modal-key-link');
  const keyInput = document.getElementById('gf-modal-key');
  const modelSelect = document.getElementById('gf-modal-model');

  function renderProviderFields(provider, currentKey = '', currentModel = '') {
    const config = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.gemini;
    keyLabel.textContent = config.label;
    keyInput.placeholder = config.placeholder;
    keyLink.href = config.keyLink;
    keyInput.value = currentKey;

    modelSelect.innerHTML = '';
    const models = PROVIDER_MODELS[provider] || PROVIDER_MODELS.gemini;
    for (const m of models) {
      const opt = document.createElement('option');
      opt.value = m.value;
      opt.textContent = m.label;
      modelSelect.appendChild(opt);
    }

    if (currentModel && models.some(m => m.value === currentModel)) {
      modelSelect.value = currentModel;
    } else {
      modelSelect.value = config.defaultModel;
    }
  }

  // Populate from current settings
  getExtensionSettings().then(settings => {
    const provider = settings.aiProvider || 'gemini';
    providerSelect.value = provider;
    const key = provider === 'groq' ? (settings.groqApiKey || '') : (settings.geminiApiKey || '');
    const model = provider === 'groq' ? (settings.groqModel || '') : (settings.geminiModel || '');
    renderProviderFields(provider, key, model);
  });

  providerSelect.addEventListener('change', async () => {
    const provider = providerSelect.value;
    const settings = await getExtensionSettings();
    const key = provider === 'groq' ? (settings.groqApiKey || '') : (settings.geminiApiKey || '');
    const model = provider === 'groq' ? (settings.groqModel || '') : (settings.geminiModel || '');
    renderProviderFields(provider, key, model);
  });

  const close = () => modalOverlay.remove();
  document.getElementById('gf-modal-close-btn').addEventListener('click', close);
  document.getElementById('gf-modal-cancel').addEventListener('click', close);

  document.getElementById('gf-modal-save').addEventListener('click', async () => {
    const provider = providerSelect.value;
    const key = keyInput.value.trim();
    const model = modelSelect.value;
    const statusEl = document.getElementById('gf-modal-status');

    if (!key) {
      statusEl.textContent = `Please enter a valid ${provider.toUpperCase()} API key.`;
      statusEl.className = 'gf-modal-status-msg error';
      return;
    }

    statusEl.textContent = 'Saving...';
    statusEl.className = 'gf-modal-status-msg';

    const payload = { aiProvider: provider };
    if (provider === 'groq') {
      payload.groqApiKey = key;
      payload.groqModel = model;
    } else {
      payload.geminiApiKey = key;
      payload.geminiModel = model;
    }

    await saveExtensionSettings(payload);
    close();
    if (typeof onSavedCallback === 'function') {
      onSavedCallback(provider, key, model);
    }
  });
}

// Injected Floating Widget UI
function createButton() {
  if (document.getElementById('gf-helper-widget')) return;

  // Inject Styles
  const style = document.createElement('style');
  style.textContent = `
    .gf-helper-widget {
      position: fixed;
      right: 30px;
      top: 30px;
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 6px;
      user-select: none;
      touch-action: none;
    }

    .gf-helper-btn {
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
      color: white;
      border: none;
      padding: 12px 22px;
      border-radius: 50px;
      cursor: pointer;
      font-family: 'Google Sans', 'Roboto', -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.45), 0 8px 10px -6px rgba(99, 102, 241, 0.2);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      backdrop-filter: blur(10px);
      letter-spacing: 0.3px;
      overflow: hidden;
      position: relative;
    }

    .gf-helper-btn:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 15px 30px -5px rgba(99, 102, 241, 0.6);
    }

    .gf-helper-btn:active {
      transform: translateY(1px) scale(0.98);
    }

    .gf-helper-btn:disabled {
      opacity: 0.85;
      cursor: not-allowed;
      transform: none;
    }

    .gf-settings-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      transition: all 0.2s ease;
    }

    .gf-settings-btn:hover {
      background: #334155;
      color: #f8fafc;
      transform: rotate(30deg);
    }

    .gf-btn-icon {
      width: 17px;
      height: 17px;
      fill: currentColor;
    }

    .gf-btn-spinner {
      animation: gf-spin 1s linear infinite;
    }

    @keyframes gf-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes gf-pulse-glow {
      0% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.5); }
      70% { box-shadow: 0 0 0 14px rgba(168, 85, 247, 0); }
      100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0); }
    }

    .gf-pulse {
      animation: gf-pulse-glow 2.2s infinite;
    }

    /* Modal Overlay Styles */
    #gf-settings-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(8px);
      z-index: 1000000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .gf-modal-card {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      width: 380px;
      max-width: 90vw;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
      overflow: hidden;
      color: #f8fafc;
      animation: gf-modal-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes gf-modal-in {
      from { opacity: 0; transform: scale(0.95) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .gf-modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .gf-modal-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .gf-modal-logo {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .gf-modal-title {
      font-size: 15px;
      font-weight: 700;
      margin: 0;
    }

    .gf-modal-subtitle {
      font-size: 11px;
      color: #94a3b8;
      margin: 0;
    }

    .gf-modal-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 22px;
      cursor: pointer;
      line-height: 1;
    }

    .gf-modal-close:hover {
      color: #ffffff;
    }

    .gf-modal-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .gf-modal-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .gf-modal-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .gf-modal-field label {
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .gf-modal-link {
      font-size: 11px;
      color: #c084fc;
      text-decoration: none;
      font-weight: 600;
    }

    .gf-modal-link:hover {
      text-decoration: underline;
    }

    .gf-modal-input, .gf-modal-select {
      background: #0b1120;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: #f8fafc;
      font-size: 13px;
      padding: 10px 12px;
      outline: none;
      transition: border-color 0.2s;
    }

    .gf-modal-input:focus, .gf-modal-select:focus {
      border-color: #a855f7;
      box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.2);
    }

    .gf-modal-hint {
      font-size: 11px;
      color: #64748b;
      margin: 0;
    }

    .gf-modal-status-msg {
      font-size: 12px;
      padding: 8px 12px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.05);
      color: #94a3b8;
    }

    .gf-modal-status-msg.error {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .gf-modal-footer {
      padding: 14px 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      background: #090e1a;
    }

    .gf-modal-btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .gf-btn-cancel {
      background: #1e293b;
      color: #94a3b8;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .gf-btn-cancel:hover {
      background: #273549;
      color: #ffffff;
    }

    .gf-btn-save {
      background: linear-gradient(135deg, #6366f1, #a855f7);
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
    }

    .gf-btn-save:hover {
      box-shadow: 0 6px 18px rgba(168, 85, 247, 0.5);
    }
  `;
  document.head.appendChild(style);

  // Widget Container
  const widget = document.createElement('div');
  widget.id = 'gf-helper-widget';
  widget.className = 'gf-helper-widget';

  // Main Action Button
  const btn = document.createElement('button');
  btn.id = 'gf-helper-btn';
  btn.className = 'gf-helper-btn gf-pulse';

  // Settings Gear Button
  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'gf-settings-btn';
  settingsBtn.title = 'AI Filler Settings';
  settingsBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  `;

  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showSettingsModal();
  });

  // Icons
  const icons = {
    sparkle: '<svg class="gf-btn-icon" viewBox="0 0 24 24"><path d="M12 2L9.19 8.63L2 12L9.19 15.37L12 22L14.81 15.37L22 12L14.81 8.63L12 2Z"/></svg>',
    loading: '<svg class="gf-btn-icon gf-btn-spinner" viewBox="0 0 24 24"><path d="M12 4V2C6.48 2 2 6.48 2 12H4C4 7.58 7.58 4 12 4Z"/></svg>',
    success: '<svg class="gf-btn-icon" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12L3.41 13.41L9 16.17L21 4.41L19.59 3L9 13.59L9 16.17Z"/></svg>',
    error: '<svg class="gf-btn-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"/></svg>'
  };

  const updateBtn = (text, iconKey) => {
    btn.textContent = '';
    const iconContainer = document.createElement('div');
    iconContainer.innerHTML = icons[iconKey];
    const iconSvg = iconContainer.firstElementChild;
    if (iconSvg) {
      btn.appendChild(iconSvg);
    }
    const textSpan = document.createElement('span');
    textSpan.textContent = text;
    btn.appendChild(textSpan);
  };

  updateBtn('Auto Fill', 'sparkle');

  // Draggable Logic for the entire Widget
  let isDragging = false;
  let currentX, currentY, initialX, initialY;
  let xOffset = 0, yOffset = 0;

  function dragStart(e) {
    if (e.target === settingsBtn || settingsBtn.contains(e.target)) return;
    if (e.type === "touchstart") {
      initialX = e.touches[0].clientX - xOffset;
      initialY = e.touches[0].clientY - yOffset;
    } else {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
    }

    if (e.target === btn || btn.contains(e.target) || e.target === widget) {
      isDragging = true;
    }
  }

  function dragEnd() {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      if (e.type === "touchmove") {
        currentX = e.touches[0].clientX - initialX;
        currentY = e.touches[0].clientY - initialY;
      } else {
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
      }

      xOffset = currentX;
      yOffset = currentY;
      widget.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
    }
  }

  btn.addEventListener("touchstart", dragStart, false);
  btn.addEventListener("touchend", dragEnd, false);
  btn.addEventListener("touchmove", drag, false);

  btn.addEventListener("mousedown", dragStart, false);
  document.addEventListener("mouseup", dragEnd, false);
  document.addEventListener("mousemove", drag, false);

  // Trigger Fill Flow
  async function triggerAutoFill(provider, apiKey, model) {
    btn.disabled = true;
    btn.classList.remove('gf-pulse');
    updateBtn('Analyzing form...', 'loading');

    const qs = findAllQuestions();
    if (!qs || qs.length === 0) {
      updateBtn('No questions found', 'error');
      setTimeout(() => {
        updateBtn('Auto Fill', 'sparkle');
        btn.disabled = false;
        btn.classList.add('gf-pulse');
      }, 2000);
      return;
    }

    try {
      const providerDisplayName = provider === 'groq' ? 'Groq' : 'Gemini';
      updateBtn(`${providerDisplayName} Thinking...`, 'loading');
      const response = await queryAiDirectly(qs, provider, apiKey, model);

      if (response?.results?.length) {
        let filledCount = 0;
        updateBtn('Filling form...', 'loading');
        await new Promise(r => setTimeout(r, 400));

        for (const result of response.results) {
          const id = result.questionId;
          const ans = result.answer;
          const qType = result.questionType || 'multiple_choice';

          if (id && (ans !== undefined && ans !== null && ans !== '')) {
            const filled = fillAnswerForQuestion(id, ans, qType);
            if (filled) {
              filledCount++;
            }
          }
        }

        updateBtn(`Filled ${filledCount}/${response.results.length}`, 'success');
      } else {
        updateBtn('No answers generated', 'error');
      }
    } catch (error) {
      console.error('[AI Filler] Error answering form:', error);
      updateBtn(error.message?.slice(0, 24) || 'Error filling form', 'error');
    }

    setTimeout(() => {
      btn.disabled = false;
      updateBtn('Auto Fill', 'sparkle');
      btn.classList.add('gf-pulse');
    }, 3500);
  }

  btn.addEventListener('click', async () => {
    const settings = await getExtensionSettings();
    const provider = settings.aiProvider || 'gemini';
    const key = provider === 'groq' ? settings.groqApiKey : settings.geminiApiKey;
    const model = provider === 'groq' ? (settings.groqModel || 'openai/gpt-oss-120b') : (settings.geminiModel || 'gemini-2.5-flash');

    if (!key) {
      showSettingsModal((newProvider, newKey, newModel) => {
        triggerAutoFill(newProvider, newKey, newModel);
      });
      return;
    }

    triggerAutoFill(provider, key, model);
  });

  widget.appendChild(btn);
  widget.appendChild(settingsBtn);
  document.body.appendChild(widget);
}

createButton();
