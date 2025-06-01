document.addEventListener("DOMContentLoaded", function () {
  const ELEMENTS = {
    statusDiv: document.getElementById("status"),
    openOptionsBtn: document.getElementById("openOptions"),
  };

  const STORAGE_KEY = "ai-review-api-key";

  const STATUS_CONFIG = {
    configured: {
      className: "status configured",
      message: "✅ Extension is configured and ready to use!",
    },
    notConfigured: {
      className: "status not-configured",
      message: "❌ Please configure your API key first",
    },
  };

  function init() {
    checkConfiguration();
    setupEventListeners();
  }

  function setupEventListeners() {
    ELEMENTS.openOptionsBtn.addEventListener("click", handleOpenOptions);
  }

  function handleOpenOptions() {
    chrome.runtime.openOptionsPage();
    window.close();
  }

  function checkConfiguration() {
    if (hasChromeStorage()) {
      checkChromeStorage();
    } else {
      checkLocalStorage();
    }
  }

  function hasChromeStorage() {
    return (
      typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync
    );
  }

  function checkChromeStorage() {
    chrome.storage.sync.get(["apiKey"], function (result) {
      if (!chrome.runtime.lastError && result.apiKey) {
        showConfigured();
      } else {
        checkLocalStorage();
      }
    });
  }

  function checkLocalStorage() {
    const localKey = localStorage.getItem(STORAGE_KEY);
    if (localKey) {
      showConfigured();
    } else {
      showNotConfigured();
    }
  }

  function showConfigured() {
    updateStatus(STATUS_CONFIG.configured);
  }

  function showNotConfigured() {
    updateStatus(STATUS_CONFIG.notConfigured);
  }

  function updateStatus(config) {
    ELEMENTS.statusDiv.className = config.className;
    ELEMENTS.statusDiv.textContent = config.message;
  }

  init();
});
