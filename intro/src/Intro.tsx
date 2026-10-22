import React from 'react';
import {AbsoluteFill, Audio, interpolate, random, staticFile, useCurrentFrame} from 'remotion';
import {Logo3D} from './Logo3D';
import {colors, INTRO_FRAMES} from './theme';
import {useFonts} from './useFonts';

const Bokeh: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      {Array.from({length: 26}).map((_, i) => {
        const x = random(`x${i}`) * 1080;
        const y0 = random(`y${i}`) * 1920;
        const size = 30 + random(`s${i}`) * 150;
        const speed = 0.25 + random(`v${i}`) * 0.7;
        const y = (y0 - frame * speed * 3 + 1920 * 2) % 1920;
        const o = interpolate(frame, [0, 40], [0, 0.18 + random(`o${i}`) * 0.2], {extrapolateRight: 'clamp'});
        const blue = random(`c${i}`) > 0.35;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: '50%',
              background: blue ? 'radial-gradient(circle, rgba(70,120,255,.8), transparent 70%)' : 'radial-gradient(circle, rgba(200,170,255,.7), transparent 70%)',
              opacity: o,
              filter: 'blur(6px)',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** 0:00 - 0:05. No voice. Cinnamon Girl fragment (public/intro-music-5s.mp3). */
export const Intro: React.FC<{withMusic?: boolean}> = ({withMusic = true}) => {
  useFonts();
  const frame = useCurrentFrame();
  const light = interpolate(frame, [0, 45, 120], [0, 0.35, 0.85], {extrapolateRight: 'clamp'});
  const outFade = interpolate(frame, [INTRO_FRAMES - 8, INTRO_FRAMES], [1, 0], {extrapolateLeft: 'clamp'});

  return (
    <AbsoluteFill style={{background: colors.bg, opacity: outFade}}>
      {withMusic ? <Audio src={staticFile('intro-music-5s.mp3')} volume={1} /> : null}
      {/* soft volumetric light from above */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 45% at 50% 32%, rgba(60,110,255,${0.32 * light}), transparent 70%), radial-gradient(80% 50% at 50% 100%, rgba(110,70,255,${0.22 * light}), transparent 70%)`,
        }}
      />
      <Bokeh />
      <Logo3D />
      {/* vignette */}
      <AbsoluteFill style={{background: 'radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(0,0,0,.65))'}} />
      <AbsoluteFill style={{background: '#000', opacity: interpolate(frame, [0, 14], [1, 0], {extrapolateRight: 'clamp'})}} />
    </AbsoluteFill>
  );
};
