document.addEventListener('DOMContentLoaded', () => {
    const anonymizeButton = document.getElementById('anonymize');
    const statusDiv = document.getElementById('status');

    anonymizeButton.addEventListener('click', async () => {
        statusDiv.textContent = 'Anonymizing page...';
        console.log('Button clicked'); // Debug log

        try {
            const tab = await browser.tabs.getCurrent();
            console.log('Current tab:', tab); // Debug log
            
            if (!tab) {
                throw new Error('No active tab found');
            }

            const response = await browser.tabs.sendMessage(tab.id, {
                action: 'anonymize'
            });
            
            console.log('Response from content script:', response); // Debug log
            statusDiv.textContent = 'Page anonymized!';
        } catch (error) {
            console.error('Extension error:', error);
            statusDiv.textContent = 'Error: ' + error.message;
        }
    });
});
