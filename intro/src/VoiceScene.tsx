import React from 'react';
import {AbsoluteFill, Audio, Easing, interpolate, Loop, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {colors, fontFamily, STEPS, VOICE_FRAMES, VOICE_LINES} from './theme';
import {useFonts} from './useFonts';

const Caption: React.FC<{from: number; to: number; text: string}> = ({from, to, text}) => {
  const frame = useCurrentFrame();
  if (frame < from || frame >= to) return null;
  const words = text.split(' ');
  const local = frame - from;
  const dur = to - from;
  const exit = interpolate(frame, [to - 8, to], [1, 0], {extrapolateLeft: 'clamp'});
  return (
    <div style={{position: 'absolute', left: 70, right: 70, top: 740, textAlign: 'center', opacity: exit}}>
      <div style={{fontFamily, fontWeight: 800, fontSize: 58, lineHeight: 1.22, color: colors.text, textShadow: '0 4px 30px rgba(0,0,0,.8)'}}>
        {words.map((w, i) => {
          const start = (i / words.length) * dur * 0.7;
          const o = interpolate(local, [start, start + 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const y = interpolate(local, [start, start + 10], [24, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
          const brand = w.startsWith('INEASY') || w.startsWith('TikTok');
          return (
            <span key={i} style={{display: 'inline-block', marginRight: 16, opacity: o, transform: `translateY(${y}px)`, color: brand ? colors.blueLight : colors.text}}>
              {w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/**
 * 0:05+ : the site's background video (night skyline) + Kazakh voice-over captions.
 * Voice file expected at public/voiceover-kk.mp3 (male, Kazakh). Enabled with prop hasVoiceover.
 */
export const VoiceScene: React.FC<{hasVoiceover?: boolean; withAmbient?: boolean}> = ({hasVoiceover = false, withAmbient = true}) => {
  useFonts();
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 20], [0, 1], {extrapolateRight: 'clamp'});
  const stepFrom = 215;
  return (
    <AbsoluteFill style={{background: colors.bg}}>
      <AbsoluteFill style={{opacity: fadeIn, transform: `scale(${1 + frame * 0.00035})`}}>
        <Loop durationInFrames={465}>
          <OffthreadVideo src={staticFile('bg-skyline.mp4')} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </Loop>
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(2,4,10,.55), rgba(2,4,10,.15) 35%, rgba(2,4,10,.75))'}} />
      {withAmbient ? <Audio src={staticFile('ambient-pad.mp3')} volume={(f) => interpolate(f, [0, 30, VOICE_FRAMES - 30, VOICE_FRAMES], [0, 0.35, 0.35, 0])} /> : null}
      {hasVoiceover ? <Audio src={staticFile('voiceover-kk.mp3')} volume={1} /> : null}

      <div style={{position: 'absolute', top: 120, left: 0, right: 0, textAlign: 'center', fontFamily, fontWeight: 800, fontSize: 44, letterSpacing: 8, color: colors.text, opacity: fadeIn}}>
        INEASY.SITE
      </div>

      {VOICE_LINES.map((l) => (
        <Caption key={l.from} {...l} />
      ))}

      <div style={{position: 'absolute', left: 90, right: 90, bottom: 150}}>
        {STEPS.map((s, i) => {
          const t = stepFrom + i * 28;
          const o = interpolate(frame, [t, t + 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const x = interpolate(frame, [t, t + 14], [-40, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
          return (
            <div key={s} style={{display: 'flex', alignItems: 'center', gap: 22, marginTop: 14, opacity: o, transform: `translateX(${x}px)`, fontFamily: "'Onest', sans-serif", fontSize: 40, fontWeight: 600, color: colors.text, background: 'rgba(10,26,68,.55)', border: '1px solid rgba(127,176,255,.35)', borderRadius: 22, padding: '14px 26px'}}>
              <span style={{width: 52, height: 52, borderRadius: 26, background: colors.blue, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800}}>{i + 1}</span>
              {s}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
