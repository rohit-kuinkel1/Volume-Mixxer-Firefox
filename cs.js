var tc = {
  settings: {
    logLevel: 0,
    defaultLogLevel: 5,
  },
  vars: {
    percentage: 100,
    dayMode: false,
    muted: false,
    audioCtx: new AudioContext(),
    gainNode: undefined,
    loopEnabled: false,
    lastKnownVolume: 100, //try fix rare ear rapes
  },
};

browser.runtime.onMessage.addListener((message) => {
  switch (message.command) {
    case "initializeTab":
      if (!tc.vars.gainNode) {
        init(document);
      }
      return Promise.resolve({ response: true });
    case "setVolume":
      console.log(`setVolume called with ${message.percentage}`);
      setVolume(Number(message.percentage));
      break;
    case "getVolume":
      return Promise.resolve({ response: tc.vars.percentage });
    case "getMute":
      return Promise.resolve({ response: tc.vars.muted });
    case "getDisplayMode":
      return Promise.resolve({ response: tc.vars.dayMode });
    case "setDisplayMode":
      tc.vars.dayMode = message.isDayMode;
      localStorage.setItem("displayMode", message.isDayMode);
      break;
    case "setMute":
      tc.vars.muted = message.isMuted;
      break;
    case "setLoop":
      tc.vars.loopEnabled = message.isLooped;
      const videos = document.querySelectorAll("video");
      videos.forEach((video) => {
        video.loop = message.isLooped;
      });
      return Promise.resolve({ response: tc.vars.loopEnabled });
    case "getLoop":
      return Promise.resolve({ response: tc.vars.loopEnabled });
  }
});

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
  element.volume = 1;
  tc.vars.audioCtx.createMediaElementSource(element).connect(tc.vars.gainNode);
  tc.vars.gainNode.connect(tc.vars.audioCtx.destination);
  setVolume(tc.vars.percentage);
}

function setVolume(percentage) {
  percentage = Math.min(Math.max(Number(percentage) || 0, 0), 400);
  tc.vars.lastKnownVolume = percentage;
  
  const dB = Number((percentage / 400) * 72 - 32);
  tc.vars.percentage = percentage;
  tc.vars.muted = percentage === 0;
  
  const gainValue = tc.vars.muted ? 0 : Math.min(Math.pow(10, dB / 20), 10);
  
  if (tc.vars.gainNode) {
    const now = tc.vars.audioCtx.currentTime;
    tc.vars.gainNode.gain.setValueAtTime(tc.vars.gainNode.gain.value, now);
    tc.vars.gainNode.gain.linearRampToValueAtTime(gainValue, now + 0.05);
  }
  
  document.querySelectorAll("audio, video").forEach(element => {
    element.volume = 1;
  });
}

function init(document) {
  if (!document.body) {
    log("VolumeMixxer: Already initialized", 5);
    return;
  }

  const storedMode = localStorage.getItem("displayMode");
  tc.vars.dayMode = storedMode === "true";

  tc.vars.gainNode = tc.vars.audioCtx.createGain();
  tc.vars.gainNode.gain.value = 1;
  tc.vars.gainNode.channelInterpretation = "speakers";

  document.querySelectorAll("audio, video").forEach((element) => {
    element.volume = 1; //reset native volume
    connectOutput(element);
  });

  document.arrive("audio, video", function (newElem) {
    newElem.volume = 1;
    connectOutput(newElem);
  });

  setVolume(tc.vars.lastKnownVolume);
}

function initWhenReady(document) {
  if (document.readyState === "complete") {
    init(document);
  } else {
    document.addEventListener('DOMContentLoaded', () => init(document));
  }
}

initWhenReady(document);
