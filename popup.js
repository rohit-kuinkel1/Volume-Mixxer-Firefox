function onEvent() {
  browser.tabs
    .query({ currentWindow: true, active: true })
    .then((tabs) => {
      const volumeSlider = document.querySelector("#volume-slider");
      const muteCheckbox = document.querySelector("#mute-checkbox");
      const displayModeCheckBox = document.querySelector("#display-mode");
      const undoButton = document.querySelector("#undo-button");
      const tabList = document.querySelector("#tab-list");

      volumeSlider.addEventListener("input", updateVolumeFromSlider);
      volumeSlider.addEventListener("change", updateVolumeFromSlider);
      muteCheckbox.addEventListener("input", handleChangeInMuteBox);
      muteCheckbox.addEventListener("change", handleChangeInMuteBox);
      displayModeCheckBox.addEventListener("change", handleChangeInDisplayMode);
      undoButton.addEventListener("click", handleUndoButtonClick);
      tabList.addEventListener("click", handleTabClick);
      document.addEventListener("change", handleChangeInInput);

      volumeSlider.focus();

      browser.tabs
        .sendMessage(tabs[0].id, { command: "getVolume" })
        .then((response) => {
          setVolume(Number(response.response));
        })
        .catch(e);

      browser.tabs
        .sendMessage(tabs[0].id, { command: "getDisplayMode" })
        .then((response) => {
          toggleDisplayMode(response.response);
        })
        .catch(e);

      browser.tabs
        .sendMessage(tabs[0].id, { command: "getMute" })
        .then((response) => {
          toggleMute(response.response);
        })
        .catch(e);
    })
    .catch(showError);

  browser.tabs
    .query({ audible: true })
    .then((playingTabs) => {
      const tabList = document.querySelector("#tab-list");

      while (tabList.firstChild) {
        tabList.firstChild.remove();
      }

      if (playingTabs.length === 0) 
      {
        const listItem = document.createElement("li");
        listItem.textContent = "No tabs are playing audio right now";
        tabList.appendChild(listItem);
      }

      playingTabs.forEach((tab) => {
        const listItem = document.createElement("li");
        const faviconImg = document.createElement("img");
        const titleSpan = document.createElement("span");
        const loopButton = createLoopButton(tab.id);

        faviconImg.src = tab.favIconUrl;
        faviconImg.classList.add("favicon");
    
        const truncatedTitle = tab.title;
        titleSpan.textContent = truncatedTitle;
        titleSpan.title = tab.title;
        titleSpan.classList.add("title");
    
        listItem.appendChild(faviconImg);
        listItem.appendChild(titleSpan);
        listItem.appendChild(loopButton);
        tabList.appendChild(listItem);
    
        browser.tabs.sendMessage(tab.id, { command: "getLoop" })
            .then((response) => {
                if (response.response) {
                  loopButton.classList.add('active');
                }
            })
            .catch(e);
    });

      tabList.classList.remove("hidden");
    })
    .catch(e);

  function handleChangeInInput(event) 
  {
    if (event.target.id === "volume-slider") 
    {
      updateVolumeFromSlider();
    } 
    else if (event.target.id === "mute-checkbox") 
    {
      const muteCheckbox = document.querySelector("#mute-checkbox");
      toggleMute(muteCheckbox.checked);
    } 
    else if (event.target.id === "display-mode") 
    {
      const displayModeCheckBox = document.querySelector("#display-mode");
      toggleDisplayMode(displayModeCheckBox.checked);
    }
  }

  function handleUndoButtonClick() 
  {
    const muteCheckbox = document.querySelector("#mute-checkbox");
    muteCheckbox.checked = false;
    setVolume(100);
  }

  function toggleMute(isMuted) 
  {
    const muteCheckbox = document.querySelector("#mute-checkbox");
    isMuted
      ? ((muteCheckbox.checked = true), setVolume(0))
      :null;

    browser.tabs
      .query({ currentWindow: true, active: true })
      .then((tabs) => {
        browser.tabs.sendMessage(tabs[0].id, { command: "setMute", isMuted });
      })
      .catch(e);
  }

  function setVolume(percentage) 
  {
    const volumeSlider = document.querySelector("#volume-slider");
    const volumeText = document.querySelector("#volume-text");
    
    volumeSlider.value = Number(percentage);
    const volText = 1.0 * Number(percentage);
    volumeText.value = Math.round(volText) + "%";

    browser.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => {
        browser.tabs.sendMessage(tabs[0].id, {
          command: "setVolume",
          percentage,
        });
      })
      .catch(e);
  }

   function updateVolumeFromSlider() 
  {
    const volumeSlider = document.querySelector("#volume-slider");
    const muteCheckbox = document.querySelector("#mute-checkbox");
    volumeSlider.value == 0 ? (muteCheckbox.checked = true) : (muteCheckbox.checked = false);
    setVolume(Number(volumeSlider.value));
  }

  function toggleDisplayMode(isDayMode) 
  {
    const body = document.body;
    const displayModeCheckBox = document.querySelector("#display-mode");
    displayModeCheckBox.checked = isDayMode;

    if (isDayMode) 
      {
      body.classList.add("day-mode");
    } 
    else 
    {
      body.classList.remove("day-mode");
      body.classList.add("night-mode");
    }

    browser.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => {
        browser.tabs.sendMessage(tabs[0].id, {
          command: "setDisplayMode",
          isDayMode,
        });
      })
      .catch(e);
  }

  function handleChangeInMuteBox() 
  {
    const muteCheckbox = document.querySelector("#mute-checkbox");
    muteCheckbox.checked ? setVolume(0) : setVolume(100);
  }

  function handleTabClick(event) 
  {
    if (event.target.tagName === "LI") 
    {
      const tabIndex = Array.from(tabList.children).indexOf(event.target);

      browser.tabs
        .query({ audible: true })
        .then((playingTabs) => {
          if (tabIndex >= 0 && tabIndex < playingTabs.length) {
            const tab = playingTabs[tabIndex];
            browser.tabs.update(tab.id, { active: true });
          }
        })
        .catch((error) => {
          console.error("VolumeMixxer: Error retrieving audible tabs:", error);
        });
    } 
    else if (event.target.tagName === "SPAN") 
    {
      const tabTitle = event.target.title;

      browser.tabs
        .query({ audible: true })
        .then((playingTabs) => {
          const matchingTab = playingTabs.find((tab) => tab.title === tabTitle);
          if (matchingTab) 
          {
            browser.tabs.update(matchingTab.id, { active: true });
          }
        })
        .catch((error) => 
        {
          console.error("VolumeMixxer: Error retrieving audible tabs:", error);
        });
    }
  }

  function handleChangeInDisplayMode() 
  {
    const displayModeCheckBox = document.querySelector("#display-mode");
    displayModeCheckBox.checked
      ? body.classList.add("day-mode")
      : body.classList.remove("day-mode");

    browser.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => {
        browser.tabs.sendMessage(tabs[0].id, {
          command: "setDisplayMode",
          isDayMode,
        });
      })
      .catch(e);
  }

  function showError(error) 
  {
    const popupContent = document.querySelector("#popup-content");
    const errorContent = document.querySelector("#error-content");
    popupContent.classList.add("hidden");
    errorContent.classList.remove("hidden");
    console.error(`VolumeMixxer: Error: ${error.message}`);
  }

  function e(error) 
  {
    console.error(`VolumeMixxer: Error: ${error}`);
  }
}

function createLoopButton(tabId) { 
  const button = document.createElement('button');
  button.classList.add('loop-button');
  button.setAttribute('data-tooltip', 'Press for loop playback');
  button.dataset.tabId = tabId;  
  
  const img = document.createElement('img');
  img.src = 'images/internal_images/repeat.png';
  img.alt = 'Loop';
  img.width = 16;
  img.height = 16;
  
  button.appendChild(img);
  
  button.addEventListener('click', async (e) => {
      e.stopPropagation();
      const isActive = button.classList.contains('active');
      const targetTabId = button.dataset.tabId; 
      
      try {
          await browser.tabs.sendMessage(parseInt(targetTabId), {
              command: "setLoop",
              isLooped: !isActive
          });
          
          if (!isActive) {
              button.classList.add('active');
          } else {
              button.classList.remove('active');
          }
      } catch (error) {
          console.error('VolumeMixxer: Error toggling loop:', error);
      }
  });
  
  return button;
}

browser.tabs.onActivated.addListener(onEvent);
document.addEventListener("DOMContentLoaded", onEvent);


