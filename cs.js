var tc = {
  settings: {
    logLevel: 0,
    defaultLogLevel: 4,
  },
  vars : {
    dB: 0,
    mono: false,
    nightMode: false,
    mute:false,
    audioCtx: new AudioContext(),
    gainNode: undefined, //defined during init
  }
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
        tc.vars.dB = message.dB;
        //setVolume(message.dB);
        break;

      case "getVolume":
        return Promise.resolve({ response: tc.vars.dB });

      case "setMono":
        if (message.mono) {
          enableMono();
        } else {
          disableMono();
        }
        break;

      case "getMono":
        return Promise.resolve({ response: tc.vars.mono });

      case "getMute":
        return Promise.resolve({ response: tc.vars.mute });

      case "toggleMute":
        tc.vars.mute = message.mute;
        if (message.mute) {
         setVolume(0);
        }
        else if (!message.mute) {
          setVolume(400);
        }
        break;

      case "getNightMode":
        return Promise.resolve({ response: tc.vars.nightMode });

      case "setNightMode":
        tc.vars.nightMode = message.isNightMode;
        if (message.isNightMode) {
          document.body.classList.add("night-mode");
        }
        else {
          document.body.classList.remove("night-mode");
        }
        break;

      default:
        log("Unknown command: " + message.command, 2);
    }
  });

  document.body.classList.add("volumecontrol-initialized");
  log("End init", 5);
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
  currentVolume=((percentage /400) * 72) - 32; //in dB
  tc.vars.gainNode.gain.value = Math.pow(10, currentVolume / 20);
  tc.vars.dB = currentVolume;
}

function enableMono() {
  tc.vars.mono = true;
  tc.vars.gainNode.channelCountMode = "explicit";
  tc.vars.gainNode.channelCount = 1;
}

function disableMono() {
  tc.vars.mono = false;
  tc.vars.gainNode.channelCountMode = "max";
  tc.vars.gainNode.channelCount = 2;
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