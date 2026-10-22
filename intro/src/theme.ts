export const FPS = 60;
export const sec = (s: number) => Math.round(s * FPS);

export const colors = {
  bg: '#02040a',
  navy: '#0a1a44',
  blue: '#2f6bff',
  blueLight: '#7fb0ff',
  text: '#f3f6ff',
};

export const fontFamily = "'Unbounded', 'Onest', system-ui, sans-serif";

/** Voice-over file starts at this moment of the video. The file is used whole, never trimmed. */
export const VOICE_START = 5.0;
export const VOICE_FILE = 'voiceover-final.mp3';
export const VOICE_LEN = 70.426;
export const END = 77.0;

/**
 * Scene boundaries (seconds on the video clock). Derived from the pauses in the voice-over file
 * (speech chunk i starts at VOICE_START + pause-detected start). Edit here if the phrase map changes.
 */
export const T = {
  intro: [0, 5.0],
  hook: [5.0, 20.6],
  compare: [20.6, 23.4],
  google: [23.4, 26.4],
  site: [26.4, 30.2],
  telegram: [30.2, 33.5],
  patcher: [33.5, 37.5],
  process: [37.5, 41.7],
  publish: [41.7, 44.4],
  zernio: [44.4, 50.3],
  connections: [50.3, 56.0],
  apikey: [56.0, 60.9],
  enterKey: [60.9, 63.9],
  caption: [63.9, 68.7],
  patchCompare: [68.7, 72.6],
  final: [72.6, END],
} as const;

export const HOOK_LINES = [
  {from: 5.0, to: 8.9, text: 'TikTok-тағы видео сапасының төмендегенінен шаршадың ба?'},
  {from: 9.3, to: 12.4, text: 'Онда INEASY.SITE сайтына кір!'},
];
