(function () {
  "use strict";

  const SELECTORS = {
    file: [
      '[data-testid="file-diff-view"]',
      '[data-testid="file-header"]',
      "[data-tagsearch-path]",
      ".file.js-file",
      ".file-diff-split",
      ".file-diff-unified",
      "[data-path]",
    ],
    fileName: [
      '[data-testid="file-header"] [data-testid="file-name"]',
      '[data-testid="file-header"] .Link--primary',
      "[data-tagsearch-path]",
      "[data-path]",
      ".file-header [title]",
      ".file-info a[title]",
    ],
    diffRows: [
      '[data-testid="file-diff-view"] tr',
      "tr[data-hunk]",
      "tr:has(.blob-code)",
      ".react-code-text",
      "tr.blob-code-hunk",
    ],
    addedLines: [
      ".blob-code-addition",
      '[data-code-marker="+"]',
      '.react-code-text[data-code-marker="+"]',
    ],
    removedLines: [
      ".blob-code-deletion",
      '[data-code-marker="-"]',
      '.react-code-text[data-code-marker="-"]',
    ],
    codeContent: [".blob-code-inner", ".react-code-text", ".blob-code"],
  };

  const SEVERITY_COLORS = {
    high: "#dc3545",
    medium: "#fd7e14",
    low: "#28a745",
    standards: "#6f42c1",
    default: "#6c757d",
  };

  const NOTIFICATION_COLORS = {
    error: "#dc3545",
    warning: "#fd7e14",
    success: "#28a745",
  };

  // State
  let isAnalyzing = false;
  let floatingButton = null;
  let navigationButtons = null;
  let currentSuggestionIndex = 0;
  let totalSuggestions = 0;

  // Storage utilities
  function getApiKey() {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== "undefined" && chrome.storage?.sync) {
          chrome.storage.sync.get(["apiKey"], (result) => {
            if (chrome.runtime.lastError) {
              console.warn("Storage error:", chrome.runtime.lastError);
              resolve(localStorage.getItem("ai-review-api-key") || null);
            } else {
              resolve(result.apiKey || null);
            }
          });
        } else {
          resolve(localStorage.getItem("ai-review-api-key") || null);
        }
      } catch (error) {
        console.warn("Storage access failed:", error);
        resolve(localStorage.getItem("ai-review-api-key") || null);
      }
    });
  }

  function getModals() {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== "undefined" && chrome.storage?.sync) {
          chrome.storage.sync.get(["selectedModel"], (result) => {
            if (chrome.runtime.lastError) {
              console.warn("Storage error:", chrome.runtime.lastError);
              resolve(localStorage.getItem("ai-review-selected-model") || null);
            } else {
              resolve(result.selectedModel || null);
            }
          });
        } else {
          resolve(localStorage.getItem("ai-review-selected-model") || null);
        }
      } catch (error) {
        console.warn("Storage access failed:", error);
        resolve(localStorage.getItem("ai-review-selected-model") || null);
      }
    });
  }

  // Dark mode detection
  function isDarkMode() {
    return (
      document.documentElement.getAttribute("data-color-mode") === "dark" ||
      document.documentElement.getAttribute("data-theme") === "dark" ||
      document.body.classList.contains("dark") ||
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  }

  // UI Components
  function createFloatingButton() {
    if (floatingButton) {
      floatingButton.remove();
    }

    floatingButton = document.createElement("div");
    floatingButton.id = "code-review-assistant-btn";

    const buttonInner = document.createElement("div");
    buttonInner.style.cssText = getButtonStyles();

    const icon = createButtonIcon();
    const text = createButtonText();

    buttonInner.appendChild(icon);
    buttonInner.appendChild(text);
    floatingButton.appendChild(buttonInner);

    addButtonEventListeners(buttonInner);
    document.body.appendChild(floatingButton);

    return floatingButton;
  }

  function createNavigationButtons() {
    if (navigationButtons) {
      navigationButtons.remove();
    }

    navigationButtons = document.createElement("div");
    navigationButtons.id = "suggestion-navigation";
    navigationButtons.style.cssText = `
      position: fixed;
      top: 130px;
      right: 20px;
      z-index: 9999;
      display: none;
      flex-direction: column;
      gap: 5px;
    `;

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
    button.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      width: 30px;
      height: 30px;
      border-radius: 15px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    button.textContent = text;
    button.title = title;
    button.addEventListener("click", onClick);

    button.addEventListener("mouseenter", function () {
      this.style.transform = "scale(1.1)";
      this.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
    });

    button.addEventListener("mouseleave", function () {
      this.style.transform = "scale(1)";
      this.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
    });

    return button;
  }

  function createSuggestionCounter() {
    const counter = document.createElement("div");
    counter.id = "suggestion-counter";
    counter.style.cssText = `
      background: rgba(102, 126, 234, 0.9);
      color: white;
      padding: 4px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 500;
      text-align: center;
      min-width: 30px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    return counter;
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

  function getButtonStyles() {
    return `
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 9999;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 10px 14px;
        border-radius: 20px;
        cursor: pointer;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        transition: all 0.2s;
        user-select: none;
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 120px;
        justify-content: center;
      `;
  }

  function createButtonIcon() {
    const icon = document.createElement("span");
    icon.id = "btn-icon";
    icon.textContent = "🔍";
    return icon;
  }

  function createButtonText() {
    const text = document.createElement("span");
    text.id = "btn-text";
    text.textContent = "AI Review";
    return text;
  }

  function addButtonEventListeners(buttonInner) {
    buttonInner.addEventListener("mouseenter", function () {
      this.style.transform = "translateY(-1px)";
      this.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
    });

    buttonInner.addEventListener("mouseleave", function () {
      this.style.transform = "translateY(0)";
      this.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
    });

    buttonInner.addEventListener("click", handleAnalyzeClick);
  }

  function updateButtonState(isLoading) {
    const btnIcon = document.getElementById("btn-icon");
    const btnText = document.getElementById("btn-text");

    if (isLoading) {
      btnIcon.textContent = "⏳";
      btnText.textContent = "Analyzing...";
    } else {
      btnIcon.textContent = "🔍";
      btnText.textContent = "AI Review";
    }
  }

  // main func
  async function handleAnalyzeClick() {
    if (isAnalyzing) return;

    try {
      isAnalyzing = true;
      updateButtonState(true); // Keep this for overall state
      clearPreviousSuggestions();
      hideNavigationButtons();

      const allDiffData = extractDiffData(); // Get all file diffs
      if (!allDiffData || allDiffData.length === 0) {
        showNotification("No code changes found to analyze", "warning");
        // Ensure isAnalyzing is reset before returning
        isAnalyzing = false;
        updateButtonState(false);
        return;
      }

      const apiKey = await getApiKey();
      if (!apiKey) {
        showNotification(
          "Please configure API key in extension options",
          "error"
        );
        openOptionsPage();
        // Ensure isAnalyzing is reset before returning
        isAnalyzing = false;
        updateButtonState(false);
        return;
      }

      let allSuggestions = [];
      const totalFiles = allDiffData.length;
      let filesProcessed = 0;

      // Get the button text element once
      const btnText = document.getElementById("btn-text");
      const originalBtnText = btnText ? btnText.textContent : "AI Review"; // Store original text

      for (const fileDiff of allDiffData) {
        filesProcessed++;
        if (btnText) {
          // Update button text to show progress
          btnText.textContent = `Analyzing ${filesProcessed}/${totalFiles}...`;
        }

        try {
          // Pass only ONE file's diff data, wrapped in an array,
          // and the specific file name for better prompt context.
          const suggestionsForFile = await analyzeCodeDiff(
            [fileDiff],
            apiKey,
            fileDiff.fileName
          );
          if (suggestionsForFile && suggestionsForFile.length > 0) {
            allSuggestions.push(...suggestionsForFile);
          }
        } catch (fileError) {
          console.error(
            `Error analyzing file ${fileDiff.fileName}:`,
            fileError
          );
          showNotification(
            `Error analyzing ${fileDiff.fileName
              .split("/")
              .pop()}: ${fileError.message.substring(0, 100)}`,
            "error"
          );
          // Optionally, decide if you want to continue with other files or stop.
          // For now, we'll let it continue.
        }
      }

      handleAnalysisResults(allSuggestions, allDiffData); // Pass original allDiffData for injection
    } catch (error) {
      console.error("Analysis error:", error);
      showNotification(
        "Analysis failed: " + error.message + " try again",
        "error"
      );
    } finally {
      isAnalyzing = false;
      updateButtonState(false); // This will reset icon and text
      // If btnText was updated, ensure it's fully reset by updateButtonState
      // If updateButtonState doesn't reset text correctly, uncomment below:
      // if (btnText) btnText.textContent = originalBtnText;
    }
  }

  function openOptionsPage() {
    try {
      chrome.runtime.sendMessage({ action: "openOptions" });
    } catch (e) {
      console.warn("Could not open options:", e);
    }
  }

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

  // diff extract
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

    // fallback
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

  function getCodingStandards() {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== "undefined" && chrome.storage?.sync) {
          chrome.storage.sync.get(["codingStandards"], (result) => {
            if (chrome.runtime.lastError) {
              console.warn("Storage error:", chrome.runtime.lastError);
              resolve(localStorage.getItem("ai-review-coding-standards") || "");
            } else {
              resolve(result.codingStandards || "");
            }
          });
        } else {
          resolve(localStorage.getItem("ai-review-coding-standards") || "");
        }
      } catch (error) {
        console.warn("Storage access failed:", error);
        resolve(localStorage.getItem("ai-review-coding-standards") || "");
      }
    });
  }

  // AI Call
  async function analyzeCodeDiff(
    diffDataForOneFile,
    apiKey,
    currentFileName = null
  ) {
    // Added currentFileName
    const diffText = formatDiffForAnalysis(diffDataForOneFile); // This will now format only one file

    // If the diffText for this single file is empty (e.g. only metadata changes, or empty file)
    // you might want to skip the API call.
    if (
      !diffText.trim() ||
      (diffText.includes("File: ") && diffText.split("\n").length < 3)
    ) {
      // Basic check for meaningful content
      console.log(
        `Skipping analysis for ${
          currentFileName || "a file"
        } as diff content is minimal.`
      );
      return []; // Return empty array, no suggestions
    }

    const codingStandards = await getCodingStandards();
    const modal = await getModals();

    // Pass currentFileName to the prompt creation
    const prompt = createAnalysisPrompt(
      diffText,
      codingStandards,
      currentFileName
    );

    const selectedModel = modal || "models/gemini-2.0-flash-thinking-exp-01-21"; // Ensure you are using a model suitable for your needs

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
            maxOutputTokens: 4096, // This is for OUTPUT, input limit is often implicit or different
          },
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text(); // Try to get more details from the error
      console.error("API Error Body:", errorBody);
      throw new Error(
        `API Error: ${response.status} for ${
          currentFileName || "a file"
        }. ${errorBody.substring(0, 200)}`
      );
    }

    const data = await response.json();

    // Check for blocked prompt or other API issues
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
        throw new Error(
          `No response from AI for ${
            currentFileName || "a file"
          }, please try again or check the model.`
        );
      }
    }

    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      // This case should ideally be caught by the candidates check above
      throw new Error(
        `No response text from AI for ${
          currentFileName || "a file"
        }, please try again.`
      );
    }

    return parseAIResponse(responseText, currentFileName); // Pass filename for context in parsing/error
  }

  function createAnalysisPrompt(
    diffText,
    codingStandards = "",
    fileName = null
  ) {
    // Added fileName
    let promptIntro;
    if (fileName) {
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
    fileName ? fileName.split("/").pop() : "exact_file_name_being_analyzed"
  }", // AI should fill this with the correct file name provided
  "lineNumber": line_number_within_the_diff_of_this_file, // Ensure this is the line number within the provided diff context
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
    fileName ? fileName.split("/").pop() : "the file name being analyzed"
  }". If the provided diff is for 'src/components/MyComponent.js', the JSON output for fileName should be 'MyComponent.js' or 'src/components/MyComponent.js'.
  - The "lineNumber" MUST correspond to a line number present in the ADDED (prefixed with '+') lines of the diff for this specific file.
  - If no issues are found for this specific file, return an empty array [].
  - Do NOT include suggestions for unchanged or removed lines unless they directly relate to an issue in an added line.
  - Be concise and actionable.

  DIFF TO ANALYZE (for ${fileName || "the request"}):
  ${diffText}
  
  Return only the JSON array, no other text, even if no suggestions are found (return [] in that case).
  `;

    return prompt;
  }

  function formatDiffForAnalysis(diffData) {
    // diffData will now be an array with a single file's diff
    let result = "";

    diffData.forEach((file) => {
      // This loop will run once
      result += `\n--- File: ${file.fileName} ---\n`; // Use the full fileName here for context

      let addedLinesPresent = false;
      const fileLinesContent = file.lines
        .map((line) => {
          const prefix =
            line.type === "added" ? "+" : line.type === "removed" ? "-" : " ";
          if (line.type === "added") addedLinesPresent = true;
          return `${prefix} ${String(line.lineNumber || "").padEnd(4)}: ${
            line.content
          }`;
        })
        .join("\n");

      if (!addedLinesPresent && file.lines.length > 0) {
        // If there are lines but none are additions, it might be a file mode change, deletion, or just context.
        // The AI might not have much to comment on, or the prompt instructs it to focus on added lines.
        // For now, we send it, but this is a place for potential optimization if it causes issues.
        result += fileLinesContent + "\n";
      } else if (addedLinesPresent) {
        result += fileLinesContent + "\n";
      } else {
        // No lines at all for this file in diffData (should not happen if extractDiffData is correct)
        // Or, no added lines and no other lines. Effectively empty for review.
        return ""; // Return empty string if no relevant content to analyze for this file
      }
    });

    return result;
  }

  function parseAIResponse(responseText, fileNameContext = "current file") {
    // Added context for errors
    try {
      // The model should return JSON directly. If it's wrapped in markdown, attempt to extract.
      let jsonString = responseText.trim();
      if (jsonString.startsWith("```json")) {
        jsonString = jsonString.substring(7);
        if (jsonString.endsWith("```")) {
          jsonString = jsonString.substring(0, jsonString.length - 3);
        }
      }

      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        console.warn(
          `AI response for ${fileNameContext} is not a JSON array:`,
          parsed
        );
        return [];
      }
      return parsed;
    } catch (e) {
      console.warn(
        `Failed to parse AI response for ${fileNameContext}:`,
        e.message,
        "Response was:",
        responseText.substring(0, 500)
      );
      if (!responseText.trim().startsWith("[") && responseText.length < 300) {
        showNotification(
          `AI Error (${fileNameContext}): ${responseText.substring(0, 100)}`,
          "warning"
        );
      }
    }
    return [];
  }

  // suggestion injection
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
      // Check if suggestion.fileName (from AI) is part of file.fileName (from DOM)
      // OR if file.fileName (from DOM) is part of suggestion.fileName (from AI)
      // This handles cases where one is a full path and the other is just the basename.
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

    const tolerance = 2;
    let potentialLines = targetFile.lines.filter(
      (line) => Math.abs(line.lineNumber - suggestion.lineNumber) <= tolerance
    );

    foundLine = potentialLines.find((line) => line.type === "added");
    if (foundLine) return foundLine;

    if (potentialLines.length > 0) {
      potentialLines.sort(
        (a, b) =>
          Math.abs(a.lineNumber - suggestion.lineNumber) -
          Math.abs(b.lineNumber - suggestion.lineNumber)
      );
      return potentialLines[0];
    }

    console.warn(
      "Could not precisely find target line for suggestion:",
      suggestion,
      "in file:",
      targetFile.fileName
    );
    return null;
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
          // Update navigation after removing suggestion
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

  function clearPreviousSuggestions() {
    document
      .querySelectorAll(".ai-suggestion-row")
      .forEach((row) => row.remove());

    // Reset navigation state
    currentSuggestionIndex = 0;
    totalSuggestions = 0;
    hideNavigationButtons();
  }

  function showNotification(message, type) {
    const notification = document.createElement("div");
    notification.style.cssText = `
        position: fixed;
        top: 140px;
        right: 20px;
        z-index: 10001;
        background: ${NOTIFICATION_COLORS[type] || NOTIFICATION_COLORS.success};
        color: white;
        padding: 10px 14px;
        border-radius: 6px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        max-width: 280px;
        word-wrap: break-word;
      `;
    notification.textContent = message;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
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
      }, 1500);
    } else {
      if (floatingButton) {
        floatingButton.remove();
        floatingButton = null;
      }
      if (navigationButtons) {
        navigationButtons.remove();
        navigationButtons = null;
      }
    }
  }

  // navigation handling for SPA
  function setupNavigationObserver() {
    let lastUrl = location.href;

    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        setTimeout(initialize, 1000);
      }
    }).observe(document, { subtree: true, childList: true });
  }

  function main() {
    initialize();
    setupNavigationObserver();
  }

  main();
})();
