// Browser API compatibility layer
const browserAPI = {
    runtime: chrome.runtime || browser.runtime,
    tabs: chrome.tabs || browser.tabs,
};

// Export for use in other files
window.browserAPI = browserAPI;
