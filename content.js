const RECIPIENT_ADDRESS = 'xion16evalya9vxgqjahqzrycenjd6dwssyq8uxc0nzpd2nz67l77avesxcddf9';
const TOTAL_ITERATIONS = 25;
const RETRY_DELAY = 15000; // 15 seconds
const PAGE_LOAD_DELAY = 10000; // 5 seconds

let dailyStats = {
    date: new Date().toDateString(),
    successfulIterations: 0,
    totalAttempts: 0
};

async function loadDailyStats() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['dailyStats'], (result) => {
            if (result.dailyStats && result.dailyStats.date === new Date().toDateString()) {
                dailyStats = result.dailyStats;
            } else {
                dailyStats = {
                    date: new Date().toDateString(),
                    successfulIterations: 0,
                    totalAttempts: 0
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

async function startAutomation() {
    await loadDailyStats();

    if (dailyStats.successfulIterations >= TOTAL_ITERATIONS) {
        console.log('Daily limit reached. Automation will resume tomorrow.');
        return;
    }

    console.log(`Starting iteration ${dailyStats.successfulIterations + 1} of ${TOTAL_ITERATIONS}`);
    dailyStats.totalAttempts++;

    try {
        await runSingleIteration();

        dailyStats.successfulIterations++;
        await saveDailyStats();

        console.log(`Completed iteration ${dailyStats.successfulIterations} of ${TOTAL_ITERATIONS}`);

        if (dailyStats.successfulIterations < TOTAL_ITERATIONS) {
            setTimeout(startAutomation, 8000);
        } else {
            console.log('Daily automation completed successfully!');
        }
    } catch (error) {
        console.error('Error in automation:', error);
        await saveDailyStats();

        // Refresh the page and retry
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

function waitForElement(selector, minCount = 1) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            observer.disconnect();
            reject(`Timeout waiting for ${selector}`);
        }, 20000);

        const observer = new MutationObserver((mutations, obs) => {
            const elements = document.querySelectorAll(selector);
            if (elements.length >= minCount) {
                clearTimeout(timeout);
                obs.disconnect();
                resolve(elements);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
        });

        const elements = document.querySelectorAll(selector);
        if (elements.length >= minCount) {
            clearTimeout(timeout);
            observer.disconnect();
            resolve(elements);
        }
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
        numberInput.value = '0.01';
        numberInput.dispatchEvent(new Event('input', { bubbles: true }));
        numberInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const recipientInput = await findInputInDialog(dialog, '[data-testid="recipient-input"]');
    if (recipientInput) {
        recipientInput.value = RECIPIENT_ADDRESS;
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

function waitForButtonWithText(text) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            observer.disconnect();
            reject(`Timeout waiting for ${text} button`);
        }, 20000);

        const observer = new MutationObserver((mutations, obs) => {
            const button = Array.from(document.querySelectorAll('button')).find(
                btn => btn.textContent.trim() === text
            );
            if (button) {
                clearTimeout(timeout);
                obs.disconnect();
                resolve(button);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        const button = Array.from(document.querySelectorAll('button')).find(
            btn => btn.textContent.trim() === text
        );
        if (button) {
            clearTimeout(timeout);
            observer.disconnect();
            resolve(button);
        }
    });
}

// Start automation when page loads
window.addEventListener('load', () => {
    setTimeout(startAutomation, PAGE_LOAD_DELAY);
});

// Also handle if the page is refreshed due to an error
if (document.readyState === 'complete') {
    setTimeout(startAutomation, PAGE_LOAD_DELAY);
}