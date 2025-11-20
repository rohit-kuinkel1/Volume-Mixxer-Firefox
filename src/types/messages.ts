export type ContentCommand =
  | { command: "initializeTab" }
  | { command: "setVolume"; percentage: number }
  | { command: "getVolume" }
  | { command: "getMute" }
  | { command: "getDisplayMode" }
  | { command: "setDisplayMode"; isDayMode: boolean }
  | { command: "setMute"; isMuted: boolean }
  | { command: "setLoop"; isLooped: boolean }
  | { command: "getLoop" };

export type UpdateTabMessage = {
  command: "updateTab";
  tabId: number;
  subCommand: string;
  value?: unknown;
};

export type BackgroundMessage = { command: "getAudibleTabs" } | UpdateTabMessage;

export type BooleanResponse = { response: boolean };
export type NumberResponse = { response: number };
