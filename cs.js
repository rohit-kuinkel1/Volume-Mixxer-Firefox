var tc = 
{
  settings: 
  {
    logLevel: 0,
    defaultLogLevel: 5,
  },
  vars : 
  {
    percentage:100,
    dayMode: false,
    muted:false,
    audioCtx: new AudioContext(),
    gainNode: undefined,
    loopEnabled: false
  }
}

browser.runtime.onMessage.addListener((message) => {
  switch (message.command) 
  {
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
      break;
    case "setMute":
      tc.vars.muted = message.isMuted;
      break;
    case "avoidEarRape":
      avoidEarRape();
      break;    
    case "setLoop":
      tc.vars.loopEnabled = message.isLooped;
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
          video.loop = message.isLooped;
      });
      return Promise.resolve({ response: tc.vars.loopEnabled });
    case "getLoop":
      return Promise.resolve({ response: tc.vars.loopEnabled });
  }
});

function log(message, level) 
{
  const verbosity = tc.settings.logLevel;
  if (typeof level === "undefined") 
  {
    level = tc.settings.defaultLogLevel;
  }
  if (verbosity >= level) 
  {
    if (level === 2) 
    {
      console.log("ERROR:" + message);
    } 
    else if (level === 3) 
    {
      console.log("WARNING:" + message);
    } 
    else if (level === 4) 
    {
      console.log("INFO:" + message);
    } 
    else if (level === 5) 
    {
      console.log("DEBUG:" + message);
    }
  }
}

function connectOutput(element) 
{
  log("VolumeMixxer: Begin connectOutput", 5);
  log("VolumeMixxer: Element found " + element.toString(), 5)
  tc.vars.audioCtx.createMediaElementSource(element).connect(tc.vars.gainNode);
  tc.vars.gainNode.connect(tc.vars.audioCtx.destination);
  log("VolumeMixxer: End connectOutput", 5);
}

function setVolume(percentage) 
{
  //console.log(`VolumeMixxer: setVolume called with value ${percentage}`);
  const dB = Number(((percentage / 400) * 72) - 32);
  tc.vars.percentage = Number(percentage);
  tc.vars.muted = percentage === 0;
  const gainValue = tc.vars.muted ? 0 : Math.pow(10, dB / 20);
  tc.vars.gainNode.gain.value = gainValue;
  avoidEarRape();
}

function avoidEarRape() {
  const maxGainValue = 100;

  if (tc.vars.gainNode.gain.value > maxGainValue) 
  {
    tc.vars.gainNode.gain.value = maxGainValue;
    setVolume(400); // Reset volume to 400% to apply max gain limit correctly
  }

  if (tc.vars.muted) 
  {
    tc.vars.gainNode.gain.value = 0;
  }
  //console.log(`VolumeMixxer: gainNode value adjusted to ${tc.vars.gainNode.gain.value}`);
}


function init(document)
{
  log("VolumeMixxer: Begin init", 5);
  if (!document.body) 
  {
    log("VolumeMixxer: Already initialized", 5);
    return;
  }
  tc.vars.gainNode = tc.vars.audioCtx.createGain();
  tc.vars.gainNode.channelInterpretation = "speakers";
  document.querySelectorAll("audio, video").forEach(connectOutput);
  document.arrive("audio, video", function (newElem) {
    connectOutput(newElem);
  });

  log("VolumeMixxer: End init", 5);
}

function initWhenReady(document) 
{
  log("VolumeMixxer: Begin initWhenReady", 5);
  window.onload = () => {
    init(window.document);
  };

  if (document) 
  {
    if (document.readyState === "complete") 
    {
      init(document);
    } 
    else 
    {
      document.onreadystatechange = () => {
        if (document.readyState === "complete") {
          init(document);
        }
      };
    }
  }
  
  log("VolumeMixxer: End initWhenReady", 5);
}

initWhenReady(document);