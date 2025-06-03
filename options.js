document.addEventListener("DOMContentLoaded", function () {
  const ELEMENTS = {
    // API Config elements
    form: document.getElementById("settingsForm"),
    apiKeyInput: document.getElementById("apiKey"),
    modelSelect: document.getElementById("modelSelect"),
    loadModelsBtn: document.getElementById("loadModelsBtn"),
    status: document.getElementById("status"),
    loadingSpinner: document.getElementById("loadingSpinner"),

    // Coding Standards elements
    codingStandardsForm: document.getElementById("codingStandardsForm"),
    codingStandardsTextarea: document.getElementById("codingStandardsTextarea"),
    charCount: document.getElementById("charCount"),
    clearStandardsBtn: document.getElementById("clearStandardsBtn"),

    // Tab elements
    tabButtons: document.querySelectorAll(".tab-button"),
    tabContents: document.querySelectorAll(".tab-content"),
    templateButtons: document.querySelectorAll(".template-btn"),
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
      codingStandards: "ai-review-coding-standards",
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

  // Coding Standards Templates
  const CODING_STANDARDS_TEMPLATES = {
    javascript: `JAVASCRIPT/REACT CODING STANDARDS:
  
  NAMING CONVENTIONS:
  • Variables: camelCase (e.g., userName, isLoading, apiResponse)
  • Functions: camelCase with verb prefix (e.g., getUserData, handleClick, validateForm)
  • Components: PascalCase (e.g., UserProfile, NavBar, SearchInput)
  • Constants: UPPER_SNAKE_CASE (e.g., API_BASE_URL, MAX_RETRY_COUNT)
  • Files: kebab-case for regular files, PascalCase for components
  
  FUNCTION DECLARATIONS:
  • Use function declarations instead of arrow functions for components
  • Use arrow functions for event handlers and callbacks
  • Keep functions under 20 lines when possible
  • Use descriptive names that explain what the function does
  
  CODE ORGANIZATION:
  • Group related functions together
  • Keep components under 200 lines
  • Use custom hooks for complex logic
  • Separate business logic from UI logic
  • Import order: external libraries → internal modules → relative imports
  
  REACT SPECIFIC:
  • Use functional components with hooks
  • Destructure props at the beginning of components
  • Use PropTypes or TypeScript for type checking
  • Avoid inline styles, use CSS modules or styled-components
  • Use useCallback and useMemo for performance optimization
  
  ERROR HANDLING:
  • Always handle async operations with try-catch
  • Provide user-friendly error messages
  • Log errors for debugging
  • Use error boundaries for React components
  
  TESTING:
  • Write unit tests for all utility functions
  • Test components with React Testing Library
  • Aim for 80%+ code coverage
  • Use descriptive test names`,

    typescript: `TYPESCRIPT CODING STANDARDS:
  
  TYPE DEFINITIONS:
  • Use interfaces for object shapes
  • Use type aliases for unions and primitives
  • Prefer readonly for immutable data
  • Use generic types for reusable components
  • Define strict types, avoid 'any'
  
  NAMING CONVENTIONS:
  • Types/Interfaces: PascalCase (e.g., UserData, ApiResponse)
  • Enums: PascalCase with descriptive names
  • Generic types: Single uppercase letter (T, K, V) or descriptive (TUser)
  
  STRICT MODE:
  • Enable strict mode in tsconfig.json
  • Use strictNullChecks and noImplicitAny
  • Handle null and undefined explicitly
  • Use optional chaining (?.) and nullish coalescing (??)
  
  FUNCTION SIGNATURES:
  • Always specify return types for functions
  • Use readonly for arrays that shouldn't be modified
  • Prefer union types over enums when possible
  • Use const assertions for literal types
  
  ERROR HANDLING:
  • Use Result<T, E> pattern for error handling
  • Define custom error types
  • Use type guards for runtime type checking
  • Validate external data with type guards
  
  IMPORTS/EXPORTS:
  • Use named exports over default exports
  • Group imports by type (types, values, side-effects)
  • Use path mapping for cleaner imports
  • Re-export from index files for public APIs
  
  CODE ORGANIZATION:
  • Separate types into dedicated files
  • Use barrel exports (index.ts files)
  • Keep type definitions close to usage
  • Use utility types (Pick, Omit, Partial) effectively`,

    python: `PYTHON CODING STANDARDS:
  
  NAMING CONVENTIONS:
  • Variables/Functions: snake_case (e.g., user_name, get_user_data)
  • Classes: PascalCase (e.g., UserManager, DataProcessor)
  • Constants: UPPER_SNAKE_CASE (e.g., API_BASE_URL, MAX_RETRIES)
  • Private methods: prefix with underscore (_private_method)
  • Modules: lowercase with underscores
  
  FUNCTION DEFINITIONS:
  • Use type hints for all function parameters and return values
  • Keep functions under 25 lines when possible
  • Use docstrings for all public functions
  • Follow Google or NumPy docstring style
  
  CODE ORGANIZATION:
  • Follow PEP 8 style guide
  • Maximum line length: 88 characters (Black formatter)
  • Use imports in this order: standard library, third-party, local
  • Group related functions in classes or modules
  
  ERROR HANDLING:
  • Use specific exception types
  • Don't catch bare except clauses
  • Use context managers (with statements) for resource management
  • Log exceptions with proper context
  
  DATA STRUCTURES:
  • Use dataclasses for simple data containers
  • Prefer list comprehensions over loops when readable
  • Use generators for large datasets
  • Type hint collections (List[str], Dict[str, int])
  
  TESTING:
  • Use pytest for testing
  • Follow AAA pattern (Arrange, Act, Assert)
  • Use descriptive test function names
  • Mock external dependencies
  
  SECURITY:
  • Validate all user inputs
  • Use parameterized queries for databases
  • Don't hardcode secrets in code
  • Use environment variables for configuration`,

    java: `JAVA CODING STANDARDS:
  
  NAMING CONVENTIONS:
  • Variables/Methods: camelCase (e.g., userName, getUserData)
  • Classes: PascalCase (e.g., UserManager, DataProcessor)
  • Constants: UPPER_SNAKE_CASE (e.g., API_BASE_URL, MAX_RETRIES)
  • Packages: lowercase with dots (com.company.module)
  
  CLASS DESIGN:
  • Keep classes focused on single responsibility
  • Use interfaces to define contracts
  • Prefer composition over inheritance
  • Make fields private and use getters/setters
  • Use builder pattern for complex objects
  
  METHOD DESIGN:
  • Keep methods under 30 lines
  • Use descriptive names that explain behavior
  • Limit parameters to 3-4 maximum
  • Return Optional<T> instead of null
  • Use @Override annotation consistently
  
  CODE ORGANIZATION:
  • Follow Google Java Style Guide
  • Group related methods together
  • Use meaningful package structure
  • Keep public API minimal
  
  ERROR HANDLING:
  • Use checked exceptions for recoverable errors
  • Use unchecked exceptions for programming errors
  • Always close resources with try-with-resources
  • Provide meaningful error messages
  • Log exceptions with proper levels
  
  CONCURRENCY:
  • Use thread-safe collections when needed
  • Prefer immutable objects
  • Use java.util.concurrent utilities
  • Avoid synchronized blocks when possible
  
  TESTING:
  • Use JUnit 5 for unit testing
  • Use Mockito for mocking dependencies
  • Follow Given-When-Then pattern
  • Test both happy path and edge cases
  
  DOCUMENTATION:
  • Use Javadoc for all public methods
  • Include @param and @return tags
  • Document thread safety characteristics
  • Provide usage examples for complex APIs`,

    general: `GENERAL CODING STANDARDS:
  
  NAMING CONVENTIONS:
  • Use descriptive and meaningful names
  • Avoid abbreviations and single-letter variables (except loop counters)
  • Use consistent naming patterns throughout the project
  • Names should explain intent, not implementation
  
  CODE STRUCTURE:
  • Keep functions/methods small and focused (single responsibility)
  • Limit nesting levels (max 3-4 levels deep)
  • Use consistent indentation (spaces or tabs, not mixed)
  • Group related code together
  • Separate concerns into different modules/files
  
  COMMENTS AND DOCUMENTATION:
  • Write self-documenting code with clear names
  • Comment the "why", not the "what"
  • Keep comments up-to-date with code changes
  • Document public APIs and complex algorithms
  • Use TODO comments for future improvements
  
  ERROR HANDLING:
  • Handle errors gracefully and consistently
  • Provide meaningful error messages
  • Don't ignore or suppress errors silently
  • Use appropriate error handling patterns for your language
  • Log errors with sufficient context for debugging
  
  PERFORMANCE:
  • Avoid premature optimization
  • Profile before optimizing
  • Choose appropriate data structures
  • Be mindful of memory usage
  • Consider algorithmic complexity
  
  SECURITY:
  • Validate all inputs from external sources
  • Use parameterized queries for databases
  • Don't hardcode sensitive information
  • Follow principle of least privilege
  • Keep dependencies up-to-date
  
  TESTING:
  • Write tests for critical functionality
  • Use descriptive test names
  • Test edge cases and error conditions
  • Keep tests independent and repeatable
  • Maintain good test coverage
  
  VERSION CONTROL:
  • Write clear, descriptive commit messages
  • Make small, focused commits
  • Use branching strategy consistently
  • Review code before merging
  • Keep commit history clean`,
  };

  function init() {
    loadSettings();
    setupEventListeners();
    createTestButton();
    populateDefaultModels();
    updateCharacterCount();
  }

  function setupEventListeners() {
    // API Config listeners
    ELEMENTS.form.addEventListener("submit", handleFormSubmit);
    ELEMENTS.loadModelsBtn.addEventListener("click", handleLoadModels);

    // Coding Standards listeners
    ELEMENTS.codingStandardsForm.addEventListener(
      "submit",
      handleCodingStandardsSubmit
    );
    ELEMENTS.codingStandardsTextarea.addEventListener(
      "input",
      updateCharacterCount
    );
    ELEMENTS.clearStandardsBtn.addEventListener("click", clearCodingStandards);

    // Tab listeners
    ELEMENTS.tabButtons.forEach((button) => {
      button.addEventListener("click", () => switchTab(button.dataset.tab));
    });

    // Template listeners
    ELEMENTS.templateButtons.forEach((button) => {
      button.addEventListener("click", () =>
        loadTemplate(button.dataset.template)
      );
    });
  }

  function switchTab(tabId) {
    // Update tab buttons
    ELEMENTS.tabButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === tabId);
    });

    // Update tab contents
    ELEMENTS.tabContents.forEach((content) => {
      content.classList.toggle("active", content.id === tabId);
    });
  }

  function loadTemplate(templateType) {
    const template = CODING_STANDARDS_TEMPLATES[templateType];
    if (template) {
      const currentText = ELEMENTS.codingStandardsTextarea.value.trim();

      if (
        currentText &&
        !confirm("This will replace your current coding standards. Continue?")
      ) {
        return;
      }

      ELEMENTS.codingStandardsTextarea.value = template;
      updateCharacterCount();
      showStatus(
        `${
          templateType.charAt(0).toUpperCase() + templateType.slice(1)
        } template loaded!`,
        STATUS_TYPES.SUCCESS
      );
    }
  }

  function updateCharacterCount() {
    const text = ELEMENTS.codingStandardsTextarea.value;
    const count = text.length;
    ELEMENTS.charCount.textContent = count.toLocaleString();

    // Add visual feedback for length
    if (count > 5000) {
      ELEMENTS.charCount.style.color = "#dc3545"; // Red
    } else if (count > 3000) {
      ELEMENTS.charCount.style.color = "#ffc107"; // Yellow
    } else {
      ELEMENTS.charCount.style.color = "#6c757d"; // Default gray
    }
  }

  function clearCodingStandards() {
    if (confirm("Are you sure you want to clear all coding standards?")) {
      ELEMENTS.codingStandardsTextarea.value = "";
      updateCharacterCount();
      showStatus("Coding standards cleared", STATUS_TYPES.INFO);
    }
  }

  function handleCodingStandardsSubmit(e) {
    e.preventDefault();
    saveCodingStandards();
  }

  function saveCodingStandards() {
    const codingStandards = ELEMENTS.codingStandardsTextarea.value.trim();

    const savePromises = [];

    // Save to Chrome storage if available
    if (hasChromeStorage()) {
      savePromises.push(saveCodingStandardsToChromeStorage(codingStandards));
    }

    // Always save to localStorage as backup
    localStorage.setItem(
      API_CONFIG.storageKeys.codingStandards,
      codingStandards
    );

    Promise.all(savePromises).then(() => {
      if (codingStandards) {
        showStatus(
          "Coding standards saved successfully! They will be used in all code reviews.",
          STATUS_TYPES.SUCCESS
        );
      } else {
        showStatus(
          "Coding standards cleared. Default review style will be used.",
          STATUS_TYPES.INFO
        );
      }
    });
  }

  function saveCodingStandardsToChromeStorage(codingStandards) {
    return new Promise((resolve) => {
      chrome.storage.sync.set(
        { codingStandards: codingStandards },
        function () {
          if (chrome.runtime.lastError) {
            console.warn("Chrome storage failed for coding standards");
          }
          resolve();
        }
      );
    });
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
    chrome.storage.sync.get(
      ["apiKey", "selectedModel", "codingStandards"],
      function (result) {
        if (!chrome.runtime.lastError) {
          if (result.apiKey) {
            ELEMENTS.apiKeyInput.value = result.apiKey;
          }
          if (result.selectedModel) {
            setSelectedModel(result.selectedModel);
          }
          if (result.codingStandards) {
            ELEMENTS.codingStandardsTextarea.value = result.codingStandards;
            updateCharacterCount();
          }
        }

        // Fallback to localStorage if Chrome storage fails
        if (!result.apiKey || !result.codingStandards) {
          loadFromLocalStorage();
        }
      }
    );
  }

  function loadFromLocalStorage() {
    const localKey = localStorage.getItem(API_CONFIG.storageKeys.apiKey);
    const localModel = localStorage.getItem(
      API_CONFIG.storageKeys.selectedModel
    );
    const localStandards = localStorage.getItem(
      API_CONFIG.storageKeys.codingStandards
    );

    if (localKey) {
      ELEMENTS.apiKeyInput.value = localKey;
    }
    if (localModel) {
      setSelectedModel(localModel);
    }
    if (localStandards) {
      ELEMENTS.codingStandardsTextarea.value = localStandards;
      updateCharacterCount();
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
        "API settings saved successfully! You can now use the extension on GitHub PR pages.",
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
