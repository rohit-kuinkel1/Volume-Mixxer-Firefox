var tc = {
  settings: {
    logLevel: 0,
    defaultLogLevel: 4,
  },
  vars : {
    percentage:100,
    dayMode: false,
    muted:false,
    audioCtx: new AudioContext(),
    gainNode: undefined,
  }
}

browser.runtime.onMessage.addListener((message) => {
  switch (message.command) {

    case "setVolume":
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
      break;

    case "setMute":
      tc.vars.muted = message.isMuted;
      break;

    case "avoidEarRape":
      avoidEarRape();
      break;
    
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
  log("Begin connectOutput", 5);
  log("Element found " + element.toString(), 5)
  tc.vars.audioCtx.createMediaElementSource(element).connect(tc.vars.gainNode);
  tc.vars.gainNode.connect(tc.vars.audioCtx.destination);
  log("End connectOutput", 5);
}

function setVolume(percentage) {
  const dB = Number(((percentage / 400) * 72) - 32); 
  tc.vars.muted= percentage===0 ?  true :  false;
  tc.vars.percentage = Number(percentage);

  tc.vars.gainNode.gain.value = Math.pow(10, dB / 20);
  avoidEarRape();
}

function avoidEarRape()
{
  const maxGainValue = 100; 
    if (tc.vars.gainNode.gain.value > maxGainValue) {
      tc.vars.gainNode.gain.value = maxGainValue;
      setVolume(400);
    } 
    if(tc.vars.muted){
      tc.vars.gainNode.gain.value = 0;
    }
    //window.alert("checking every 1 sec");
}


function init(document){
  log("Begin init", 5);
  if (!document.body) {
    log("Already initialized", 5);
    return;
  }
  tc.vars.gainNode = tc.vars.audioCtx.createGain();
  tc.vars.gainNode.channelInterpretation = "speakers";
  document.querySelectorAll("audio, video").forEach(connectOutput);
  document.arrive("audio, video", function (newElem) {
    connectOutput(newElem);
  });

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