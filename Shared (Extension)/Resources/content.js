class ContentAnonymizer {
  constructor() {
    this.processPage = this.processPage.bind(this);
    this.init();
    console.log("ContentAnonymizer initialized");
  }

  init() {
    browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log("Message received:", message);
      if (message.action === "anonymize") {
        this.processPage(message.apiKey)
          .then(() => {
            console.log("Page processing complete");
            sendResponse({ status: "complete" });
          })
          .catch((error) => {
            console.error("Processing error:", error);
            sendResponse({ status: "error", error: error.message });
          });
        return true;
      }
    });
  }

  async processPage(apiKey) {
    try {
      // Step 1: Collect text content
      const textMap = new Map();
      const selector =
        "p, a, span, h1, h2, h3, h4, h5, h6, div, label, li, td, th";
      const elements = document.querySelectorAll(selector);

      elements.forEach((element) => {
        // Skip elements that are not visible
        if (element.offsetParent === null) {
          return;
        }

        // Get direct text content, excluding child elements
        const walker = document.createTreeWalker(
          element,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );

        let node;
        while ((node = walker.nextNode())) {
          const text = node.textContent.trim();
          if (text.length > 0) {
            if (!textMap.has(text)) {
              textMap.set(text, new Set([node]));
            } else {
              textMap.get(text).add(node);
            }
          }
        }
      });

      console.log("Collected unique text content:", textMap.size);

      // Step 2: Get anonymized versions
      console.log(
        "Requesting anonymization for texts:",
        Array.from(textMap.keys())
      );
      const response = await browserAPI.runtime.sendMessage({
        action: "anonymize_text",
        texts: Array.from(textMap.keys()),
        apiKey: apiKey,
      });

      console.log("Received response:", response);
      if (!response || !response.anonymizedTexts) {
        throw new Error("Invalid response from background script");
      }

      // Step 3: Replace all occurrences
      for (const [originalText, nodes] of textMap.entries()) {
        nodes.forEach((node) => {
          node.textContent = node.textContent.replace(
            originalText,
            response.anonymizedTexts[originalText]
          );
        });
      }
    } catch (error) {
      console.error("Anonymization error:", error);
      throw error;
    }
  }
}

// Initialize the anonymizer
console.log("Content script loaded");
const anonymizer = new ContentAnonymizer();
