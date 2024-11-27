class ContentAnonymizer {
    constructor() {
        this.processPage = this.processPage.bind(this);
        this.init();
        console.log('ContentAnonymizer initialized'); // Debug log
    }

    init() {
        browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('Message received:', message); // Debug log
            if (message.action === 'anonymize') {
                this.processPage().then(() => {
                    console.log('Page processing complete'); // Debug log
                    sendResponse({ status: 'complete' });
                }).catch(error => {
                    console.error('Processing error:', error);
                    sendResponse({ status: 'error', error: error.message });
                });
                return true; // Important: needed for async response
            }
        });
    }

    async processPage() {
        console.log('Starting page processing'); // Debug log
        const textNodes = this.getTextNodes(document.body);
        console.log('Found text nodes:', textNodes.length); // Debug log

        const batchSize = 5;
        for (let i = 0; i < textNodes.length; i += batchSize) {
            const batch = textNodes.slice(i, i + batchSize);
            const texts = batch.map(node => node.textContent);
            
            try {
                console.log('Processing batch:', i/batchSize + 1); // Debug log
                const anonymizedTexts = await this.anonymizeTexts(texts);
                batch.forEach((node, index) => {
                    node.textContent = anonymizedTexts[index];
                });
            } catch (error) {
                console.error('Anonymization error:', error);
                throw error; // Propagate error up
            }
        }
    }

    getTextNodes(node) {
        const textNodes = [];
        // Select only p, a, and span elements
        const elements = node.querySelectorAll('p, a, span');
        
        elements.forEach(element => {
            // Get direct text nodes of these elements
            const walk = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: function(node) {
                        // Only accept direct text nodes that have non-whitespace content
                        if (node.parentNode === element && node.textContent.trim()) {
                            return NodeFilter.FILTER_ACCEPT;
                        }
                        return NodeFilter.FILTER_REJECT;
                    }
                },
                false
            );

            let currentNode;
            while (currentNode = walk.nextNode()) {
                textNodes.push(currentNode);
            }
        });

        return textNodes;
    }

    async anonymizeTexts(texts) {
        console.log('Sending texts to background:', texts); // Debug log
        const response = await browser.runtime.sendMessage({
            action: 'anonymize_text',
            texts: texts
        });
        console.log('Received response:', response); // Debug log
        if (!response || !response.anonymizedTexts) {
            throw new Error('Invalid response from background script');
        }
        return response.anonymizedTexts;
    }
}

// Ensure the script is loaded and initialized
console.log('Content script loaded');
const anonymizer = new ContentAnonymizer();
