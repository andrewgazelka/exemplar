class BackgroundHandler {
  constructor() {
    this.API_URL = "https://api.anthropic.com/v1/messages";
    this.setupListeners();
  }

  setupListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "anonymize_text") {
        this.handleAnonymization(request.texts)
          .then(sendResponse)
          .catch((error) => sendResponse({ error: error.message }));
        return true;
      }
    });
  }

  async handleAnonymization(texts) {
    const prompt = {
      tools: [{
        name: "anonymize_text",
        description: "Anonymize personally identifiable information in text",
        input_schema: {
          type: "object",
          properties: {
            result: {
              type: "object",
              properties: {
                anonymized_text: {
                  type: "string",
                  description: "The anonymized version of the input text"
                }
              },
              required: ["anonymized_text"]
            }
          },
          required: ["result"]
        }
      }],
      tool_choice: { type: "tool", name: "anonymize_text" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Replace any personally identifiable information with realistic alternatives. Original text: ${JSON.stringify(texts)}`
            }
          ]
        }
      ],
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024
    };

    try {
      const response = await fetch(this.API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "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",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify(prompt)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API request failed: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
        // Get the anonymized text directly from the input.result object
        const anonymizedText = data.content[0].input.result.anonymized_text;
        
        console.log(anonymizedText);
        
        // Try to parse if it's a string representation of an array
        try {
          const parsed = JSON.parse(anonymizedText);
          return { anonymizedTexts: parsed };
        } catch {
          // If it's not JSON, return as is
          return { anonymizedTexts: anonymizedText };
        }
    } catch (error) {
      if (error.message.includes("rate_limit_error")) {
        throw new Error("Rate limit exceeded. Please try again later.");
      } else if (error.message.includes("authentication_error")) {
        throw new Error("Authentication failed. Please check your API key.");
      } else if (error.message.includes("invalid_request_error")) {
        throw new Error("Invalid request format. Please check your input.");
      } else {
        throw error;
      }
    }
  }
}

new BackgroundHandler();
