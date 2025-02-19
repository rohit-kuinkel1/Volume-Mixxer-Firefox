function onEvent() 
{
  browser.tabs
    .query({ currentWindow: true, active: true })
    .then((tabs) => {
      browser.tabs
        .sendMessage(tabs[0].id, { command: "getVolume" })
        .then((response) => {
          setVolume(Number(response.response));
        })
        .catch(handleError);

      browser.tabs
        .sendMessage(tabs[0].id, { command: "getDisplayMode" })
        .then((response) => {
          toggleDisplayMode(response.response);
        })
        .catch(handleError);

      browser.tabs
        .sendMessage(tabs[0].id, { command: "getMute" })
        .then((response) => {
          toggleMute(response.response);
        })
        .catch(handleError);

        browser.tabs
        .sendMessage(tabs[0].id, { command: "getLoop" })
        .then((response) => {
          updateLoopState(response.response);
        })
        .catch(handleError);
    })
    .catch(handleError);

  browser.tabs
    .query({ audible: true })
    .then((playingTabs) => {
      const tabList = playingTabs.map((tab) => {
        return {
          faviconUrl: tab.favIconUrl,
          title: tab.title.length > 45 ? tab.title.slice(0, 45) + "..." : tab.title,
        };
      });
      browser.runtime.sendMessage({ command: "updateTabList", tabList });
    })
    .catch(handleError);
}
  
function handleChangeInInput(message) 
{
  if (message.targetId === "volume-slider") 
  {
    updateVolumeFromSlider(message.value);
  } 
  else if (message.targetId === "mute-checkbox") 
  {
    toggleMute(message.value);
  } 
  else if (message.targetId === "display-mode") 
  {
    toggleDisplayMode(message.value);
  }
}

function handleUndoButtonClick() 
{
  toggleMute(false);
  setVolume(100);
}

function toggleMute(isMuted) 
{
  browser.tabs
    .query({ currentWindow: true, active: true })
    .then((tabs) => {
      browser.tabs.sendMessage(tabs[0].id, { command: "setMute", isMuted });
    })
    .catch(handleError);
}

function setVolume(percentage) 
{
  browser.tabs
    .query({ active: true, currentWindow: true })
    .then((tabs) => {
      browser.tabs.sendMessage(tabs[0].id, {
        command: "setVolume",
        percentage,
      });
    })
    .catch(handleError);
}

function handleError(error) 
{
  console.error(`VolumeMixxer: Error: ${error.message}`);
}

  
browser.tabs.onActivated.addListener(onEvent);
browser.runtime.onMessage.addListener((message) => {
  if (message.command === "handleChangeInInput") 
  {
    handleChangeInInput(message);
  } 
  else if (message.command === "handleUndoButtonClick") 
  {
    handleUndoButtonClick();
  }
});
  
function handleChangeInInput(message) {
  if (message.targetId === "volume-slider") {
    updateVolumeFromSlider(message.value);
  } else if (message.targetId === "mute-checkbox") {
    toggleMute(message.value);
  } else if (message.targetId === "display-mode") {
    toggleDisplayMode(message.value);
  } else if (message.targetId === "loop-button") {
    toggleLoop(message.value);
  }
}

function toggleLoop(isLooped) {
  browser.tabs
    .query({ currentWindow: true, active: true })
    .then((tabs) => {
      browser.tabs.sendMessage(tabs[0].id, { 
        command: "setLoop", 
        isLooped 
      });
    })
    .catch(handleError);
}