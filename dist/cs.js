/// <reference types="firefox-webext-browser" />
(() => {
    const tc = {
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
            gainConnected: false,
            loopEnabled: false,
            lastKnownVolume: 100,
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
                localStorage.setItem("displayMode", String(message.isDayMode));
                break;
            case "setMute":
                tc.vars.muted = message.isMuted;
                break;
            case "setLoop":
                tc.vars.loopEnabled = message.isLooped;
                document.querySelectorAll("video").forEach((video) => {
                    video.loop = message.isLooped;
                });
                return Promise.resolve({ response: tc.vars.loopEnabled });
            case "getLoop":
                return Promise.resolve({ response: tc.vars.loopEnabled });
        }
        return undefined;
    });
    function log(message, level) {
        const verbosity = tc.settings.logLevel;
        const resolvedLevel = typeof level === "undefined" ? tc.settings.defaultLogLevel : level;
        if (verbosity >= resolvedLevel) {
            if (resolvedLevel === 2) {
                console.log(`ERROR:${message}`);
            }
            else if (resolvedLevel === 3) {
                console.log(`WARNING:${message}`);
            }
            else if (resolvedLevel === 4) {
                console.log(`INFO:${message}`);
            }
            else if (resolvedLevel === 5) {
                console.log(`DEBUG:${message}`);
            }
        }
    }
    function connectOutput(element) {
        if (!tc.vars.gainNode) {
            return;
        }
        element.volume = 1;
        const source = tc.vars.audioCtx.createMediaElementSource(element);
        source.connect(tc.vars.gainNode);
        setVolume(tc.vars.percentage);
    }
    function setVolume(percentage) {
        if (!tc.vars.gainNode) {
            // If we somehow get a volume request before init, attempt to initialize.
            init(document);
        }
        percentage = Math.min(Math.max(Number.isFinite(percentage) ? Number(percentage) : 0, 0), 400);
        tc.vars.lastKnownVolume = percentage;
        const dB = (percentage / 400) * 72 - 32;
        tc.vars.percentage = percentage;
        tc.vars.muted = percentage === 0;
        const gainValue = tc.vars.muted ? 0 : Math.min(Math.pow(10, dB / 20), 10);
        if (tc.vars.gainNode) {
            const now = tc.vars.audioCtx.currentTime;
            tc.vars.gainNode.gain.setValueAtTime(tc.vars.gainNode.gain.value, now);
            tc.vars.gainNode.gain.linearRampToValueAtTime(gainValue, now + 0.05);
        }
        document.querySelectorAll("audio, video").forEach((element) => {
            element.volume = 1;
        });
    }
    function init(doc) {
        if (!doc.body) {
            log("VolumeMixxer: Already initialized", 5);
            return;
        }
        const storedMode = localStorage.getItem("displayMode");
        tc.vars.dayMode = storedMode === "true";
        if (!tc.vars.gainNode) {
            tc.vars.gainNode = tc.vars.audioCtx.createGain();
            tc.vars.gainNode.gain.value = 1;
            tc.vars.gainNode.channelInterpretation = "speakers";
        }
        if (!tc.vars.gainConnected && tc.vars.gainNode) {
            tc.vars.gainNode.connect(tc.vars.audioCtx.destination);
            tc.vars.gainConnected = true;
        }
        doc.querySelectorAll("audio, video").forEach((element) => {
            element.volume = 1;
            connectOutput(element);
        });
        const arriveDocument = doc;
        arriveDocument.arrive?.("audio, video", (newElem) => {
            newElem.volume = 1;
            connectOutput(newElem);
        });
        setVolume(tc.vars.lastKnownVolume);
    }
    function initWhenReady(doc) {
        if (doc.readyState === "complete") {
            init(doc);
        }
        else {
            doc.addEventListener("DOMContentLoaded", () => init(doc));
        }
    }
    initWhenReady(document);
})();
