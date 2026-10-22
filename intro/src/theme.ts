export const FPS = 30;
export const INTRO_FRAMES = 5 * FPS; // 0:00 - 0:05, music + 3D logo, no voice
export const VOICE_FRAMES = 16 * FPS; // 0:05 - 0:21, Kazakh voice-over section
export const FULL_FRAMES = INTRO_FRAMES + VOICE_FRAMES;

export const colors = {
  bg: '#02040a',
  navy: '#0a1a44',
  blue: '#2f6bff',
  blueLight: '#7fb0ff',
  text: '#f3f6ff',
};

export const fontFamily = "'Unbounded', 'Onest', system-ui, sans-serif";

// Voice-over (Kazakh, male). Frame offsets are relative to the 0:05 mark.
export const VOICE_LINES = [
  {from: 0, to: 120, text: 'TikTok-тағы видео сапасының төмендегенінен шаршадың ба?'},
  {from: 120, to: 210, text: 'Онда INEASY.SITE сайтына кір!'},
  {from: 210, to: 360, text: 'Қазір саған видеоңды қалай өңдеп, жоғары сапада жариялауға болатынын көрсетемін.'},
  {from: 360, to: 450, text: 'Нұсқаулықты орында!'},
];

export const STEPS = [
  'Сайтты табу',
  'Telegram арқылы кіру',
  'Patcher-де өңдеу',
  'Zernio қосу',
  'TikTok-қа жариялау',
  'Түпнұсқамен салыстыру',
];
