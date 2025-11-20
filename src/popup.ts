/// <reference types="firefox-webext-browser" />

import type { BooleanResponse, NumberResponse } from "./types/messages";
import type { UIElements } from "./types/ui";

(() => {
  let ui: UIElements | null = null;
  let initialized = false;

  const ICON_PATH = "images/internal_images/wave.svg";

  function getElementOrThrow<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) {
      throw new Error(`VolumeMixxer: Missing element ${selector}`);
    }
    return element;
  }

  function ensureUI(): UIElements {
    if (!ui) {
      ui = {
        volumeSlider: getElementOrThrow<HTMLInputElement>("#volume-slider"),
        volumeText: getElementOrThrow<HTMLInputElement>("#volume-text"),
        muteCheckbox: getElementOrThrow<HTMLInputElement>("#mute-checkbox"),
        displayModeCheckBox:
          getElementOrThrow<HTMLInputElement>("#display-mode"),
        undoButton: getElementOrThrow<HTMLButtonElement>("#undo-button"),
        tabList: getElementOrThrow<HTMLUListElement>("#tab-list"),
        popupContent: getElementOrThrow<HTMLElement>("#popup-content"),
        errorContent: getElementOrThrow<HTMLElement>("#error-content"),
        body: getElementOrThrow<HTMLBodyElement>("body"),
      };
    }
    return ui;
  }

  async function getActiveTabId(): Promise<number | null> {
    const tabs = await browser.tabs.query({
      currentWindow: true,
      active: true,
    });
    const [tab] = tabs;
    return typeof tab?.id === "number" ? tab.id : null;
  }

  function clampVolume(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.min(Math.max(Math.round(value), 0), 400);
  }

  async function updateBrowserActionIcon(percentage: number): Promise<void> {
    if (!browser.browserAction?.setIcon) {
      return;
    }

    try {
      const tabId = await getActiveTabId();
      if (tabId === null) {
        return;
      }

      const clamped = clampVolume(percentage);
      const isMuted = clamped === 0;
      const badgeText = isMuted ? "" : String(clamped);

      await browser.browserAction.setIcon({
        path: {
          32: ICON_PATH,
          64: ICON_PATH,
          128: ICON_PATH,
        },
        tabId,
      });
      await browser.browserAction.setBadgeText({ text: badgeText, tabId });
      await browser.browserAction.setBadgeBackgroundColor({
        color: "#000000",
        tabId,
      });

      const browserActionWithColor = browser.browserAction as unknown as {
        setBadgeTextColor?: (details: { color: string | number[]; tabId?: number }) => Promise<void>;
      };

      if (browserActionWithColor.setBadgeTextColor) {
        await browserActionWithColor.setBadgeTextColor({ color: "#75c8ff", tabId });
      }
    } catch (error) {
      logError(error);
    }
  }

  function renderVolumeUI(percentage: number, skipMuteUpdate = false): void {
    const elements = ensureUI();
    const clamped = clampVolume(percentage);

    elements.volumeSlider.value = String(clamped);
    elements.volumeText.value = `${Math.round(clamped)}%`;

    if (!skipMuteUpdate) {
      elements.muteCheckbox.checked = clamped === 0;
    }

    void updateBrowserActionIcon(clamped);
  }

  async function setVolume(
    percentage: number,
    skipMuteUpdate = false
  ): Promise<void> {
    const clamped = clampVolume(percentage);
    renderVolumeUI(clamped, skipMuteUpdate);

    try {
      const tabId = await getActiveTabId();
      if (tabId !== null) {
        await browser.tabs.sendMessage(tabId, {
          command: "setVolume",
          percentage: clamped,
        });
      }
    } catch (error) {
      //content script not available; silently fail
      logError(error);
    }
  }

  async function toggleMute(
    isMuted: boolean,
    { updateVolume = true }: { updateVolume?: boolean } = {}
  ): Promise<void> {
    const elements = ensureUI();
    elements.muteCheckbox.checked = isMuted;

    if (updateVolume) {
      await setVolume(isMuted ? 0 : 100, true);
    } else {
      void updateBrowserActionIcon(
        isMuted ? 0 : Number(elements.volumeSlider.value)
      );
    }

    try {
      const tabId = await getActiveTabId();
      if (tabId !== null) {
        await browser.tabs.sendMessage(tabId, { command: "setMute", isMuted });
      }
    } catch (error) {
      //content script not available; silently fail
      logError(error);
    }
  }

  function toggleDisplayMode(
    isDayMode: boolean,
    { skipStorage = false }: { skipStorage?: boolean } = {}
  ): void {
    const elements = ensureUI();
    elements.displayModeCheckBox.checked = isDayMode;

    if (isDayMode) {
      elements.body.classList.add("day-mode");
      elements.body.classList.remove("night-mode");
    } else {
      elements.body.classList.remove("day-mode");
      elements.body.classList.add("night-mode");
    }

    if (!skipStorage) {
      localStorage.setItem("displayMode", String(isDayMode));
    }

    void getActiveTabId()
      .then((tabId) => {
        if (tabId !== null) {
          return browser.tabs.sendMessage(tabId, {
            command: "setDisplayMode",
            isDayMode,
          });
        }
        return undefined;
      })
      .catch(logError);
  }

  async function populateTabList(): Promise<void> {
    const elements = ensureUI();
    const tabList = elements.tabList;

    while (tabList.firstChild) {
      tabList.firstChild.remove();
    }

    try {
      const playingTabs = await browser.tabs.query({ audible: true });

      if (playingTabs.length === 0) {
        const listItem = document.createElement("li");
        listItem.textContent = "No tabs are playing audio right now";
        tabList.appendChild(listItem);
        tabList.classList.remove("hidden");
        return;
      }

      playingTabs.forEach((tab) => {
        if (typeof tab.id !== "number") {
          return;
        }

        const listItem = document.createElement("li");
        listItem.dataset.tabId = String(tab.id);

        const faviconImg = document.createElement("img");
        faviconImg.src = tab.favIconUrl ?? "";
        faviconImg.classList.add("favicon");

        const titleSpan = document.createElement("span");
        const titleText = tab.title ?? "Untitled";
        titleSpan.textContent = titleText;
        titleSpan.title = titleText;
        titleSpan.classList.add("title");

        const loopButton = createLoopButton(tab.id);

        listItem.appendChild(faviconImg);
        listItem.appendChild(titleSpan);
        listItem.appendChild(loopButton);
        tabList.appendChild(listItem);

        void browser.tabs
          .sendMessage(tab.id, { command: "getLoop" })
          .then((response) => {
            if ((response as BooleanResponse | undefined)?.response) {
              loopButton.classList.add("active");
            }
          })
          .catch(logError);
      });

      tabList.classList.remove("hidden");
    } catch (error) {
      logError(error);
    }
  }

  async function refreshActiveTabState(): Promise<void> {
    const storedMode = localStorage.getItem("displayMode");
    if (storedMode !== null) {
      toggleDisplayMode(storedMode === "true");
    }

    try {
      const tabId = await getActiveTabId();
      if (tabId === null) {
        return;
      }

      //try to communicate with content script, but dont show error if it fails
      try {
        await browser.tabs
          .sendMessage(tabId, { command: "getVolume" })
          .then((response) => {
            const volume = (response as NumberResponse | undefined)?.response;
            if (typeof volume === "number") {
              renderVolumeUI(volume);
            }
          });

        await browser.tabs
          .sendMessage(tabId, { command: "getDisplayMode" })
          .then((response) => {
            const isDayMode = (response as BooleanResponse | undefined)
              ?.response;
            if (typeof isDayMode === "boolean" && storedMode === null) {
              toggleDisplayMode(isDayMode, { skipStorage: true });
            }
          });

        await browser.tabs
          .sendMessage(tabId, { command: "getMute" })
          .then((response) => {
            const isMuted = (response as BooleanResponse | undefined)?.response;
            if (typeof isMuted === "boolean") {
              void toggleMute(isMuted, { updateVolume: false });
            }
          });
      } catch (error) {
        //content script not available (internal page, etc.), just log and continue
        logError(error);
      }
    } catch (error) {
      logError(error);
      showError(error);
    }
  }

  function attachEventListeners(): void {
    const elements = ensureUI();

    const updateVolumeFromSlider = (): void => {
      void setVolume(Number(elements.volumeSlider.value));
    };

    const handleUndoButtonClick = (): void => {
      elements.muteCheckbox.checked = false;
      void setVolume(100);
    };

    const handleMuteChange = (): void => {
      void toggleMute(elements.muteCheckbox.checked);
    };

    const handleDisplayModeChange = (): void => {
      toggleDisplayMode(elements.displayModeCheckBox.checked);
    };

    const handleTabClick = (event: Event): void => {
      const target = event.target as HTMLElement | null;
      const tabItem = target?.closest("li");
      const tabId = tabItem?.dataset.tabId
        ? Number(tabItem.dataset.tabId)
        : NaN;
      if (!Number.isFinite(tabId)) {
        return;
      }

      browser.tabs
        .update(tabId, { active: true })
        .catch((error) =>
          console.error("VolumeMixxer: Error retrieving audible tabs:", error)
        );
    };

    elements.volumeSlider.addEventListener("input", updateVolumeFromSlider);
    elements.volumeSlider.addEventListener("change", updateVolumeFromSlider);
    elements.muteCheckbox.addEventListener("change", handleMuteChange);
    elements.displayModeCheckBox.addEventListener(
      "change",
      handleDisplayModeChange
    );
    elements.undoButton.addEventListener("click", handleUndoButtonClick);
    elements.tabList.addEventListener("click", handleTabClick);
  }

  async function initPopup(): Promise<void> {
    try {
      ensureUI();
    } catch (error) {
      logError(error);
      showError(error);
      return;
    }

    if (!initialized) {
      attachEventListeners();
      initialized = true;
    }

    ensureUI().volumeSlider.focus();

    await refreshActiveTabState();
    await populateTabList();
  }

  function showError(error: unknown): void {
    const elements = ensureUI();
    elements.popupContent.classList.add("hidden");
    elements.errorContent.classList.remove("hidden");
    logError(error);
  }

  function logError(error: unknown): void {
    console.error("VolumeMixxer: Error:", error);
  }

  function createLoopButton(tabId: number): HTMLButtonElement {
    const button = document.createElement("button");
    button.classList.add("loop-button");
    button.setAttribute("data-tooltip", "Press to loop");
    button.dataset.tabId = String(tabId);

    const img = document.createElement("img");
    img.src = "images/internal_images/repeat.png";
    img.alt = "Loop";
    img.width = 16;
    img.height = 16;

    button.appendChild(img);

    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      const isActive = button.classList.contains("active");

      try {
        await browser.tabs.sendMessage(tabId, {
          command: "setLoop",
          isLooped: !isActive,
        });

        button.classList.toggle("active", !isActive);
      } catch (error) {
        logError(error);
      }
    });

    return button;
  }

  browser.tabs.onActivated.addListener(() => {
    if (initialized) {
      void refreshActiveTabState();
      void populateTabList();
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    void initPopup();
  });
})();
