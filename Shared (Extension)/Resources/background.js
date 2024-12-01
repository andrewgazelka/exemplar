class BackgroundHandler {
  constructor() {
    this.API_URL = "https://api.anthropic.com/v1/messages";
    this.setupListeners();
  }

  setupListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "anonymize_text") {
        this.handleAnonymization(request.texts, request.apiKey)
          .then(sendResponse)
          .catch((error) => sendResponse({ error: error.message }));
        return true;
      }
    });
  }

  async handleAnonymization(texts, apiKey) {
    if (!apiKey) {
      throw new Error('API key is required');
    }

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
                anonymization_map: {
                  type: "object",
                  description: "A mapping of original text to anonymized versions",
                  additionalProperties: {
                    type: "string",
                    description: "The anonymized version of the original text"
                  }
                }
              },
              required: ["anonymization_map"]
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
              text: `Create a mapping where each key is an original text and its value is the anonymized version. Replace any personally identifiable information with realistic alternatives, maintaining consistency across replacements. Original texts: ${JSON.stringify(texts)}`
            }
          ]
        }
      ],
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024
    };

    console.log(prompt);

    try {
      const response = await fetch(this.API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify(prompt)
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API request failed: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('Parsed response:', data);

      const anonymizationMap = data.content[0].input.result.anonymization_map;
      console.log('Anonymization map:', anonymizationMap);

      return { anonymizedTexts: anonymizationMap };
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
