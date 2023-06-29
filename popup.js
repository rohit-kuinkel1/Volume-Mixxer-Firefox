function listenForEvents() {

  function handleInputChange(event) {
    if (event.target.id === "volume-text") {
      updateVolumeFromText();
    } else if (event.target.id === "volume-slider") {
      updateVolumeFromSlider();
    } else if (event.target.id === "mute-checkbox") {
      toggleMute();
    } else if (event.target.id === "display-mode") {
      toggleDisplayMode();
    }
  }

  function toggleMute() {
    const muteCheckbox = document.querySelector("#mute-checkbox");
    const isMuted = muteCheckbox.checked;

    if (isMuted) {
      setVolume(0); 
    } else {
      setVolume(200);
    }

    browser.tabs
    .query({ active: true, currentWindow: true })
    .then((tabs) => {
      browser.tabs.sendMessage(tabs[0].id, {
        command: "toggleMute",
        isMuted,
      });
    })
    .catch(e);
  }

  function setVolume(percentage) {
    const dB = ((percentage / 400) * 72) - 32; 
    const slider = document.querySelector("#volume-slider");
    const text = document.querySelector("#volume-text");

    slider.value = percentage;
    text.value = dB_to_percentage_str(dB);
    currentVolume = dB;
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

  function dB_to_percentage_str(dB) {
    const percentage = ((dB + 32) / 72) * 400;
    return `${percentage.toFixed(0)}%`;
  }

  function updateVolume() {
    const slider = document.querySelector("#volume-slider");
    const text = document.querySelector("#volume-text");
    text.value = dB_to_percentage_str(slider.value);
  }

  function updateVolumeFromText() {
    const text = document.querySelector("#volume-text");
    const dB = text.value.match(/-?\d+/)?.[0];

    if (dB !== undefined) { //not the same as if (dB) because if(dB) will be skipped if dB is falsy if dB were to be boolean
      const slider = document.querySelector("#volume-slider");
      slider.value = dB;
      updateVolume();
      setVolume(dB);
      text.setSelectionRange(text.selectionStart, text.selectionEnd);
    }
  }

  function updateVolumeFromSlider() {
    const slider = document.querySelector("#volume-slider");
    updateVolume();
    setVolume(slider.value);
  }

  function toggleDisplayMode() {
    const displayModeCheckBox = document.querySelector("#display-mode");
    const isDayMode = displayModeCheckBox.checked;
    const body = document.body;

     if(isDayMode){
       body.classList.add("day-mode")
       displayModeCheckBox.checked = true;
     }
    else{
     body.classList.remove("day-mode");
     displayModeCheckBox.checked = false;
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

  function showError(error) {
    const popupContent = document.querySelector("#popup-content");
    const errorContent = document.querySelector("#error-content");
    popupContent.classList.add("hidden");
    errorContent.classList.remove("hidden");
    console.error(`Volume Control: Error: ${error.message}`);
  }

  function e(error) {
    console.error(`Volume Control: Error: ${error}`);
  }
  
  function setDisplayMode(nightMode) {
    const displayModeCheckBox = document.querySelector("#display-mode");
    const body = document.body;
    if (nightMode) {
      body.classList.remove("day-mode");
      nightModeCheckbox.checked = true;
    } else {
      body.classList.add("day-mode");
      nightModeCheckbox.checked = false;
    }
  }

  function setMute(mute) {
    const muteCheckbox = document.querySelector("#mute-checkbox");
    const isMuted = mute;
    if (isMuted) {
      muteCheckbox.checked = true;
      setVolume(0);
    } else {
      setVolume(150);
      muteCheckbox.checked = false;
    }
  }


  browser.tabs.query({ currentWindow: true, active:true })
    .then(tabs => {
     
      const volumeSlider = document.querySelector("#volume-slider");
      const volumeText = document.querySelector("#volume-text");
   
      const muteCheckbox = document.querySelector("#mute-checkbox");
      const displayModeCheckBox = document.querySelector("#display-mode");

      volumeSlider.addEventListener("input", updateVolumeFromSlider);
      volumeSlider.addEventListener("change", updateVolumeFromSlider);
      volumeText.addEventListener("input", updateVolumeFromText);
      muteCheckbox.addEventListener("change", toggleMute);
      displayModeCheckBox.addEventListener("change", toggleDisplayMode);
      document.addEventListener("change", handleInputChange);

      volumeSlider.focus();

      browser.tabs.sendMessage(tabs[0].id, { command: "getVolume" })
        .then((response) => {
          setVolume(response.response);
        })
        .catch(e);

        browser.tabs.sendMessage(tabs[0].id, { command: "getDisplayMode" })
        .then((response) => {
          setDisplayMode(response.response);
        })
        .catch(e);

        browser.tabs.sendMessage(tabs[0].id, { command: "getMute" })
        .then((response) => {
          setMute(response.response);
        })
        .catch(e);
    })
    .catch(showError);
    
}

document.addEventListener("DOMContentLoaded", listenForEvents);
