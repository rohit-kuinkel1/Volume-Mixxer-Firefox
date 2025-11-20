/// <reference types="firefox-webext-browser" />
(() => {
    function handleError(error) {
        if (error instanceof Error) {
            console.error(`VolumeMixxer: Error: ${error.message}`);
        }
        else {
            console.error("VolumeMixxer: Unknown error", error);
        }
    }
    function onTabActivated(activeInfo) {
        browser.tabs
            .sendMessage(activeInfo.tabId, { command: "initializeTab" })
            .catch(handleError);
    }
    function onTabUpdated(tabId, changeInfo, _tab) {
        if (changeInfo.status === "complete") {
            browser.tabs.sendMessage(tabId, { command: "initializeTab" }).catch(handleError);
        }
    }
    async function handleMessage(message) {
        try {
            switch (message.command) {
                case "getAudibleTabs": {
                    const tabs = await browser.tabs.query({ audible: true });
                    return {
                        tabs: tabs.map((tab) => ({
                            id: tab.id,
                            title: tab.title,
                            favIconUrl: tab.favIconUrl,
                            url: tab.url,
                        })),
                    };
                }
                case "updateTab": {
                    if (typeof message.tabId !== "number" || !message.subCommand) {
                        throw new Error("Invalid updateTab parameters");
                    }
                    return browser.tabs.sendMessage(message.tabId, {
                        command: message.subCommand,
                        value: message.value,
                    });
                }
            }
        }
        catch (error) {
            handleError(error);
            throw error;
        }
        return null;
    }
    browser.tabs.onActivated.addListener(onTabActivated);
    browser.tabs.onUpdated.addListener(onTabUpdated);
    browser.runtime.onMessage.addListener(handleMessage);
})();
