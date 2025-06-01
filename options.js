document.addEventListener("DOMContentLoaded", function () {
  const ELEMENTS = {
    form: document.getElementById("settingsForm"),
    apiKeyInput: document.getElementById("apiKey"),
    status: document.getElementById("status"),
  };

  const API_CONFIG = {
    keyPrefix: "AIza",
    minLength: 30,
    endpoint:
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent",
    storageKey: "ai-review-api-key",
  };

  const STATUS_TYPES = {
    ERROR: "error",
    SUCCESS: "success",
    INFO: "info",
  };

  function init() {
    loadSettings();
    setupEventListeners();
    createTestButton();
  }

  function setupEventListeners() {
    ELEMENTS.form.addEventListener("submit", handleFormSubmit);
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    saveSettings();
  }

  function loadSettings() {
    if (hasChromeStorage()) {
      loadFromChromeStorage();
    } else {
      loadFromLocalStorage();
    }
  }

  function hasChromeStorage() {
    return (
      typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync
    );
  }

  function loadFromChromeStorage() {
    chrome.storage.sync.get(["apiKey"], function (result) {
      if (!chrome.runtime.lastError && result.apiKey) {
        ELEMENTS.apiKeyInput.value = result.apiKey;
      } else {
        loadFromLocalStorage();
      }
    });
  }

  function loadFromLocalStorage() {
    const localKey = localStorage.getItem(API_CONFIG.storageKey);
    if (localKey) {
      ELEMENTS.apiKeyInput.value = localKey;
    }
  }

  function saveSettings() {
    const apiKey = ELEMENTS.apiKeyInput.value.trim();

    if (!validateApiKey(apiKey)) {
      return;
    }

    const savePromises = [];

    if (hasChromeStorage()) {
      savePromises.push(saveToChromeStorage(apiKey));
    }

    localStorage.setItem(API_CONFIG.storageKey, apiKey);

    Promise.all(savePromises).then(() => {
      showStatus(
        "Settings saved successfully! You can now use the extension on GitHub PR pages.",
        STATUS_TYPES.SUCCESS
      );
    });
  }

  function validateApiKey(apiKey) {
    if (!apiKey) {
      showStatus("Please enter your API key", STATUS_TYPES.ERROR);
      return false;
    }

    if (
      !apiKey.startsWith(API_CONFIG.keyPrefix) ||
      apiKey.length < API_CONFIG.minLength
    ) {
      showStatus(
        "Invalid API key format. Please check your key.",
        STATUS_TYPES.ERROR
      );
      return false;
    }

    return true;
  }

  function saveToChromeStorage(apiKey) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ apiKey: apiKey }, function () {
        if (chrome.runtime.lastError) {
          console.warn("Chrome storage failed:", chrome.runtime.lastError);
        }
        resolve();
      });
    });
  }

  function showStatus(message, type) {
    ELEMENTS.status.textContent = message;
    ELEMENTS.status.className = `status ${type}`;
    ELEMENTS.status.style.display = "block";

    setTimeout(() => {
      ELEMENTS.status.style.display = "none";
    }, 5000);
  }

  function createTestButton() {
    const testBtn = document.createElement("button");

    Object.assign(testBtn, {
      type: "button",
      textContent: "🧪 Test API Key",
      className: "save-btn",
    });

    Object.assign(testBtn.style, {
      marginTop: "8px",
      background: "#6f42c1",
    });

    testBtn.addEventListener("click", testApiKey);
    ELEMENTS.form.appendChild(testBtn);
  }

  function testApiKey() {
    const apiKey = ELEMENTS.apiKeyInput.value.trim();

    if (!apiKey) {
      showStatus("Please enter an API key first", STATUS_TYPES.ERROR);
      return;
    }

    showStatus("Testing API key...", STATUS_TYPES.INFO);

    const requestBody = {
      contents: [{ parts: [{ text: "Hello" }] }],
    };

    fetch(`${API_CONFIG.endpoint}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    })
      .then(handleTestResponse)
      .catch(handleTestError);
  }

  function handleTestResponse(response) {
    if (response.ok) {
      showStatus("API key is valid and working!", STATUS_TYPES.SUCCESS);
    } else {
      showStatus(
        "API key test failed. Please check your key.",
        STATUS_TYPES.ERROR
      );
    }
  }

  function handleTestError(error) {
    showStatus("API key test failed: " + error.message, STATUS_TYPES.ERROR);
  }

  init();
});
