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
    label: 'Gemini API Key',
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

document.addEventListener('DOMContentLoaded', async () => {
  const providerSelect = document.getElementById('providerSelect');
  const apiKeyLabel = document.getElementById('apiKeyLabel');
  const getFreeKeyLink = document.getElementById('getFreeKeyLink');
  const apiKeyInput = document.getElementById('apiKey');
  const toggleKeyVisibilityBtn = document.getElementById('toggleKeyVisibility');
  const modelSelect = document.getElementById('modelSelect');
  const settingsForm = document.getElementById('settingsForm');
  const testBtn = document.getElementById('testBtn');
  const saveBtn = document.getElementById('saveBtn');
  const statusBanner = document.getElementById('statusBanner');
  const statusText = document.getElementById('statusText');
  const toast = document.getElementById('toast');
  const personalInfoList = document.getElementById('personalInfoList');
  const addPersonalInfoBtn = document.getElementById('addPersonalInfoBtn');

  // Load existing settings
  const storage = await getStoredSettings();
  let currentProvider = storage.aiProvider || 'gemini';
  providerSelect.value = currentProvider;

  function updateProviderUI(provider, savedKey = '', savedModel = '') {
    const config = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.gemini;
    apiKeyLabel.textContent = config.label;
    apiKeyInput.placeholder = config.placeholder;
    getFreeKeyLink.href = config.keyLink;

    // Populate Models
    modelSelect.innerHTML = '';
    const models = PROVIDER_MODELS[provider] || PROVIDER_MODELS.gemini;
    for (const m of models) {
      const opt = document.createElement('option');
      opt.value = m.value;
      opt.textContent = m.label;
      modelSelect.appendChild(opt);
    }

    if (savedModel && models.some(m => m.value === savedModel)) {
      modelSelect.value = savedModel;
    } else {
      modelSelect.value = config.defaultModel;
    }

    // Set Key
    apiKeyInput.value = savedKey;

    if (savedKey) {
      updateStatus('ready', `${provider.toUpperCase()} API Key configured & ready`);
    } else if (storage.personalInfo && storage.personalInfo.length > 0) {
      updateStatus('ready', 'Personal Info saved (AI Key optional)');
    } else {
      updateStatus('idle', 'Configure Personal Info or API Key below');
    }
  }

  // Personal Info Row Renderers
  function renderPersonalInfoRows(items = []) {
    personalInfoList.innerHTML = '';
    if (!items || items.length === 0) {
      const emptyHint = document.createElement('div');
      emptyHint.className = 'pi-empty-hint';
      emptyHint.textContent = 'No personal fields added yet. Click "+ Add Field" to add your Name, Email, etc.';
      personalInfoList.appendChild(emptyHint);
      return;
    }

    items.forEach((item, index) => {
      addPersonalInfoRow(item.key || '', item.value || '');
    });
  }

  function addPersonalInfoRow(key = '', value = '') {
    const emptyHint = personalInfoList.querySelector('.pi-empty-hint');
    if (emptyHint) emptyHint.remove();

    const row = document.createElement('div');
    row.className = 'personal-info-row';
    row.innerHTML = `
      <input type="text" class="pi-key" placeholder="Field (e.g. Name)" value="${escapeHtml(key)}" />
      <input type="text" class="pi-value" placeholder="Value (e.g. John Doe)" value="${escapeHtml(value)}" />
      <button type="button" class="pi-delete-btn" title="Remove field">&times;</button>
    `;

    row.querySelector('.pi-delete-btn').addEventListener('click', () => {
      row.remove();
      if (personalInfoList.children.length === 0) {
        renderPersonalInfoRows([]);
      }
    });

    personalInfoList.appendChild(row);
  }

  function getPersonalInfoFromUI() {
    const rows = personalInfoList.querySelectorAll('.personal-info-row');
    const items = [];
    rows.forEach(row => {
      const key = row.querySelector('.pi-key')?.value?.trim() || '';
      const val = row.querySelector('.pi-value')?.value?.trim() || '';
      if (key && val) {
        items.push({ key, value: val });
      }
    });
    return items;
  }

  function escapeHtml(text) {
    return (text || '').replace(/"/g, '&quot;');
  }

  addPersonalInfoBtn.addEventListener('click', () => {
    addPersonalInfoRow('', '');
    const rows = personalInfoList.querySelectorAll('.personal-info-row');
    const lastRow = rows[rows.length - 1];
    if (lastRow) {
      lastRow.querySelector('.pi-key')?.focus();
    }
  });

  // Initial UI Setup
  const initialKey = currentProvider === 'groq' ? (storage.groqApiKey || '') : (storage.geminiApiKey || '');
  const initialModel = currentProvider === 'groq' ? (storage.groqModel || '') : (storage.geminiModel || '');
  updateProviderUI(currentProvider, initialKey, initialModel);
  renderPersonalInfoRows(storage.personalInfo || []);

  // Switch Provider
  providerSelect.addEventListener('change', async () => {
    const provider = providerSelect.value;
    const currentStorage = await getStoredSettings();
    const key = provider === 'groq' ? (currentStorage.groqApiKey || '') : (currentStorage.geminiApiKey || '');
    const model = provider === 'groq' ? (currentStorage.groqModel || '') : (currentStorage.geminiModel || '');
    updateProviderUI(provider, key, model);
  });

  // Toggle key visibility
  toggleKeyVisibilityBtn.addEventListener('click', () => {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    toggleKeyVisibilityBtn.innerHTML = isPassword
      ? `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>`
      : `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>`;
  });

  // Test API Key
  testBtn.addEventListener('click', async () => {
    const provider = providerSelect.value;
    const key = apiKeyInput.value.trim();
    const model = modelSelect.value;

    if (!key) {
      showToast('Please enter an API key first.', 'error');
      apiKeyInput.focus();
      return;
    }

    setLoading(testBtn, true, 'Testing...');
    testBtn.disabled = true;
    saveBtn.disabled = true;

    try {
      let result;
      if (provider === 'groq') {
        result = await testGroqApiKey(key, model);
      } else {
        result = await testGeminiApiKey(key, model);
      }

      if (result.success) {
        showToast('API Key is valid and working!', 'success');
        updateStatus('ready', `${provider.toUpperCase()} API Key verified successfully`);
      } else {
        showToast(result.error || 'API Key validation failed.', 'error');
        updateStatus('error', 'API Key validation failed');
      }
    } catch (err) {
      showToast(err.message || 'Connection error while testing.', 'error');
      updateStatus('error', 'Connection test failed');
    } finally {
      setLoading(testBtn, false, 'Test Key');
      testBtn.disabled = false;
      saveBtn.disabled = false;
    }
  });

  // Save Settings
  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const provider = providerSelect.value;
    const key = apiKeyInput.value.trim();
    const model = modelSelect.value;
    const personalInfo = getPersonalInfoFromUI();

    setLoading(saveBtn, true, 'Saving...');
    testBtn.disabled = true;
    saveBtn.disabled = true;

    try {
      const payload = {
        aiProvider: provider,
        personalInfo: personalInfo
      };

      if (provider === 'groq') {
        payload.groqApiKey = key;
        payload.groqModel = model;
      } else {
        payload.geminiApiKey = key;
        payload.geminiModel = model;
      }

      await saveStoredSettings(payload);
      showToast('Settings & Personal Info saved!', 'success');
      if (key) {
        updateStatus('ready', `${provider.toUpperCase()} API Key saved & active`);
      } else if (personalInfo && personalInfo.length > 0) {
        updateStatus('ready', 'Personal Info saved & active');
      } else {
        updateStatus('idle', 'Settings saved');
      }
    } catch (err) {
      showToast('Failed to save settings.', 'error');
    } finally {
      setLoading(saveBtn, false, 'Save Settings');
      testBtn.disabled = false;
      saveBtn.disabled = false;
    }
  });

  function updateStatus(type, message) {
    statusBanner.className = `status-banner status-${type}`;
    statusText.textContent = message;
  }

  function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    setTimeout(() => {
      toast.className = 'toast hidden';
    }, 3500);
  }

  function setLoading(btn, isLoading, text) {
    const textSpan = btn.querySelector('.btn-text');
    if (textSpan) {
      textSpan.textContent = text;
    }
  }
});

