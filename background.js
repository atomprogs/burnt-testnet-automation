chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create("checkAutomation", { periodInMinutes: 60 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "checkAutomation") {
        checkAndStartAutomation();
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "refreshPage") {
        chrome.tabs.reload(sender.tab.id);
    }
});

function checkAndStartAutomation() {
    chrome.storage.local.get(['dailyStats', 'config'], (result) => {
        const today = new Date().toDateString();
        const stats = result.dailyStats || {};
        const config = result.config || {};

        if (!stats.date || stats.date !== today || stats.successfulIterations < stats.targetIterations) {
            chrome.tabs.query({ url: "https://testnet.dashboard.burnt.com/*" }, (tabs) => {
                if (tabs.length > 0) {
                    console.log("Dashboard tab already open. Starting automation.");
                    chrome.tabs.sendMessage(tabs[0].id, { action: "startAutomation" });
                } else {
                    console.log("Opening Burnt Dashboard for automation.");
                    chrome.tabs.create({ url: "https://testnet.dashboard.burnt.com" });
                }
            });
        } else {
            console.log('Daily target reached. No automation will be performed.');
        }
    });
}

// Initial check when the background script loads
checkAndStartAutomation();