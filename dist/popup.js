/// <reference types="firefox-webext-browser" />
(() => {
    let ui = null;
    let initialized = false;
    function getElementOrThrow(selector) {
        const element = document.querySelector(selector);
        if (!element) {
            throw new Error(`VolumeMixxer: Missing element ${selector}`);
        }
        return element;
    }
    function ensureUI() {
        if (!ui) {
            ui = {
                volumeSlider: getElementOrThrow("#volume-slider"),
                volumeText: getElementOrThrow("#volume-text"),
                muteCheckbox: getElementOrThrow("#mute-checkbox"),
                displayModeCheckBox: getElementOrThrow("#display-mode"),
                undoButton: getElementOrThrow("#undo-button"),
                tabList: getElementOrThrow("#tab-list"),
                popupContent: getElementOrThrow("#popup-content"),
                errorContent: getElementOrThrow("#error-content"),
                body: getElementOrThrow("body"),
            };
        }
        return ui;
    }
    async function getActiveTabId() {
        const tabs = await browser.tabs.query({ currentWindow: true, active: true });
        const [tab] = tabs;
        return typeof tab?.id === "number" ? tab.id : null;
    }
    function clampVolume(value) {
        if (!Number.isFinite(value)) {
            return 0;
        }
        return Math.min(Math.max(Math.round(value), 0), 400);
    }
    function renderVolumeUI(percentage, skipMuteUpdate = false) {
        const elements = ensureUI();
        const clamped = clampVolume(percentage);
        elements.volumeSlider.value = String(clamped);
        elements.volumeText.value = `${Math.round(clamped)}%`;
        if (!skipMuteUpdate) {
            elements.muteCheckbox.checked = clamped === 0;
        }
    }
    async function setVolume(percentage, skipMuteUpdate = false) {
        const clamped = clampVolume(percentage);
        renderVolumeUI(clamped, skipMuteUpdate);
        try {
            const tabId = await getActiveTabId();
            if (tabId !== null) {
                await browser.tabs.sendMessage(tabId, { command: "setVolume", percentage: clamped });
            }
        }
        catch (error) {
            // Content script not available - silently fail
            logError(error);
        }
    }
    async function toggleMute(isMuted, { updateVolume = true } = {}) {
        const elements = ensureUI();
        elements.muteCheckbox.checked = isMuted;
        if (updateVolume) {
            await setVolume(isMuted ? 0 : 100, true);
        }
        try {
            const tabId = await getActiveTabId();
            if (tabId !== null) {
                await browser.tabs.sendMessage(tabId, { command: "setMute", isMuted });
            }
        }
        catch (error) {
            // Content script not available - silently fail
            logError(error);
        }
    }
    function toggleDisplayMode(isDayMode, { skipStorage = false } = {}) {
        const elements = ensureUI();
        elements.displayModeCheckBox.checked = isDayMode;
        if (isDayMode) {
            elements.body.classList.add("day-mode");
            elements.body.classList.remove("night-mode");
        }
        else {
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
    async function populateTabList() {
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
                    if (response?.response) {
                        loopButton.classList.add("active");
                    }
                })
                    .catch(logError);
            });
            tabList.classList.remove("hidden");
        }
        catch (error) {
            logError(error);
        }
    }
    async function refreshActiveTabState() {
        const storedMode = localStorage.getItem("displayMode");
        if (storedMode !== null) {
            toggleDisplayMode(storedMode === "true");
        }
        try {
            const tabId = await getActiveTabId();
            if (tabId === null) {
                return;
            }
            // Try to communicate with content script, but don't show error if it fails
            // (content scripts don't run on internal browser pages)
            try {
                await browser.tabs.sendMessage(tabId, { command: "getVolume" }).then((response) => {
                    const volume = response?.response;
                    if (typeof volume === "number") {
                        renderVolumeUI(volume);
                    }
                });
                await browser.tabs.sendMessage(tabId, { command: "getDisplayMode" }).then((response) => {
                    const isDayMode = response?.response;
                    if (typeof isDayMode === "boolean" && storedMode === null) {
                        toggleDisplayMode(isDayMode, { skipStorage: true });
                    }
                });
                await browser.tabs.sendMessage(tabId, { command: "getMute" }).then((response) => {
                    const isMuted = response?.response;
                    if (typeof isMuted === "boolean") {
                        void toggleMute(isMuted, { updateVolume: false });
                    }
                });
            }
            catch (error) {
                // Content script not available (internal page, etc.) - just log and continue
                logError(error);
            }
        }
        catch (error) {
            logError(error);
            showError(error);
        }
    }
    function attachEventListeners() {
        const elements = ensureUI();
        const updateVolumeFromSlider = () => {
            void setVolume(Number(elements.volumeSlider.value));
        };
        const handleUndoButtonClick = () => {
            elements.muteCheckbox.checked = false;
            void setVolume(100);
        };
        const handleMuteChange = () => {
            void toggleMute(elements.muteCheckbox.checked);
        };
        const handleDisplayModeChange = () => {
            toggleDisplayMode(elements.displayModeCheckBox.checked);
        };
        const handleTabClick = (event) => {
            const target = event.target;
            const tabItem = target?.closest("li");
            const tabId = tabItem?.dataset.tabId ? Number(tabItem.dataset.tabId) : NaN;
            if (!Number.isFinite(tabId)) {
                return;
            }
            browser.tabs
                .update(tabId, { active: true })
                .catch((error) => console.error("VolumeMixxer: Error retrieving audible tabs:", error));
        };
        elements.volumeSlider.addEventListener("input", updateVolumeFromSlider);
        elements.volumeSlider.addEventListener("change", updateVolumeFromSlider);
        elements.muteCheckbox.addEventListener("change", handleMuteChange);
        elements.displayModeCheckBox.addEventListener("change", handleDisplayModeChange);
        elements.undoButton.addEventListener("click", handleUndoButtonClick);
        elements.tabList.addEventListener("click", handleTabClick);
    }
    async function initPopup() {
        try {
            ensureUI();
        }
        catch (error) {
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
    function showError(error) {
        const elements = ensureUI();
        elements.popupContent.classList.add("hidden");
        elements.errorContent.classList.remove("hidden");
        logError(error);
    }
    function logError(error) {
        console.error("VolumeMixxer: Error:", error);
    }
    function createLoopButton(tabId) {
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
            }
            catch (error) {
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
