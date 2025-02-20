function handleError(error) {
  console.error(`VolumeMixxer: Error: ${error.message}`);
}

function onTabActivated(activeInfo) {
  browser.tabs
    .sendMessage(activeInfo.tabId, { command: "initializeTab" })
    .catch(handleError);
}

function onTabUpdated(tabId, changeInfo, tab) {
  if (changeInfo.status === "complete") {
    browser.tabs
      .sendMessage(tabId, { command: "initializeTab" })
      .catch(handleError);
  }
}
function handleMessage(message) {
  try {
    switch (message.command) {
      case "getAudibleTabs":
        return browser.tabs.query({ audible: true }).then((tabs) => ({
          tabs: tabs.map((tab) => ({
            id: tab.id,
            title: tab.title,
            favIconUrl: tab.favIconUrl,
            url: tab.url,
          })),
        }));

      case "updateTab":
        if (!message.tabId || !message.subCommand) {
          throw new Error("Invalid updateTab parameters");
        }
        return browser.tabs.sendMessage(message.tabId, {
          command: message.subCommand,
          value: message.value,
        });

      default:
        console.warn(`Unhandled message command: ${message.command}`);
        return Promise.resolve(null);
    }
  } catch (error) {
    handleError(error);
    return Promise.reject(error);
  }
}

browser.tabs.onActivated.addListener(onTabActivated);
browser.tabs.onUpdated.addListener(onTabUpdated);
browser.runtime.onMessage.addListener(handleMessage);
