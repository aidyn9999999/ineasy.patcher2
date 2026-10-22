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
 * Scene boundaries (seconds on the video clock). The 19 sentences of the supplied script were aligned to the 21 speech
 * chunks found by pause detection in the voice-over (voice file starts at VOICE_START). Edit here to nudge timing.
 */
export const T = {
  hook: [0, 12.4],
  compare: [12.4, 20.4],
  overview: [20.4, 25.9],
  google: [25.9, 29.8],
  site: [29.8, 31.2],
  telegram: [31.2, 33.1],
  patcher: [33.1, 34.8],
  process: [34.8, 37.2],
  publish: [37.2, 41.4],
  zernio: [41.4, 46.6],
  connections: [46.6, 50.0],
  apikey: [50.0, 53.2],
  enterKey: [53.2, 55.7],
  caption: [55.7, 60.5],
  patchCompare: [60.5, 72.4],
  final: [72.4, END],
} as const;

export const HOOK_LINES = [
  {from: 5.0, to: 8.9, text: 'TikTok видеоларыңды сығып, сапасын төмендете бергенінен шаршадың ба?'},
  {from: 9.3, to: 12.2, text: 'Онда INEASY.SITE саған арналған!'},
];
