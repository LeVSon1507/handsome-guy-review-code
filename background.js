chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "openOptions") {
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({
      url: "options.html",
    });
  }
});
