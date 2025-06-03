(function () {
  "use strict";

  const SELECTORS = {
    file: ['[data-testid="file-diff-view"]', ".file", ".js-file", ".diff-view"],
    fileName: [
      ".file-header [data-path]",
      ".file-info a",
      ".js-file-header [data-path]",
    ],
    diffRows: [
      ".diff-table tr:not(.js-expandable-line)",
      ".js-diff-table tr",
      '[data-testid="diff-row"]',
    ],
    addedLines: [
      ".blob-code-addition",
      ".diff-table td.d-addition",
      '[data-testid="diff-row-addition"]',
    ],
    removedLines: [
      ".blob-code-deletion",
      ".diff-table td.d-deletion",
      '[data-testid="diff-row-deletion"]',
    ],
    codeContent: [
      ".blob-code",
      ".diff-table td:last-child",
      '[data-testid="diff-content"]',
    ],
  };

  const SEVERITY_COLORS = {
    high: "#dc3545",
    medium: "#ffc107",
    low: "#28a745",
    default: "#6c757d",
  };

  const NOTIFICATION_COLORS = {
    success: "#28a745",
    warning: "#ffc107",
    error: "#dc3545",
    info: "#17a2b8",
  };

  const CONFIG = {
    chunkSize: 500,
    largeFileSizeThreshold: 50000,
    maxConcurrentRequests: 3,
    apiRequestDelay: 500,
    initializationDelay: 1000,
    navigationObserverDelay: 500,
    notificationDuration: 5000,
    progressBarHideDuration: 2000,
  };

  // State
  let isAnalyzing = false;
  let floatingButton = null;
  let navigationButtons = null;
  let fileSelector = null;
  let currentSuggestionIndex = 0;
  let totalSuggestions = 0;
  let selectedFiles = new Set();
  let completedApiCalls = 0;

  // Storage utilities
  function getApiKey() {
    return getStorageItem("apiKey", "ai-review-api-key");
  }

  function getModals() {
    return getStorageItem("selectedModel", "ai-review-selected-model");
  }

  function getCodingStandards() {
    return getStorageItem("codingStandards", "ai-review-coding-standards", "");
  }

  function getStorageItem(chromeKey, localStorageKey, defaultValue = null) {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== "undefined" && chrome.storage?.sync) {
          chrome.storage.sync.get([chromeKey], (result) => {
            if (chrome.runtime.lastError) {
              console.warn("Storage error:", chrome.runtime.lastError);
              resolve(localStorage.getItem(localStorageKey) || defaultValue);
            } else {
              resolve(result[chromeKey] || defaultValue);
            }
          });
        } else {
          resolve(localStorage.getItem(localStorageKey) || defaultValue);
        }
      } catch (error) {
        console.warn("Storage access failed:", error);
        resolve(localStorage.getItem(localStorageKey) || defaultValue);
      }
    });
  }

  // Utility functions
  function isDarkMode() {
    return (
      document.documentElement.getAttribute("data-color-mode") === "dark" ||
      document.documentElement.getAttribute("data-theme") === "dark" ||
      document.body.classList.contains("dark") ||
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  }

  function getDisplayFileName(fullPath) {
    if (!fullPath) return "Unknown file";
    const parts = fullPath.split("/");
    return parts.length > 1
      ? `${parts[parts.length - 2]}/${parts[parts.length - 1]}`
      : parts[0];
  }

  function promiseAllInBatches(tasks, batchSize) {
    let results = [];
    let currentBatch = [];
    let index = 0;

    async function processBatch() {
      if (index >= tasks.length) {
        if (currentBatch.length === 0) return results;

        const batchResults = await Promise.all(currentBatch);
        results = results.concat(batchResults);
        return results;
      }

      while (currentBatch.length < batchSize && index < tasks.length) {
        currentBatch.push(tasks[index++]);
      }

      const batchResults = await Promise.all(currentBatch);
      results = results.concat(batchResults);
      currentBatch = [];

      return processBatch();
    }

    return processBatch();
  }

  function chunkLines(lines, chunkSize) {
    const chunks = [];
    for (let i = 0; i < lines.length; i += chunkSize) {
      chunks.push(lines.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // UI Components
  function createFileSelector() {
    if (fileSelector) {
      fileSelector.remove();
    }

    fileSelector = document.createElement("div");
    fileSelector.id = "file-selector-modal";
    fileSelector.className = "file-selector-modal font-base";

    const modal = createFileSelectorModal();
    fileSelector.appendChild(modal);

    fileSelector.addEventListener("click", (e) => {
      if (e.target === fileSelector) {
        hideFileSelector();
      }
    });

    document.body.appendChild(fileSelector);
    return fileSelector;
  }

  function createFileSelectorModal() {
    const darkMode = isDarkMode();
    const modal = document.createElement("div");
    modal.className = `modal-container ${darkMode ? "dark" : "light"}`;

    const header = createModalHeader();
    const fileList = createFileList();
    const footer = createModalFooter();

    modal.appendChild(header);
    modal.appendChild(fileList);
    modal.appendChild(footer);

    return modal;
  }

  function createModalHeader() {
    const darkMode = isDarkMode();
    const header = document.createElement("div");
    header.className = `modal-header ${darkMode ? "dark" : "light"}`;

    const title = document.createElement("h3");
    title.className = `modal-title ${darkMode ? "dark" : "light"}`;
    title.textContent = "🔍 Select Files to Review";

    const closeBtn = document.createElement("button");
    closeBtn.className = `modal-close-btn ${darkMode ? "dark" : "light"}`;
    closeBtn.innerHTML = "✕";
    closeBtn.addEventListener("click", hideFileSelector);

    header.appendChild(title);
    header.appendChild(closeBtn);

    return header;
  }

  function createFileList() {
    const darkMode = isDarkMode();
    const container = document.createElement("div");
    container.className = "file-list-container";

    const selectAllContainer = createSelectAllOption();
    container.appendChild(selectAllContainer);

    const allDiffData = extractDiffData();

    if (allDiffData.length === 0) {
      const noFiles = document.createElement("div");
      noFiles.className = `no-files ${darkMode ? "dark" : "light"}`;
      noFiles.textContent = "No files found to review";
      container.appendChild(noFiles);
      return container;
    }

    allDiffData.forEach((file, index) => {
      const fileItem = createFileItem(file, index);
      container.appendChild(fileItem);
    });

    return container;
  }

  function createSelectAllOption() {
    const darkMode = isDarkMode();
    const container = document.createElement("div");
    container.className = `select-all-container ${darkMode ? "dark" : "light"}`;

    const label = document.createElement("label");
    label.className = `select-all-label ${darkMode ? "dark" : "light"}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "select-all-files";
    checkbox.className = "select-all-checkbox";

    checkbox.addEventListener("change", function () {
      const allCheckboxes = document.querySelectorAll(".file-checkbox");
      const allDiffData = extractDiffData();

      if (this.checked) {
        selectedFiles.clear();
        allDiffData.forEach((file, index) => {
          selectedFiles.add(index);
        });
        allCheckboxes.forEach((cb) => (cb.checked = true));
      } else {
        selectedFiles.clear();
        allCheckboxes.forEach((cb) => (cb.checked = false));
      }

      updateStartButtonState();
    });

    const text = document.createElement("span");
    text.textContent = "Select All Files";

    label.appendChild(checkbox);
    label.appendChild(text);
    container.appendChild(label);

    return container;
  }

  function createFileItem(file, index) {
    const darkMode = isDarkMode();
    const item = document.createElement("div");
    item.className = `file-item ${darkMode ? "dark" : "light"}`;

    const label = document.createElement("label");
    label.className = "file-label";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "file-checkbox";
    checkbox.value = index;

    // Check if file was previously selected
    if (selectedFiles.has(index)) {
      checkbox.checked = true;
      item.classList.add("selected");
    }

    checkbox.addEventListener("change", function () {
      if (this.checked) {
        selectedFiles.add(index);
        item.classList.add("selected");
      } else {
        selectedFiles.delete(index);
        item.classList.remove("selected");
      }

      // Update select all checkbox
      const selectAllCheckbox = document.getElementById("select-all-files");
      const allCheckboxes = document.querySelectorAll(".file-checkbox");
      const checkedBoxes = document.querySelectorAll(".file-checkbox:checked");
      selectAllCheckbox.checked = checkedBoxes.length === allCheckboxes.length;

      updateStartButtonState();
    });

    const fileInfo = document.createElement("div");
    fileInfo.className = "file-info";

    const fileName = document.createElement("div");
    fileName.className = `file-name ${darkMode ? "dark" : "light"}`;
    fileName.textContent = getDisplayFileName(file.fileName);

    const fileStats = document.createElement("div");
    fileStats.className = `file-stats ${darkMode ? "dark" : "light"}`;

    const addedLines = file.lines.filter(
      (line) => line.type === "added"
    ).length;
    const removedLines = file.lines.filter(
      (line) => line.type === "removed"
    ).length;

    fileStats.innerHTML = `
      <span class="added-lines">+${addedLines}</span>
      <span class="removed-lines">-${removedLines}</span>
      <span>${file.lines.length} total lines</span>
    `;

    fileInfo.appendChild(fileName);
    fileInfo.appendChild(fileStats);

    label.appendChild(checkbox);
    label.appendChild(fileInfo);
    item.appendChild(label);

    // Click on item to toggle checkbox
    item.addEventListener("click", function (e) {
      if (e.target !== checkbox) {
        checkbox.click();
      }
    });

    return item;
  }

  function createModalFooter() {
    const darkMode = isDarkMode();
    const footer = document.createElement("div");
    footer.className = `modal-footer ${darkMode ? "dark" : "light"}`;

    const selectedCount = document.createElement("div");
    selectedCount.id = "selected-count";
    selectedCount.className = `selected-count ${darkMode ? "dark" : "light"}`;

    const buttonGroup = document.createElement("div");
    buttonGroup.className = "button-group";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = `btn btn-cancel ${darkMode ? "dark" : "light"}`;
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", hideFileSelector);

    const startBtn = document.createElement("button");
    startBtn.id = "start-review-btn";
    startBtn.className = "btn btn-start";
    startBtn.textContent = "🚀 Start Review";
    startBtn.disabled = true;
    startBtn.addEventListener("click", startSelectedReview);

    buttonGroup.appendChild(cancelBtn);
    buttonGroup.appendChild(startBtn);

    footer.appendChild(selectedCount);
    footer.appendChild(buttonGroup);

    updateStartButtonState();

    return footer;
  }

  function updateStartButtonState() {
    const startBtn = document.getElementById("start-review-btn");
    const selectedCount = document.getElementById("selected-count");

    if (!startBtn || !selectedCount) return;

    const count = selectedFiles.size;
    selectedCount.textContent = `${count} file${
      count !== 1 ? "s" : ""
    } selected`;

    if (count > 0) {
      startBtn.disabled = false;
      startBtn.style.opacity = "1";
      startBtn.style.cursor = "pointer";
    } else {
      startBtn.disabled = true;
      startBtn.style.opacity = "0.5";
      startBtn.style.cursor = "not-allowed";
    }
  }

  function showFileSelector() {
    if (!fileSelector) {
      createFileSelector();
    }
    fileSelector.style.display = "flex";

    setTimeout(() => {
      const checkboxes = document.querySelectorAll(".file-checkbox");
      const allDiffData = extractDiffData();

      allDiffData.forEach((_, index) => {
        selectedFiles.add(index);
      });

      checkboxes.forEach((cb) => (cb.checked = true));
      const selectAllCheckbox = document.getElementById("select-all-files");
      if (selectAllCheckbox) {
        selectAllCheckbox.checked = true;
      }

      updateStartButtonState();
    }, 50);
  }

  function hideFileSelector() {
    if (fileSelector) {
      fileSelector.style.display = "none";
    }
  }

  function createNavigationButtons() {
    if (navigationButtons) {
      navigationButtons.remove();
    }

    navigationButtons = document.createElement("div");
    navigationButtons.id = "suggestion-navigation";
    navigationButtons.className = "suggestion-navigation";

    const prevButton = createNavButton("↑", "Previous suggestion", () =>
      navigateToSuggestion(-1)
    );
    const nextButton = createNavButton("↓", "Next suggestion", () =>
      navigateToSuggestion(1)
    );
    const counter = createSuggestionCounter();

    navigationButtons.appendChild(prevButton);
    navigationButtons.appendChild(counter);
    navigationButtons.appendChild(nextButton);

    document.body.appendChild(navigationButtons);
    return navigationButtons;
  }

  function createNavButton(text, title, onClick) {
    const button = document.createElement("button");
    button.className = "nav-button";
    button.textContent = text;
    button.title = title;
    button.addEventListener("click", onClick);
    return button;
  }

  function createSuggestionCounter() {
    const counter = document.createElement("div");
    counter.id = "suggestion-counter";
    counter.className = "suggestion-counter font-base";
    return counter;
  }

  function createFloatingButton() {
    if (floatingButton) {
      floatingButton.remove();
    }

    floatingButton = document.createElement("div");
    floatingButton.id = "code-review-assistant-btn";

    const buttonInner = document.createElement("div");
    buttonInner.className = "floating-button font-base";

    const icon = document.createElement("span");
    icon.id = "btn-icon";
    icon.textContent = "🔍";

    const text = document.createElement("span");
    text.id = "btn-text";
    text.textContent = "AI Review";

    buttonInner.appendChild(icon);
    buttonInner.appendChild(text);
    floatingButton.appendChild(buttonInner);

    buttonInner.addEventListener("click", function () {
      if (isAnalyzing) return;

      const allDiffData = extractDiffData();
      if (!allDiffData || allDiffData.length === 0) {
        showNotification("No code changes found to analyze", "warning");
        return;
      }

      showFileSelector();
    });

    document.body.appendChild(floatingButton);
    return floatingButton;
  }

  function createProgressBar() {
    const existingProgressBar = document.getElementById(
      "analysis-progress-container"
    );
    if (existingProgressBar) {
      existingProgressBar.remove();
    }

    const darkMode = isDarkMode();
    const progressContainer = document.createElement("div");
    progressContainer.id = "analysis-progress-container";
    progressContainer.className = `progress-container ${
      darkMode ? "dark" : "light"
    } font-base`;

    const progressTitle = document.createElement("div");
    progressTitle.className = `progress-title ${darkMode ? "dark" : "light"}`;
    progressTitle.textContent = "Analyzing files...";

    const progressBarOuter = document.createElement("div");
    progressBarOuter.className = `progress-bar-outer ${
      darkMode ? "dark" : "light"
    }`;

    const progressBarInner = document.createElement("div");
    progressBarInner.id = "analysis-progress-bar";
    progressBarInner.className = "progress-bar-inner";

    const progressText = document.createElement("div");
    progressText.id = "analysis-progress-text";
    progressText.className = `progress-text ${darkMode ? "dark" : "light"}`;
    progressText.textContent = "0%";

    const apiCallsInfo = document.createElement("div");
    apiCallsInfo.id = "api-calls-info";
    apiCallsInfo.className = `api-calls-info ${darkMode ? "dark" : "light"}`;
    apiCallsInfo.style.cssText =
      "font-size: 12px; margin-top: 4px; color: #666;";

    progressBarOuter.appendChild(progressBarInner);
    progressContainer.appendChild(progressTitle);
    progressContainer.appendChild(progressBarOuter);
    progressContainer.appendChild(progressText);
    progressContainer.appendChild(apiCallsInfo);

    document.body.appendChild(progressContainer);
    return progressContainer;
  }

  function updateProgressBar(current, total, text = null, apiCalls = null) {
    const progressContainer = document.getElementById(
      "analysis-progress-container"
    );
    const progressBar = document.getElementById("analysis-progress-bar");
    const progressText = document.getElementById("analysis-progress-text");
    const apiCallsInfo = document.getElementById("api-calls-info");

    if (!progressContainer || !progressBar || !progressText) return;

    const percent = Math.round((current / total) * 100);

    if (percent !== progressBar.dataset.lastPercent) {
      progressBar.style.width = `${percent}%`;
      progressBar.dataset.lastPercent = percent;
      progressText.textContent = text || `${percent}% (${current}/${total})`;
    }

    if (apiCallsInfo && apiCalls !== null) {
      apiCallsInfo.textContent = `API Calls completed: ${apiCalls}`;
    }

    if (current >= total) {
      setTimeout(() => {
        progressContainer.style.display = "none";
      }, CONFIG.progressBarHideDuration);
    }
  }

  function updateButtonState(isLoading) {
    const btnIcon = document.getElementById("btn-icon");
    const btnText = document.getElementById("btn-text");

    if (!btnIcon || !btnText) return;

    if (isLoading) {
      btnIcon.textContent = "⏳";
      btnText.textContent = "Analyzing...";
    } else {
      btnIcon.textContent = "🔍";
      btnText.textContent = "AI Review";
    }
  }

  function updateSuggestionCounter() {
    const counter = document.getElementById("suggestion-counter");
    if (counter && totalSuggestions > 0) {
      counter.textContent = `${currentSuggestionIndex + 1}/${totalSuggestions}`;
    }
  }

  function navigateToSuggestion(direction) {
    const suggestions = document.querySelectorAll(".ai-suggestion-row");
    if (suggestions.length === 0) return;

    totalSuggestions = suggestions.length;
    currentSuggestionIndex =
      (currentSuggestionIndex + direction + totalSuggestions) %
      totalSuggestions;

    const targetSuggestion = suggestions[currentSuggestionIndex];
    targetSuggestion.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    // Highlight current suggestion
    suggestions.forEach((s, index) => {
      const suggestionDiv = s.querySelector("div");
      if (suggestionDiv) {
        if (index === currentSuggestionIndex) {
          suggestionDiv.style.boxShadow =
            "0 0 0 2px #667eea, 0 4px 12px rgba(0,0,0,0.15)";
          suggestionDiv.style.transform = "scale(1.02)";
        } else {
          suggestionDiv.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
          suggestionDiv.style.transform = "scale(1)";
        }
      }
    });

    updateSuggestionCounter();
  }

  function showNavigationButtons() {
    if (navigationButtons) {
      navigationButtons.style.display = "flex";
      totalSuggestions = document.querySelectorAll(".ai-suggestion-row").length;
      currentSuggestionIndex = 0;
      updateSuggestionCounter();

      // Auto navigate to first suggestion
      setTimeout(() => {
        if (totalSuggestions > 0) {
          navigateToSuggestion(0);
        }
      }, 500);
    }
  }

  function hideNavigationButtons() {
    if (navigationButtons) {
      navigationButtons.style.display = "none";
    }
  }

  function clearPreviousSuggestions() {
    document
      .querySelectorAll(".ai-suggestion-row")
      .forEach((row) => row.remove());

    currentSuggestionIndex = 0;
    totalSuggestions = 0;
    hideNavigationButtons();
  }

  function showNotification(message, type) {
    const notification = document.createElement("div");
    notification.className = `notification ${type} font-base`;
    notification.style.background =
      NOTIFICATION_COLORS[type] || NOTIFICATION_COLORS.success;
    notification.textContent = message;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), CONFIG.notificationDuration);
  }

  // Diff extraction functions
  function extractDiffData() {
    const fileContainers = findFileContainers();
    const diffData = [];

    fileContainers.forEach((container, index) => {
      const fileName = getFileName(container) || `file-${index}`;
      const diffLines = extractDiffLines(container);

      if (diffLines.length > 0) {
        diffData.push({
          fileName,
          lines: diffLines,
          container,
        });
      }
    });

    return diffData;
  }

  function findFileContainers() {
    for (const selector of SELECTORS.file) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        return Array.from(elements);
      }
    }

    const tables = document.querySelectorAll(
      "table.diff-table, .js-diff-table, table:has(.blob-code)"
    );
    if (tables.length > 0) {
      return Array.from(tables).map((table) => table.closest(".file") || table);
    }

    return [];
  }

  function getFileName(container) {
    for (const selector of SELECTORS.fileName) {
      const element = container.querySelector(selector);
      if (element) {
        return (
          element.getAttribute("data-tagsearch-path") ||
          element.getAttribute("data-path") ||
          element.getAttribute("title") ||
          element.textContent.trim()
        );
      }
    }

    return extractFileNameFromLinks(container);
  }

  function extractFileNameFromLinks(container) {
    const links = container.querySelectorAll(
      'a[href*="/blob/"], a[href*="/tree/"]'
    );
    for (const link of links) {
      const href = link.getAttribute("href");
      if (href?.includes("/")) {
        const filename = href.split("/").pop();
        if (filename?.includes(".")) {
          return filename;
        }
      }
    }
    return null;
  }

  function extractDiffLines(container) {
    const diffLines = [];
    const rows = findDiffRows(container);

    rows.forEach((row, index) => {
      const lineData = extractLineData(row, index);
      if (lineData) {
        diffLines.push(lineData);
      }
    });

    return diffLines;
  }

  function findDiffRows(container) {
    for (const selector of SELECTORS.diffRows) {
      const rows = container.querySelectorAll(selector);
      if (rows.length > 0) {
        return Array.from(rows);
      }
    }
    return [];
  }

  function extractLineData(row, index) {
    const lineType = determineLineType(row);
    const codeElement = findCodeElement(row, lineType);

    if (!codeElement) return null;

    const content = (
      codeElement.textContent ||
      codeElement.innerText ||
      ""
    ).trim();
    if (!content) return null;

    const lineNumber = getLineNumber(
      row,
      lineType === "removed" ? "old" : "new"
    );

    return {
      type: lineType,
      content,
      lineNumber,
      rowElement: row,
      index,
    };
  }

  function determineLineType(row) {
    for (const selector of SELECTORS.addedLines) {
      if (row.querySelector(selector)) {
        return "added";
      }
    }

    for (const selector of SELECTORS.removedLines) {
      if (row.querySelector(selector)) {
        return "removed";
      }
    }

    return "normal";
  }

  function findCodeElement(row, lineType) {
    const temp =
      lineType === "removed" ? SELECTORS.removedLines : SELECTORS.codeContent;
    const selectors = lineType === "added" ? SELECTORS.addedLines : temp;

    for (const selector of selectors) {
      const element = row.querySelector(selector);
      if (element) return element;
    }

    for (const selector of SELECTORS.codeContent) {
      const element = row.querySelector(selector);
      if (element) return element;
    }

    return null;
  }

  function getLineNumber(row, side) {
    const selectors =
      side === "new"
        ? [
            ".blob-num-addition",
            ".blob-num:last-child",
            "[data-line-number]:last-child",
          ]
        : [
            ".blob-num-deletion",
            ".blob-num:first-child",
            "[data-line-number]:first-child",
          ];

    for (const selector of selectors) {
      const lineNumElement = row.querySelector(selector);
      if (lineNumElement) {
        const num =
          lineNumElement.textContent.trim() ||
          lineNumElement.getAttribute("data-line-number");
        if (num && !isNaN(num)) {
          return parseInt(num);
        }
      }
    }

    return null;
  }

  // Analysis functions
  function formatDiffForAnalysis(diffData) {
    let result = "";

    diffData.forEach((file) => {
      result += `\n--- File: ${file.fileName} ---\n`;

      let addedLinesPresent = false;
      const fileLinesContent = file.lines
        .map((line) => {
          const temp = line.type === "removed" ? "-" : " ";
          const prefix = line.type === "added" ? "+" : temp;
          if (line.type === "added") addedLinesPresent = true;
          return `${prefix} ${String(line.lineNumber || "").padEnd(4)}: ${
            line.content
          }`;
        })
        .join("\n");

      if (!addedLinesPresent && file.lines.length > 0) {
        result += fileLinesContent + "\n";
      } else if (addedLinesPresent) {
        result += fileLinesContent + "\n";
      } else {
        return "";
      }
    });

    return result;
  }

  function createAnalysisPrompt(
    diffText,
    codingStandards = "",
    fileName = null
  ) {
    let promptIntro;
    const isChunk = fileName && fileName.includes("(part ");

    if (isChunk) {
      const match = fileName.match(/\(part (\d+)\/(\d+)\)/);
      const currentChunk = match ? match[1] : "?";
      const totalChunks = match ? match[2] : "?";

      promptIntro = `Please analyze the following code changes for chunk ${currentChunk} of ${totalChunks} from the file "${fileName.replace(
        / \(part \d+\/\d+\)$/,
        ""
      )}". Note that this is only a portion of the file being analyzed in chunks due to its size.`;
    } else if (fileName) {
      promptIntro = `Please analyze the following code changes for the file "${fileName
        .split("/")
        .pop()}" (full path: "${fileName}") and provide specific, actionable code review suggestions.`;
    } else {
      promptIntro = `Please analyze this GitHub Pull Request diff and provide specific, actionable code review suggestions.`;
    }

    let prompt = `${promptIntro}`;

    if (codingStandards.trim()) {
      prompt += `
    CODING STANDARDS TO FOLLOW: 
  ${codingStandards}
  
  Please ensure your suggestions align with these coding standards and conventions for the file "${
    fileName || "being analyzed"
  }".`;
    }

    prompt += `
  
  Focus on:
  1. Issues in NEW/ADDED code (lines with +) within the file "${
    fileName || "being analyzed"
  }".
  2. Potential bugs and security concerns.
  3. Code quality improvements.
  4. Performance issues.
  5. Best practices violations.
  ${
    codingStandards.trim()
      ? `6. Adherence to the provided coding standards for "${
          fileName || "this file"
        }".`
      : ""
  }
  
  Return ONLY a JSON array with this structure (ensure lineNumber is relative to the file changes provided):
  [
  {
  "id": "unique_id_for_this_suggestion",
  "fileName": "${
    fileName
      ? fileName
          .split("/")
          .pop()
          .replace(/ \(part \d+\/\d+\)$/, "")
      : "exact_file_name_being_analyzed"
  }",
  "lineNumber": line_number_within_the_diff_of_this_file,
  "type": "bug|security|performance|style|maintainability|standards",
  "severity": "high|medium|low",
  "title": "Brief issue title (max 10 words)",
  "description": "Detailed explanation of the issue (max 3-4 sentences)",
  "suggestedFix": "Specific code improvement or detailed steps for fixing",
  "reasoning": "Why this change is needed (1-2 sentences)"
  }
  ]
  
  IMPORTANT:
  - The "fileName" in the JSON output MUST exactly match "${
    fileName
      ? fileName
          .split("/")
          .pop()
          .replace(/ \(part \d+\/\d+\)$/, "")
      : "the file name being analyzed"
  }".
  - The "lineNumber" MUST correspond to a line number present in the ADDED (prefixed with '+') lines of the diff for this specific file.
  - If no issues are found for this specific file, return an empty array [].
  - Do NOT include suggestions for unchanged or removed lines unless they directly relate to an issue in an added line.
  - Be concise and actionable.
  ${
    isChunk
      ? "- Remember this is only a part of the file, so focus on issues visible in this chunk."
      : ""
  }
  
  DIFF TO ANALYZE (for ${fileName || "the request"}):
  ${diffText}
  
  Return only the JSON array, no other text, even if no suggestions are found (return [] in that case).
  `;

    return prompt;
  }

  function parseAIResponse(responseText, fileNameContext = "current file") {
    try {
      let jsonString = responseText
        .replace(/^```json\s*/g, "")
        .replace(/\s*```$/g, "")
        .trim();

      if (!jsonString.startsWith("[") || !jsonString.endsWith("]")) {
        const match = jsonString.match(/\[[\s\S]*\]/);
        if (match) {
          jsonString = match[0];
        }
      }

      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        return parsed;
      }

      console.warn(
        `Invalid response format for ${fileNameContext}. Expected array, got:`,
        typeof parsed
      );
      return [];
    } catch (e) {
      console.warn(
        `Failed to parse response for ${fileNameContext}:`,
        e.message,
        "\nResponse was:",
        responseText.substring(0, 500)
      );
      return [];
    }
  }

  function deduplicateSuggestions(suggestions) {
    const uniqueSuggestions = [];
    const seenSuggestions = new Set();

    suggestions.forEach((suggestion) => {
      const key = `${suggestion.fileName}-${suggestion.lineNumber}-${suggestion.title}`;

      if (!seenSuggestions.has(key)) {
        seenSuggestions.add(key);
        uniqueSuggestions.push(suggestion);
      }
    });

    return uniqueSuggestions;
  }

  async function analyzeCodeDiff(
    diffDataForOneFile,
    apiKey,
    currentFileName = null
  ) {
    try {
      const diffText = formatDiffForAnalysis(diffDataForOneFile);

      if (
        !diffText.trim() ||
        (diffText.includes("File: ") && diffText.split("\n").length < 3)
      ) {
        console.log(
          `Skipping analysis for ${
            currentFileName || "a file"
          } as diff content is minimal.`
        );
        return [];
      }

      const codingStandards = await getCodingStandards();
      const modal = await getModals();

      const prompt = createAnalysisPrompt(
        diffText,
        codingStandards,
        currentFileName
      );

      const selectedModel =
        modal || "models/gemini-2.0-flash-thinking-exp-01-21";

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${selectedModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 4096,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("API Error Body:", errorBody);

        const errorMessage = errorBody.substring(0, 200);
        const isRateLimitError =
          errorMessage.includes("429") ||
          errorMessage.includes("rate limit") ||
          errorMessage.includes("quota");

        if (isRateLimitError) {
          throw new Error(
            `API rate limit exceeded for ${
              currentFileName || "file"
            }. Please try again in a few minutes.`
          );
        } else {
          throw new Error(
            `API Error: ${response.status} for ${
              currentFileName || "a file"
            }. ${errorBody.substring(0, 200)}`
          );
        }
      }
      if (response.ok) {
        completedApiCalls++;
      }

      const data = await response.json();

      if (data.candidates === undefined || data.candidates.length === 0) {
        if (data.promptFeedback && data.promptFeedback.blockReason) {
          console.warn(
            `Prompt blocked for ${currentFileName || "a file"}. Reason: ${
              data.promptFeedback.blockReason
            }`,
            data.promptFeedback
          );
          throw new Error(
            `AI analysis blocked for ${currentFileName || "a file"}: ${
              data.promptFeedback.blockReason
            }. This can be due to safety settings or harmful content.`
          );
        } else {
          console.warn(
            `No candidates returned from AI for ${
              currentFileName || "a file"
            }. Response:`,
            data
          );
        }
      }

      const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!responseText) {
        throw new Error(
          `No response text from AI for ${
            currentFileName || "a file"
          }, please try again.`
        );
      }

      return parseAIResponse(responseText, currentFileName);
    } catch (error) {
      const errorMessage = error.message || "Unknown error";
      console.error(`Analysis error for ${currentFileName || "file"}:`, error);
      throw new Error(
        `Failed to analyze ${currentFileName || "file"}: ${errorMessage}`
      );
    }
  }

  async function analyzeChunkedFile(fileDiff, apiKey) {
    const fileName = fileDiff.fileName;
    const allLines = fileDiff.lines;
    const chunks = chunkLines(allLines, CONFIG.chunkSize);
    let allSuggestions = [];
    const totalChunks = chunks.length;

    console.log(
      `File ${fileName} is large, analyzing in ${totalChunks} chunks`
    );

    for (let i = 0; i < chunks.length; i++) {
      const chunkLines = chunks[i];
      const chunkDiff = {
        ...fileDiff,
        lines: chunkLines,
      };

      try {
        const btnText = document.getElementById("btn-text");
        if (btnText) {
          btnText.textContent = `Analyzing ${fileName.split("/").pop()} (${
            i + 1
          }/${totalChunks})...`;
        }

        const chunkSuggestions = await analyzeCodeDiff(
          [chunkDiff],
          apiKey,
          `${fileName} (part ${i + 1}/${totalChunks})`
        );

        if (chunkSuggestions && chunkSuggestions.length > 0) {
          const processedSuggestions = chunkSuggestions.map((suggestion) => ({
            ...suggestion,
            fileName: fileName.split("/").pop(),
          }));
          allSuggestions.push(...processedSuggestions);
        }

        await new Promise((resolve) =>
          setTimeout(resolve, CONFIG.apiRequestDelay)
        );
      } catch (error) {
        console.error(
          `Error analyzing chunk ${i + 1}/${totalChunks} of ${fileName}:`,
          error
        );
      }
    }

    return allSuggestions;
  }

  async function analyzeSelectedFiles(selectedDiffData) {
    if (isAnalyzing) return;

    try {
      isAnalyzing = true;
      updateButtonState(true);
      clearPreviousSuggestions();
      hideNavigationButtons();
      completedApiCalls = 0;

      const apiKey = await getApiKey();
      if (!apiKey) {
        showNotification(
          "Please configure API key in extension options",
          "error"
        );
        openOptionsPage();
        return;
      }

      let allSuggestions = [];
      const totalFiles = selectedDiffData.length;

      if (totalFiles > 1) {
        createProgressBar();
      }

      const analysisTasks = selectedDiffData.map((fileDiff, index) => {
        return async () => {
          try {
            const btnText = document.getElementById("btn-text");
            if (btnText) {
              btnText.textContent = `Analyzing ${index + 1}/${totalFiles}...`;
            }

            updateProgressBar(
              index,
              totalFiles,
              `Analyzing ${fileDiff.fileName.split("/").pop()}`
            );

            const fileSize = JSON.stringify(fileDiff).length;

            // If file is too large, split into smaller chunks
            if (fileSize > CONFIG.largeFileSizeThreshold) {
              const suggestions = await analyzeChunkedFile(fileDiff, apiKey);
              return suggestions || [];
            } else {
              // Analyze file normally if not too large
              const suggestionsForFile = await analyzeCodeDiff(
                [fileDiff],
                apiKey,
                fileDiff.fileName
              );
              return suggestionsForFile || [];
            }
          } catch (fileError) {
            console.error(
              `Error analyzing file ${fileDiff.fileName}:`,
              fileError
            );
            return [];
          }
        };
      });

      const taskResults = await promiseAllInBatches(
        analysisTasks.map((task) => task()),
        CONFIG.maxConcurrentRequests
      );

      taskResults.forEach((suggestions) => {
        if (suggestions && suggestions.length > 0) {
          allSuggestions.push(...suggestions);
        }
      });

      updateProgressBar(totalFiles, totalFiles, "Analysis complete!");

      // Deduplicate suggestions before displaying
      const uniqueSuggestions = deduplicateSuggestions(allSuggestions);

      handleAnalysisResults(uniqueSuggestions, selectedDiffData);
    } catch (error) {
      console.error("Analysis error:", error);
      showNotification(
        "Something went wrong during analysis. Please try again.",
        "error"
      );
    } finally {
      isAnalyzing = false;
      updateButtonState(false);
    }
  }

  // Suggestion injection functions
  function handleAnalysisResults(suggestions, diffData) {
    if (suggestions && suggestions.length > 0) {
      injectSuggestions(suggestions, diffData);
      showNavigationButtons();
      showNotification(`Found ${suggestions.length} suggestions`, "success");
    } else {
      hideNavigationButtons();
      showNotification("No issues found. Code looks good!", "success");
    }
  }

  function injectSuggestions(suggestions, diffData) {
    suggestions.forEach((suggestion) => {
      const targetFile = findTargetFile(suggestion, diffData);
      if (!targetFile) return;

      const targetLine = findTargetLine(suggestion, targetFile);
      if (targetLine) {
        injectSuggestionAfterLine(targetLine.rowElement, suggestion);
      }
    });
  }

  function findTargetFile(suggestion, diffData) {
    return diffData.find((file) => {
      const aiFileName = suggestion.fileName.toLowerCase();
      const domFileName = file.fileName.toLowerCase();
      return (
        domFileName.includes(aiFileName) || aiFileName.includes(domFileName)
      );
    });
  }

  function findTargetLine(suggestion, targetFile) {
    let foundLine = targetFile.lines.find(
      (line) =>
        line.type === "added" && line.lineNumber === suggestion.lineNumber
    );

    if (foundLine) return foundLine;

    const tolerance = 3;
    const addedLines = targetFile.lines.filter((line) => line.type === "added");

    if (addedLines.length > 0) {
      addedLines.sort(
        (a, b) =>
          Math.abs(a.lineNumber - suggestion.lineNumber) -
          Math.abs(b.lineNumber - suggestion.lineNumber)
      );

      if (
        Math.abs(addedLines[0].lineNumber - suggestion.lineNumber) <= tolerance
      ) {
        return addedLines[0];
      }
    }

    const allLines = [...targetFile.lines];
    allLines.sort(
      (a, b) =>
        Math.abs(a.lineNumber - suggestion.lineNumber) -
        Math.abs(b.lineNumber - suggestion.lineNumber)
    );

    return allLines[0] || null;
  }

  function injectSuggestionAfterLine(rowElement, suggestion) {
    const suggestionRow = createSuggestionRow(rowElement, suggestion);
    rowElement.parentNode.insertBefore(suggestionRow, rowElement.nextSibling);
  }

  function createSuggestionRow(rowElement, suggestion) {
    const suggestionRow = document.createElement("tr");
    suggestionRow.className = "ai-suggestion-row";

    const cell = document.createElement("td");
    cell.colSpan = getTableColspan(rowElement);
    cell.style.cssText = "padding: 0; border: none;";

    const suggestionDiv = createSuggestionContent(suggestion);
    cell.appendChild(suggestionDiv);
    suggestionRow.appendChild(cell);

    return suggestionRow;
  }

  function getTableColspan(rowElement) {
    const parentTable = rowElement.closest("table");
    return parentTable ? parentTable.querySelector("tr").children.length : 3;
  }

  function createSuggestionContent(suggestion) {
    const fragment = document.createDocumentFragment();
    const suggestionDiv = document.createElement("div");
    suggestionDiv.style.cssText = getSuggestionStyles(suggestion.severity);

    const header = createSuggestionHeader(suggestion);
    const description = createSuggestionDescription(suggestion);

    suggestionDiv.appendChild(header);
    suggestionDiv.appendChild(description);

    if (suggestion.suggestedFix) {
      const fixDiv = createSuggestedFix(suggestion.suggestedFix);
      suggestionDiv.appendChild(fixDiv);
    }

    fragment.appendChild(suggestionDiv);
    return suggestionDiv;
  }

  function getSuggestionStyles(severity) {
    const darkMode = isDarkMode();
    const backgroundColor = darkMode
      ? "linear-gradient(135deg, #21262d 0%, #30363d 100%)"
      : "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)";

    return `
      background: ${backgroundColor};
      border-left: 4px solid ${
        SEVERITY_COLORS[severity] || SEVERITY_COLORS.default
      };
      margin: 2px 8px;
      padding: 12px;
      border-radius: 0 6px 6px 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      transition: all 0.2s ease;
    `;
  }

  function createSuggestionHeader(suggestion) {
    const header = document.createElement("div");
    header.style.cssText =
      "display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;";

    const leftHeader = createHeaderLeft(suggestion);
    const actions = createHeaderActions();

    header.appendChild(leftHeader);
    header.appendChild(actions);

    return header;
  }

  function createHeaderLeft(suggestion) {
    const leftHeader = document.createElement("div");
    leftHeader.style.cssText = "display: flex; align-items: center; gap: 8px;";

    const severityBadge = createSeverityBadge(suggestion.severity);
    const aiBadge = createAIBadge();
    const title = createSuggestionTitle(suggestion.title);

    leftHeader.appendChild(severityBadge);
    leftHeader.appendChild(aiBadge);
    leftHeader.appendChild(title);

    return leftHeader;
  }

  function createSeverityBadge(severity) {
    const badge = document.createElement("span");
    badge.style.cssText = `
      background: ${SEVERITY_COLORS[severity] || SEVERITY_COLORS.default};
      color: white;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    `;
    badge.textContent = severity;
    return badge;
  }

  function createAIBadge() {
    const badge = document.createElement("span");
    badge.style.cssText = `
      background: #667eea;
      color: white;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
    `;
    badge.textContent = "🤖 AI";
    return badge;
  }

  function createSuggestionTitle(titleText) {
    const darkMode = isDarkMode();
    const textColor = darkMode ? "#f0f6fc" : "#1e293b";

    const title = document.createElement("strong");
    title.style.cssText = `font-size: 13px; color: ${textColor};`;
    title.textContent = titleText;
    return title;
  }

  function createHeaderActions() {
    const actions = document.createElement("div");
    actions.style.cssText = "display: flex; gap: 4px;";

    const helpfulBtn = createActionButton("👍", "#28a745", "Helpful");
    const notHelpfulBtn = createActionButton("👎", "#dc3545", "Not helpful");
    const dismissBtn = createActionButton("✕", "#6c757d", "Dismiss");

    [helpfulBtn, notHelpfulBtn, dismissBtn].forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const suggestionRow = e.target.closest(".ai-suggestion-row");
        if (suggestionRow) {
          suggestionRow.remove();
          const remainingSuggestions =
            document.querySelectorAll(".ai-suggestion-row");
          if (remainingSuggestions.length === 0) {
            hideNavigationButtons();
          } else {
            totalSuggestions = remainingSuggestions.length;
            if (currentSuggestionIndex >= totalSuggestions) {
              currentSuggestionIndex = totalSuggestions - 1;
            }
            updateSuggestionCounter();
          }
        }
      });
    });

    actions.appendChild(helpfulBtn);
    actions.appendChild(notHelpfulBtn);
    actions.appendChild(dismissBtn);

    return actions;
  }

  function createActionButton(text, color, title) {
    const btn = document.createElement("button");
    btn.style.cssText = `
      background: ${color};
      color: white;
      border: none;
      padding: 4px 6px;
      border-radius: 12px;
      font-size: 10px;
      cursor: pointer;
      transition: opacity 0.2s;
      min-width: 24px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    btn.textContent = text;
    btn.title = title;

    btn.addEventListener("mouseenter", () => (btn.style.opacity = "0.8"));
    btn.addEventListener("mouseleave", () => (btn.style.opacity = "1"));

    return btn;
  }

  function createSuggestionDescription(suggestion) {
    const darkMode = isDarkMode();
    const textColor = darkMode ? "#c9d1d9" : "#4a5568";

    const description = document.createElement("div");
    description.style.cssText = `color: ${textColor}; line-height: 1.4; margin-bottom: 8px;`;
    description.textContent = suggestion.description;
    return description;
  }

  function createSuggestedFix(suggestedFix) {
    const darkMode = isDarkMode();
    const backgroundColor = darkMode ? "#161b22" : "#f1f3f4";
    const borderColor = darkMode ? "#30363d" : "#d0d7de";
    const textColor = darkMode ? "#e6edf3" : "#24292f";
    const labelColor = darkMode ? "#8b949e" : "#6a737d";

    const fixDiv = document.createElement("div");
    fixDiv.style.cssText = `
      background: ${backgroundColor};
      border: 1px solid ${borderColor};
      border-radius: 4px;
      padding: 8px;
      font-family: 'SFMono-Regular', Consolas, monospace;
      font-size: 12px;
      margin-top: 8px;
      overflow-x: auto;
    `;

    const fixLabel = document.createElement("div");
    fixLabel.style.cssText = `
      font-size: 11px; 
      color: ${labelColor}; 
      margin-bottom: 4px; 
      font-weight: 600;
    `;
    fixLabel.textContent = "💡 Suggested fix:";

    const fixCode = document.createElement("pre");
    fixCode.style.cssText = `
      margin: 0; 
      white-space: pre-wrap; 
      word-wrap: break-word;
      color: ${textColor};
    `;
    fixCode.textContent = suggestedFix;

    fixDiv.appendChild(fixLabel);
    fixDiv.appendChild(fixCode);

    return fixDiv;
  }

  async function startSelectedReview() {
    if (selectedFiles.size === 0) {
      showNotification("Please select at least one file to review", "warning");
      return;
    }

    hideFileSelector();

    const allDiffData = extractDiffData();
    const selectedDiffData = Array.from(selectedFiles)
      .map((index) => allDiffData[index])
      .filter(Boolean);

    if (selectedDiffData.length === 0) {
      showNotification("No valid files selected", "warning");
      return;
    }

    await analyzeSelectedFiles(selectedDiffData);
  }

  function openOptionsPage() {
    try {
      chrome.runtime.sendMessage({ action: "openOptions" });
    } catch (e) {
      console.warn("Could not open options:", e);
    }
  }

  function isGitHubDiffPage() {
    return (
      window.location.hostname === "github.com" &&
      (window.location.pathname.includes("/pull/") ||
        window.location.pathname.includes("/compare/") ||
        window.location.pathname.includes("/commit/")) &&
      hasDiffContent()
    );
  }

  function hasDiffContent() {
    return document.querySelector(
      'table.diff-table, .js-diff-table, [data-testid="file-diff-view"]'
    );
  }

  function initialize() {
    if (isGitHubDiffPage()) {
      setTimeout(() => {
        if (!document.getElementById("code-review-assistant-btn")) {
          createFloatingButton();
          createNavigationButtons();
        }
      }, CONFIG.initializationDelay);
    } else {
      [floatingButton, navigationButtons, fileSelector].forEach((element) => {
        if (element) {
          element.remove();
        }
      });
      floatingButton = null;
      navigationButtons = null;
      fileSelector = null;
    }
  }

  function setupNavigationObserver() {
    let lastUrl = location.href;

    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        setTimeout(initialize, CONFIG.navigationObserverDelay);
      }
    }).observe(document, { subtree: true, childList: true });
  }

  function main() {
    initialize();
    setupNavigationObserver();
  }

  main();
})();
