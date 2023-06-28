function listenForEvents() {
  let currentVolume = 0;

  function handleInputChange(event) {
    if (event.target.id === "volume-text") {
      updateVolumeFromText();
    }
    if (event.target.id === "volume-slider") {
      updateVolumeFromSlider();
    } 
    if (event.target.id === "mono-checkbox") {
      toggleMono();
    } 
    if (event.target.id === "mute-checkbox") {
      toggleMute();
    } 
     if (event.target.id === "night-mode") {
      toggleNightMode();
    }
  }

  browser.tabs.query({ currentWindow: true, active: true })
    .then(tabs => {
      if (tabs.length === 0) {
        showError("No audio playing.");
        return;
      }
      activeTabId = tabs[0].id; // Store the ID of the active tab
      const volumeSlider = document.querySelector("#volume-slider");
      const volumeText = document.querySelector("#volume-text");
      const monoCheckbox = document.querySelector("#mono-checkbox");
      const muteCheckbox = document.querySelector("#mute-checkbox");
      const nightModeCheckbox = document.querySelector("#night-mode");

      volumeSlider.addEventListener("input", updateVolumeFromSlider);
      volumeText.addEventListener("input", updateVolumeFromText);
      volumeText.addEventListener("input", updateVolumeFromText);
      monoCheckbox.addEventListener("change", toggleMono);
      muteCheckbox.addEventListener("change", toggleMute);
      nightModeCheckbox.addEventListener("change", toggleNightMode);
      document.addEventListener("change", handleInputChange);

      volumeSlider.focus();

      browser.tabs
        .sendMessage(tabs[0].id, { command: "getVolume" })
        .then((response) => {
          setVolume(response.response);
        })
        .catch(err);
      browser.tabs
        .sendMessage(tabs[0].id, { command: "getMono" })
        .then((response) => {
          monoCheckbox.checked = response.response;
        })
        .catch(err);
       browser.tabs
        .sendMessage(tabs[0].id, { command: "getMute" })
        .then((response) => {
          muteCheckbox.checked = response.response;
        })
        .catch(err);
      browser.tabs
        .sendMessage(tabs[0].id, { command: "getNightMode" })
        .then((response) => {
          nightModeCheckbox.checked = response.response;
          if(nightModeCheckbox.checked)
          {
            document.body.classList.add("night-mode");
          }
          else
          {
            document.body.classList.remove("night-mode");
          }
        })
        .catch(err);
    })
    .catch(showError);

function textVal(percentage){
  if (percentage === undefined) {
    return "100%";
  }
  else return percentage + "%";
}

function setVolume(percentage) {
  const slider = document.querySelector("#volume-slider");
  const text = document.querySelector("#volume-text");
  slider.value = percentage;
  text.value = textVal(percentage);

 updateVolumeInStorage(percentage);
}

function updateVolumeInStorage(percentage) {
  browser.tabs.query({ active: true, currentWindow: true })
  .then(tabs => {
    browser.tabs.sendMessage(tabs[0].id, { command: "setVolume", percentage: percentage });
  })
  .catch(err);
}

  function updateVolume() {
    const slider = document.querySelector("#volume-slider");
    const text = document.querySelector("#volume-text");
    const textBelowSlider = document.querySelector("#text-below-slider");
    text.value = textVal(slider.value);
    textBelowSlider.textContent = textVal(slider.value);
  }

  function updateVolumeFromText() {
    const text = document.querySelector("#volume-text");
    const dB = text.value.match(/-?\d+/)?.[0];
    if (dB !== undefined) {
      const slider = document.querySelector("#volume-slider");
      slider.value = dB;
      updateVolume();
      updateVolumeInStorage(dB);
      text.setSelectionRange(text.selectionStart, text.selectionEnd);
    }
  }

  function updateVolumeFromSlider() {
    const slider = document.querySelector("#volume-slider");
    updateVolume();
    updateVolumeInStorage(parseInt(slider.value));
  }
  
  function toggleMute() {
    const muteCheckbox = document.querySelector("#mute-checkbox");
    const mute = muteCheckbox.checked; //if the mutecheckbox is true then that means the user wants to mute the audio
    browser.tabs.query({ active: true, currentWindow: true })
      .then(tabs => {
        browser.tabs.sendMessage(tabs[0].id, { command: "toggleMute", mute });
      })
      .catch(err);
  }
  
  function toggleMono() {
    const mono = document.querySelector("#mono-checkbox").checked;
    browser.tabs.query({ active: true, currentWindow: true })
    .then(tabs => {
      browser.tabs.sendMessage(tabs[0].id, { command: "setMono",mono });
    })
    .catch(err);
  }

  function toggleNightMode() {
    const isNightMode = document.querySelector("#night-mode").checked;

    if (isNightMode) {
      document.body.classList.add("night-mode");
    }
    else {
      document.body.classList.remove("night-mode");
    }
  
    browser.tabs.query({ active: true, currentWindow: true })
      .then(tabs => {
        browser.tabs.sendMessage(tabs[0].id, { command: "setNightMode", isNightMode });
      })
      .catch(err);
  }

  function showError(error) {
    const popupContent = document.querySelector("#popup-content");
    const errorContent = document.querySelector("#error-content");
    popupContent.classList.add("hidden");
    errorContent.classList.remove("hidden");
    console.error(`Volume Control: Error: ${error.message}`);
  }

  function err(error) {
    console.error(`Volume Control: Error: ${error}`);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  listenForEvents();
});
