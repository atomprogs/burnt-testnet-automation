document.addEventListener('DOMContentLoaded', function () {
    loadConfig();
    loadStats();
    document.getElementById('saveConfig').addEventListener('click', saveConfig);
});

function loadConfig() {
    chrome.storage.local.get(['config'], function (result) {
        const config = result.config || {};
        document.getElementById('recipientAddress').value = config.recipientAddress || '';
        document.getElementById('minIterations').value = config.minIterations || 25;
        document.getElementById('maxIterations').value = config.maxIterations || 35;
        document.getElementById('minAmount').value = config.minAmount || 0.001;
        document.getElementById('maxAmount').value = config.maxAmount || 0.002;
    });
}

function saveConfig() {
    const config = {
        recipientAddress: document.getElementById('recipientAddress').value,
        minIterations: parseInt(document.getElementById('minIterations').value),
        maxIterations: parseInt(document.getElementById('maxIterations').value),
        minAmount: parseFloat(document.getElementById('minAmount').value),
        maxAmount: parseFloat(document.getElementById('maxAmount').value)
    };
    chrome.storage.local.set({ config: config }, function () {
        console.log('Configuration saved');
        alert('Configuration saved successfully!');
    });
}

function loadStats() {
    chrome.storage.local.get(['dailyStats'], function (result) {
        const stats = result.dailyStats || {};
        const statsDisplay = document.getElementById('statsDisplay');
        statsDisplay.innerHTML = `
            Date: ${stats.date || 'N/A'}<br>
            Target Iterations: ${stats.targetIterations || 'N/A'}<br>
            Successful Iterations: ${stats.successfulIterations || 0}<br>
            Total Attempts: ${stats.totalAttempts || 0}<br>
            Errors: ${stats.errors ? stats.errors.length : 0}
        `;
    });
}