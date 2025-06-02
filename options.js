document.addEventListener("DOMContentLoaded", function () {
  const ELEMENTS = {
    form: document.getElementById("settingsForm"),
    apiKeyInput: document.getElementById("apiKey"),
    modelSelect: document.getElementById("modelSelect"),
    loadModelsBtn: document.getElementById("loadModelsBtn"),
    status: document.getElementById("status"),
    loadingSpinner: document.getElementById("loadingSpinner"),
  };

  const API_CONFIG = {
    keyPrefix: "AIza",
    minLength: 30,
    modelsEndpoint: "https://generativelanguage.googleapis.com/v1beta/models",
    testEndpoint:
      "https://generativelanguage.googleapis.com/v1beta/{model}:generateContent",
    storageKeys: {
      apiKey: "ai-review-api-key",
      selectedModel: "ai-review-selected-model",
    },
  };

  const STATUS_TYPES = {
    ERROR: "error",
    SUCCESS: "success",
    INFO: "info",
  };

  const DEFAULT_MODELS = [
    {
      name: "models/gemini-2.5-pro-exp-03-25",
      displayName: "Gemini 2.5 Pro Exp (Recommended)",
      description:
        "Latest experimental version with enhanced code understanding",
    },
    {
      name: "models/gemini-1.5-pro-latest",
      displayName: "Gemini 1.5 Pro Latest",
      description: "Stable version with excellent code analysis",
    },
    {
      name: "models/gemini-1.5-flash-latest",
      displayName: "Gemini 1.5 Flash Latest",
      description: "Faster responses, good for quick reviews",
    },
  ];

  function init() {
    loadSettings();
    setupEventListeners();
    createTestButton();
    populateDefaultModels();
  }

  function setupEventListeners() {
    ELEMENTS.form.addEventListener("submit", handleFormSubmit);
    ELEMENTS.loadModelsBtn.addEventListener("click", handleLoadModels);
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    saveSettings();
  }

  function handleLoadModels() {
    const apiKey = ELEMENTS.apiKeyInput.value.trim();

    if (!validateApiKey(apiKey)) {
      return;
    }

    loadAvailableModels(apiKey);
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
    chrome.storage.sync.get(["apiKey", "selectedModel"], function (result) {
      if (!chrome.runtime.lastError) {
        if (result.apiKey) {
          ELEMENTS.apiKeyInput.value = result.apiKey;
        }
        if (result.selectedModel) {
          setSelectedModel(result.selectedModel);
        }
      }

      if (!result.apiKey) {
        loadFromLocalStorage();
      }
    });
  }

  function loadFromLocalStorage() {
    const localKey = localStorage.getItem(API_CONFIG.storageKeys.apiKey);
    const localModel = localStorage.getItem(
      API_CONFIG.storageKeys.selectedModel
    );

    if (localKey) {
      ELEMENTS.apiKeyInput.value = localKey;
    }
    if (localModel) {
      setSelectedModel(localModel);
    }
  }

  function setSelectedModel(modelName) {
    setTimeout(() => {
      if (ELEMENTS.modelSelect.querySelector(`option[value="${modelName}"]`)) {
        ELEMENTS.modelSelect.value = modelName;
      }
    }, 100);
  }

  function loadAvailableModels(apiKey) {
    showLoadingSpinner(true);
    ELEMENTS.loadModelsBtn.disabled = true;
    ELEMENTS.loadModelsBtn.textContent = "🔄 Loading...";

    showStatus("Loading available models from Google AI...", STATUS_TYPES.INFO);

    fetch(`${API_CONFIG.modelsEndpoint}?key=${apiKey}&pageSize=100`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.models && Array.isArray(data.models)) {
          const processedModels = processModelsFromAPI(data.models);
          populateModelDropdown(processedModels);
          showStatus(
            `✅ Successfully loaded ${processedModels.length} models!`,
            STATUS_TYPES.SUCCESS
          );
        } else {
          throw new Error("Invalid response format from API");
        }
      })
      .catch((error) => {
        showStatus(
          `❌ Failed to load models: ${error.message}`,
          STATUS_TYPES.ERROR
        );
        populateDefaultModels();
      })
      .finally(() => {
        showLoadingSpinner(false);
        ELEMENTS.loadModelsBtn.disabled = false;
        ELEMENTS.loadModelsBtn.textContent = "🔄 Load Available Models";
      });
  }

  function processModelsFromAPI(models) {
    // Filter and process models for code review
    const codeReviewModels = models
      .filter((model) => {
        const name = model.name.toLowerCase();
        return (
          name.includes("gemini") &&
          !name.includes("vision") &&
          model.supportedGenerationMethods?.includes("generateContent")
        );
      })
      .map((model) => {
        // Model name already includes "models/" prefix from API
        const modelNameWithoutPrefix = model.name.replace("models/", "");
        return {
          name: model.name, // Keep full name with "models/" prefix for API calls
          displayName: formatDisplayName(modelNameWithoutPrefix),
          description: generateDescription(modelNameWithoutPrefix),
        };
      })
      .sort((a, b) => {
        // Prioritize models: 2.5 Pro > 1.5 Pro > 1.5 Flash > others
        const getPriority = (name) => {
          const lowerName = name.toLowerCase();
          if (lowerName.includes("2.5") && lowerName.includes("pro")) return 1;
          if (lowerName.includes("1.5") && lowerName.includes("pro")) return 2;
          if (lowerName.includes("1.5") && lowerName.includes("flash"))
            return 3;
          if (lowerName.includes("1.0") && lowerName.includes("pro")) return 4;
          return 5;
        };
        return getPriority(a.name) - getPriority(b.name);
      });

    return codeReviewModels;
  }

  function formatDisplayName(modelName) {
    // Convert model name to readable display name
    let displayName = modelName
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .replace(/(\d+)\.(\d+)/, "$1.$2")
      .replace(/Pro/g, "Pro")
      .replace(/Flash/g, "Flash")
      .replace(/Preview/g, "Preview")
      .replace(/Exp/g, "Experimental");

    // Add recommended tag for best models
    if (
      modelName.includes("2.5") &&
      (modelName.includes("pro") || modelName.includes("exp"))
    ) {
      displayName += " (Recommended)";
    }

    return displayName;
  }

  function generateDescription(modelName) {
    const lowerName = modelName.toLowerCase();

    if (
      lowerName.includes("2.5") &&
      (lowerName.includes("pro") || lowerName.includes("exp"))
    ) {
      return "Latest generation with enhanced code understanding and analysis";
    } else if (lowerName.includes("1.5") && lowerName.includes("pro")) {
      return "Excellent balance of quality and performance for code reviews";
    } else if (lowerName.includes("1.5") && lowerName.includes("flash")) {
      return "Faster responses, good for quick code reviews and suggestions";
    } else if (lowerName.includes("1.0") && lowerName.includes("pro")) {
      return "Stable version with solid code analysis capabilities";
    } else if (
      lowerName.includes("exp") ||
      lowerName.includes("experimental")
    ) {
      return "Experimental version with cutting-edge features";
    } else if (lowerName.includes("preview")) {
      return "Preview version with latest improvements";
    } else {
      return "AI model for code analysis and review";
    }
  }

  function populateDefaultModels() {
    populateModelDropdown(DEFAULT_MODELS);
  }

  function populateModelDropdown(models) {
    const currentValue = ELEMENTS.modelSelect.value;

    // Clear existing options except the first placeholder
    ELEMENTS.modelSelect.innerHTML =
      '<option value="">Select a model...</option>';

    models.forEach((model, index) => {
      const option = document.createElement("option");
      option.value = model.name; // This already includes "models/" prefix
      option.textContent = model.displayName;

      if (model.description) {
        option.title = model.description;
      }

      ELEMENTS.modelSelect.appendChild(option);
    });

    // Restore previous selection or select the first recommended model
    if (
      currentValue &&
      ELEMENTS.modelSelect.querySelector(`option[value="${currentValue}"]`)
    ) {
      ELEMENTS.modelSelect.value = currentValue;
    } else if (models.length > 0) {
      // Auto-select first recommended model
      const recommendedModel = models.find((m) =>
        m.displayName.includes("Recommended")
      );
      if (recommendedModel) {
        ELEMENTS.modelSelect.value = recommendedModel.name;
      } else {
        ELEMENTS.modelSelect.value = models[0].name;
      }
    }
  }

  function showLoadingSpinner(show) {
    if (ELEMENTS.loadingSpinner) {
      ELEMENTS.loadingSpinner.style.display = show ? "inline-block" : "none";
    }
  }

  function saveSettings() {
    const apiKey = ELEMENTS.apiKeyInput.value.trim();
    const selectedModel = ELEMENTS.modelSelect.value;

    if (!validateApiKey(apiKey)) {
      return;
    }

    if (!selectedModel) {
      showStatus("Please select a model", STATUS_TYPES.ERROR);
      return;
    }

    const savePromises = [];

    if (hasChromeStorage()) {
      savePromises.push(saveToChromeStorage(apiKey, selectedModel));
    }

    localStorage.setItem(API_CONFIG.storageKeys.apiKey, apiKey);
    localStorage.setItem(API_CONFIG.storageKeys.selectedModel, selectedModel);

    Promise.all(savePromises).then(() => {
      showStatus(
        "Settings saved successfully! You can now use the extension on GitHub PR pages.",
        STATUS_TYPES.SUCCESS
      );
    });
  }

  function validateApiKey(apiKey, showError = true) {
    if (!apiKey) {
      if (showError)
        showStatus("Please enter your API key", STATUS_TYPES.ERROR);
      return false;
    }

    if (
      !apiKey.startsWith(API_CONFIG.keyPrefix) ||
      apiKey.length < API_CONFIG.minLength
    ) {
      if (showError)
        showStatus(
          "Invalid API key format. Please check your key.",
          STATUS_TYPES.ERROR
        );
      return false;
    }

    return true;
  }

  function saveToChromeStorage(apiKey, selectedModel) {
    return new Promise((resolve) => {
      chrome.storage.sync.set(
        {
          apiKey: apiKey,
          selectedModel: selectedModel,
        },
        function () {
          if (chrome.runtime.lastError) {
            console.warn("Chrome storage failed");
          }
          resolve();
        }
      );
    });
  }

  function showStatus(message, type) {
    ELEMENTS.status.textContent = message;
    ELEMENTS.status.className = `status ${type}`;
    ELEMENTS.status.style.display = "block";

    if (type !== STATUS_TYPES.INFO) {
      setTimeout(() => {
        ELEMENTS.status.style.display = "none";
      }, 5000);
    }
  }

  function createTestButton() {
    const testBtn = document.createElement("button");

    Object.assign(testBtn, {
      type: "button",
      textContent: "🧪 Test API Key & Model",
      className: "test-btn",
    });

    testBtn.addEventListener("click", testApiKeyAndModel);
    ELEMENTS.form.appendChild(testBtn);
  }

  function testApiKeyAndModel() {
    const apiKey = ELEMENTS.apiKeyInput.value.trim();
    const selectedModel = ELEMENTS.modelSelect.value;

    if (!apiKey) {
      showStatus("Please enter an API key first", STATUS_TYPES.ERROR);
      return;
    }

    if (!selectedModel) {
      showStatus("Please select a model first", STATUS_TYPES.ERROR);
      return;
    }

    showStatus("Testing API key and model...", STATUS_TYPES.INFO);

    const requestBody = {
      contents: [
        {
          parts: [{ text: "Hello, please respond with 'API test successful'" }],
        },
      ],
    };

    // Use the model name directly (already includes "models/" prefix)
    const endpoint = API_CONFIG.testEndpoint.replace("{model}", selectedModel);

    fetch(`${endpoint}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    })
      .then(handleTestResponse)
      .catch(handleTestError);
  }

  function handleTestResponse(response) {
    if (response.ok) {
      showStatus(
        "✅ API key and model are working correctly!",
        STATUS_TYPES.SUCCESS
      );
    } else {
      response
        .text()
        .then((errorText) => {
          const errorMessage = getErrorMessage(response.status, errorText);
          showStatus(errorMessage, STATUS_TYPES.ERROR);
        })
        .catch(() => {
          const errorMessage = getErrorMessage(
            response.status,
            "Unable to read error details"
          );
          showStatus(errorMessage, STATUS_TYPES.ERROR);
        });
    }
  }

  function parseErrorDetails(errorText) {
    try {
      const errorData = JSON.parse(errorText);

      if (errorData.error) {
        const error = errorData.error;

        if (error.message) {
          return error.message;
        }

        if (error.details && error.details.length > 0) {
          return (
            error.details[0].reason ||
            error.details[0].message ||
            "Unknown error"
          );
        }

        return error.code || error.status || "Unknown API error";
      }

      return errorText || "Unknown error occurred";
    } catch (error) {
      console.warn("Error parsing error details:", error);
      return "Unknown error occurred while parsing error details";
    }
  }

  function getErrorMessage(status, errorText) {
    const baseMessage = `❌ Test failed (${status}):`;

    switch (status) {
      case 400:
        return `${baseMessage} Invalid request. Please check your API key and model selection.`;

      case 401:
        return `${baseMessage} Invalid API key. Please verify your Gemini API key is correct.`;

      case 403:
        return `${baseMessage} Access forbidden. Your API key may not have permission for this model.`;

      case 404:
        return `${baseMessage} Model not found. Please check if the selected model is available.`;

      case 429:
        return `${baseMessage} Rate limit exceeded. Please wait a moment and try again.`;

      case 500:
        return `${baseMessage} Server error. Google's API is experiencing issues. Please try again later.`;

      case 502:
      case 503:
      case 504:
        return `${baseMessage} Service unavailable. Google's API is temporarily down. Please try again later.`;

      default: {
        const detailedError = parseErrorDetails(errorText);
        return `${baseMessage} ${detailedError}`;
      }
    }
  }

  function handleTestError(error) {
    showStatus("❌ Test failed: " + error.message, STATUS_TYPES.ERROR);
  }

  init();
});
