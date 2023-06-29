
var tc = {
  settings: {
    logLevel: 0,
    defaultLogLevel: 4,
  },
  vars : {
    dB: 0,
    percentage:0,
    nightMode: true,
    muted:false,
    audioCtx: new AudioContext(),
    gainNode: undefined,
  }
}

function log(message, level) {
  const verbosity = tc.settings.logLevel;
  if (typeof level === "undefined") {
    level = tc.settings.defaultLogLevel;
  }
  if (verbosity >= level) {
    if (level === 2) {
      console.log("ERROR:" + message);
    } else if (level === 3) {
      console.log("WARNING:" + message);
    } else if (level === 4) {
      console.log("INFO:" + message);
    } else if (level === 5) {
      console.log("DEBUG:" + message);
    }
  }
}

function connectOutput(element) {
  log("Begin connectOutput", 5);
  log("Element found " + element.toString(), 5)
  tc.vars.audioCtx.createMediaElementSource(element).connect(tc.vars.gainNode);
  tc.vars.gainNode.connect(tc.vars.audioCtx.destination);
  log("End connectOutput", 5);
}

function setVolume(percentage) {
  const dB = ((percentage / 400) * 69) - 32; 
  tc.vars.percentage = percentage;
  tc.vars.gainNode.gain.value = Math.pow(10, dB / 20);
  tc.vars.dB = dB;
}

function init(document){
  log("Begin init", 5);
  if (!document.body || document.body.classList.contains("volumecontrol-initialized")) {
    log("Already initialized", 5);
    return;
  }
  tc.vars.gainNode = tc.vars.audioCtx.createGain();
  tc.vars.gainNode.channelInterpretation = "speakers";
  document.querySelectorAll("audio, video").forEach(connectOutput);
  document.arrive("audio, video", function (newElem) {
    connectOutput(newElem);
  });

  browser.runtime.onMessage.addListener((message) => {
    switch (message.command) {
      case "setVolume":
        setVolume(message.percentage);
        break;

      case "getVolume":
        return Promise.resolve({ response: tc.vars.percentage });
 
      case "getMute":
        return Promise.resolve({ response: tc.vars.muted });
     
      case "toggleMute":
        tc.vars.muted = message.mute;
        if (message.muted) {
          tc.vars.gainNode.gain.value = 0;
          setVolume(0);
        }
        else {
          setVolume(tc.vars.percentage);
        }
        break;
        
      case "getDisplayMode":
        return Promise.resolve({ response: tc.vars.nightMode });
      
      case "setDisplayMode":
        tc.vars.nightMode = message.isDayMode;
        break;
    }
  });
  document.body.classList.add("volumecontrol-initialized");
  log("End init", 5);
}

function initWhenReady(document) {
  log("Begin initWhenReady", 5);
  window.onload = () => {
    init(window.document);
  };
  if (document) {
    if (document.readyState === "complete") {
      init(document);
    } else {
      document.onreadystatechange = () => {
        if (document.readyState === "complete") {
          init(document);
        }
      };
    }
  }
  log("End initWhenReady", 5);
}

initWhenReady(document);