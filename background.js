chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "refreshPage") {
        chrome.tabs.reload(sender.tab.id);
    }
});

console.log("Browser started, checking daily automation status...");

chrome.storage.local.get(['dailyStats'], (result) => {
    const today = new Date().toDateString();
    const stats = result.dailyStats;

    // Check if the iterations have already reached the daily limit
    if (stats && stats.date === today && stats.successfulIterations >= 25) {
        console.log('Daily limit reached. No automation will be performed.');
    } else {
        // Open a new tab with the target URL if the limit has not been reached
        chrome.tabs.create({ url: "https://testnet.dashboard.burnt.com" }, (tab) => {
            console.log("Opened Burnt Dashboard for automation.");
        });
    }
});