// Storage Helpers
function getStoredSettings() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const storageArea = chrome.storage.sync || chrome.storage.local;
      storageArea.get(['aiProvider', 'geminiApiKey', 'geminiModel', 'groqApiKey', 'groqModel', 'personalInfo'], (result) => {
        resolve(result || {});
      });
    } else {
      let savedPI = [];
      try {
        savedPI = JSON.parse(localStorage.getItem('personalInfo') || '[]');
      } catch (e) {
        savedPI = [];
      }
      resolve({
        aiProvider: localStorage.getItem('aiProvider') || 'gemini',
        geminiApiKey: localStorage.getItem('geminiApiKey') || '',
        geminiModel: localStorage.getItem('geminiModel') || 'gemini-2.5-flash',
        groqApiKey: localStorage.getItem('groqApiKey') || '',
        groqModel: localStorage.getItem('groqModel') || 'openai/gpt-oss-120b',
        personalInfo: savedPI
      });
    }
  });
}

function saveStoredSettings(settings) {
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
        if (typeof v === 'object') {
          localStorage.setItem(k, JSON.stringify(v));
        } else {
          localStorage.setItem(k, v || '');
        }
      }
      resolve();
    }
  });
}

// Test Gemini API Key
async function testGeminiApiKey(apiKey, model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [
      {
        parts: [
          { text: "Ping test. Respond with OK." }
        ]
      }
    ],
    generationConfig: {
      maxOutputTokens: 5,
      temperature: 0.1
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      let errorMsg = data?.error?.message || `Error: HTTP ${response.status}`;
      return { success: false, error: errorMsg };
    }

    if (data?.candidates && data.candidates.length > 0) {
      return { success: true };
    }

    return { success: false, error: 'Unexpected response from Gemini' };
  } catch (err) {
    return { success: false, error: err.message || 'Network request failed' };
  }
}

// Test Groq API Key
async function testGroqApiKey(apiKey, model) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const payload = {
    model: model || 'openai/gpt-oss-120b',
    messages: [
      { role: 'user', content: 'Ping. Reply with OK.' }
    ],
    max_tokens: 5,
    temperature: 0.1
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      let errorMsg = data?.error?.message || `Groq Error: HTTP ${response.status}`;
      return { success: false, error: errorMsg };
    }

    if (data?.choices && data.choices.length > 0) {
      return { success: true };
    }

    return { success: false, error: 'Unexpected response from Groq' };
  } catch (err) {
    return { success: false, error: err.message || 'Network request failed' };
  }
}
