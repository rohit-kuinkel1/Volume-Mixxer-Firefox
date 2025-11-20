/// <reference types="firefox-webext-browser" />

import type { BackgroundMessage } from "./types/messages";

(() => {
  function handleError(error: unknown): void {
    if (error instanceof Error) {
      console.error(`VolumeMixxer: Error: ${error.message}`);
    } else {
      console.error("VolumeMixxer: Unknown error", error);
    }
  }

  function onTabActivated(
    activeInfo: browser.tabs._OnActivatedActiveInfo
  ): void {
    browser.tabs
      .sendMessage(activeInfo.tabId, { command: "initializeTab" })
      .catch(handleError);
  }

  function onTabUpdated(
    tabId: number,
    changeInfo: browser.tabs._OnUpdatedChangeInfo,
    _tab: browser.tabs.Tab
  ): void {
    if (changeInfo.status === "complete") {
      browser.tabs
        .sendMessage(tabId, { command: "initializeTab" })
        .catch(handleError);
    }
  }

  async function updateBadge(
    percentage: number,
    tabId?: number
  ): Promise<void> {
    if (!browser.browserAction?.setIcon) {
      return;
    }

    try {
      const targetTabId =
        tabId ??
        (await browser.tabs.query({ currentWindow: true, active: true })).find(
          (t) => typeof t.id === "number"
        )?.id;

      if (typeof targetTabId !== "number") {
        return;
      }

      const clamped = Math.min(Math.max(Math.round(percentage), 0), 400);
      const isMuted = clamped === 0;
      const badgeText = isMuted ? "" : String(clamped);
      const ICON_PATH = "images/wave.svg";

      await browser.browserAction.setIcon({
        path: {
          32: ICON_PATH,
          64: ICON_PATH,
          128: ICON_PATH,
        },
        tabId: targetTabId,
      });
      await browser.browserAction.setBadgeText({
        text: badgeText,
        tabId: targetTabId,
      });
      await browser.browserAction.setBadgeBackgroundColor({
        color: "#000000",
        tabId: targetTabId,
      });

      const browserActionWithColor = browser.browserAction as unknown as {
        setBadgeTextColor?: (details: {
          color: string | number[];
          tabId?: number;
        }) => Promise<void>;
      };

      if (browserActionWithColor.setBadgeTextColor) {
        await browserActionWithColor.setBadgeTextColor({
          color: "#75c8ff",
          tabId: targetTabId,
        });
      }
    } catch (error) {
      handleError(error);
    }
  }

  async function handleMessage(
    message: BackgroundMessage,
    sender: browser.runtime.MessageSender
  ): Promise<unknown> {
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

        case "updateBadge": {
          if (typeof message.percentage === "number" && sender.tab?.id) {
            await updateBadge(message.percentage, sender.tab.id);
          }
          return { response: true };
        }
      }
    } catch (error) {
      handleError(error);
      throw error;
    }
  }

  browser.tabs.onActivated.addListener(onTabActivated);
  browser.tabs.onUpdated.addListener(onTabUpdated);
  browser.runtime.onMessage.addListener(handleMessage);
})();
