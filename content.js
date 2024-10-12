const DEFAULT_CONFIG = {
    recipientAddress: 'xion16evalya9vxgqjahqzrycenjd6dwssyq8uxc0nzpd2nz67l77avesxcddf9',
    minIterations: 25,
    maxIterations: 35,
    retryDelay: 15000,
    pageLoadDelay: 10000,
    minAmount: 0.001,
    maxAmount: 0.002
};

let config = DEFAULT_CONFIG;
let dailyStats = {
    date: new Date().toDateString(),
    successfulIterations: 0,
    totalAttempts: 0,
    errors: [],
    targetIterations: 0
};

async function loadConfig() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['config'], (result) => {
            config = { ...DEFAULT_CONFIG, ...result.config };
            console.log('Loaded config:', config);
            resolve();
        });
    });
}

async function loadDailyStats() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['dailyStats'], (result) => {
            const today = new Date().toDateString();
            if (result.dailyStats && result.dailyStats.date === today) {
                dailyStats = result.dailyStats;
            } else {
                dailyStats = {
                    date: today,
                    successfulIterations: 0,
                    totalAttempts: 0,
                    errors: [],
                    targetIterations: getRandomIterations(config.minIterations, config.maxIterations)
                };
            }
            console.log('Loaded daily stats:', dailyStats);
            resolve();
        });
    });
}

async function saveDailyStats() {
    return new Promise((resolve) => {
        chrome.storage.local.set({ dailyStats }, resolve);
    });
}

function getRandomIterations(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomAmount(min, max) {
    return (Math.random() * (max - min) + min).toFixed(3);
}

function logError(error) {
    console.error('Error:', error);
    dailyStats.errors.push({ timestamp: new Date().toISOString(), message: error.toString() });
    saveDailyStats();
}

async function startAutomation() {
    await loadConfig();
    await loadDailyStats();

    if (dailyStats.successfulIterations >= dailyStats.targetIterations) {
        console.log('Daily target reached. Automation will resume tomorrow.');
        return;
    }

    console.log(`Starting iteration ${dailyStats.successfulIterations + 1} of ${dailyStats.targetIterations}`);
    dailyStats.totalAttempts++;

    try {
        await runSingleIteration();
        dailyStats.successfulIterations++;
        await saveDailyStats();

        if (dailyStats.successfulIterations < dailyStats.targetIterations) {
            setTimeout(startAutomation, config.retryDelay);
        } else {
            console.log('Daily automation completed successfully!');
        }
    } catch (error) {
        logError(error);
        await saveDailyStats();
        chrome.runtime.sendMessage({ action: "refreshPage" });
    }
}

async function runSingleIteration() {
    await waitForElement('#root button[data-state]', 2);
    await clickSecondButton();
    await waitForElement('div[role="dialog"]');
    await fillDialog();
    await waitAndClickButton('REVIEW');
    await waitAndClickButton('CONFIRM');
    await waitAndClickButton('GOTCHA');
}

function waitForElement(selector, minCount = 1, timeout = 20000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const checkElement = () => {
            const elements = document.querySelectorAll(selector);
            if (elements.length >= minCount) {
                resolve(elements);
            } else if (Date.now() - startTime > timeout) {
                reject(`Timeout waiting for ${selector}`);
            } else {
                setTimeout(checkElement, 100);
            }
        };
        checkElement();
    });
}

async function clickSecondButton() {
    const buttons = await waitForElement('#root button[data-state]', 2);
    buttons[1].click();
    console.log('Clicked second button');
}

async function fillDialog() {
    const dialog = (await waitForElement('div[role="dialog"]'))[0];

    const numberInput = await findInputInDialog(dialog, 'input[type="number"]');
    if (numberInput) {
        const amount = getRandomAmount(config.minAmount, config.maxAmount);
        numberInput.value = amount.toString();
        numberInput.dispatchEvent(new Event('input', { bubbles: true }));
        numberInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const recipientInput = await findInputInDialog(dialog, '[data-testid="recipient-input"]');
    if (recipientInput) {
        recipientInput.value = config.recipientAddress;
        recipientInput.dispatchEvent(new Event('input', { bubbles: true }));
        recipientInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

async function findInputInDialog(dialog, selector) {
    return new Promise((resolve) => {
        const findInput = () => {
            const input = dialog.querySelector(selector);
            if (input) {
                resolve(input);
            } else {
                setTimeout(findInput, 500);
            }
        };
        findInput();
    });
}

async function waitAndClickButton(text) {
    const button = await waitForButtonWithText(text);
    button.click();
    console.log(`Clicked ${text} button`);
}

function waitForButtonWithText(text, timeout = 20000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const checkButton = () => {
            const button = Array.from(document.querySelectorAll('button')).find(
                btn => btn.textContent.trim() === text
            );
            if (button) {
                resolve(button);
            } else if (Date.now() - startTime > timeout) {
                reject(`Timeout waiting for ${text} button`);
            } else {
                setTimeout(checkButton, 100);
            }
        };
        checkButton();
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startAutomation") {
        startAutomation();
    }
});

// Also handle if the page is refreshed due to an error
if (document.readyState === 'complete') {
    setTimeout(startAutomation, config.pageLoadDelay);
}