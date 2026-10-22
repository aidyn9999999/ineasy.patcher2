import React from 'react';
import {Easing, interpolate, useCurrentFrame, spring, useVideoConfig} from 'remotion';
import {colors, fontFamily} from './theme';

// Vector redraw of the ineasy "N" mark (540x580 grid of ineasy-logo.png).
const SHAPES: {points: string; face: string; side: string; rim: string}[] = [
  {points: '75,108 165,222 165,332 75,372', face: '#2f6bff', side: '#12328f', rim: '#9cc2ff'},
  {points: '80,100 150,66 235,62 300,112 445,338 440,368 312,358 165,226', face: '#15307a', side: '#0a1a48', rim: '#6f9bff'},
  {points: '352,80 445,176 445,306 352,190', face: '#15307a', side: '#0a1a48', rim: '#6f9bff'},
  {points: '356,62 445,30 445,174', face: '#2f6bff', side: '#12328f', rim: '#9cc2ff'},
];

const LAYERS = 12;
const DEPTH = 46;

const Mark: React.FC<{spread: number; front?: boolean; layers?: number}> = ({spread, front = true, layers = LAYERS}) => (
  <div style={{position: 'absolute', inset: 0, transformStyle: 'preserve-3d'}}>
    {Array.from({length: layers}).map((_, i) => {
      const t = i / (layers - 1);
      const isFront = i === layers - 1;
      return (
        <svg
          key={i}
          viewBox="0 0 540 400"
          width={540}
          height={400}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translateZ(${(t - 0.5) * DEPTH * spread}px)`,
            filter: isFront && front ? 'drop-shadow(0 0 26px rgba(80,130,255,.55))' : undefined,
          }}
        >
          {SHAPES.map((s, k) => (
            <polygon
              key={k}
              points={s.points}
              fill={isFront ? s.face : s.side}
              stroke={isFront ? s.rim : s.side}
              strokeWidth={isFront ? 3 : 1.5}
              strokeLinejoin="round"
            />
          ))}
        </svg>
      );
    })}
  </div>
);

const WordMark: React.FC<{spread: number; layers?: number}> = ({spread, layers = 6}) => (
  <div style={{position: 'absolute', left: 0, top: 410, width: 540, height: 90, transformStyle: 'preserve-3d'}}>
    {Array.from({length: layers}).map((_, i) => {
      const t = i / (layers - 1);
      const isFront = i === layers - 1;
      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            textAlign: 'center',
            fontFamily,
            fontWeight: 800,
            fontSize: 56,
            letterSpacing: 6,
            lineHeight: '90px',
            color: isFront ? colors.text : '#1a2c66',
            transform: `translateZ(${(t - 0.5) * 18 * spread}px)`,
            textShadow: isFront ? '0 0 30px rgba(110,160,255,.7)' : undefined,
          }}
        >
          INEASY.SITE
        </div>
      );
    })}
  </div>
);

/**
 * 3D logo with camera move. `frame` 0..150 is the intro timeline:
 *  0-30   darkness, soft light
 *  30-90  camera pushes through space, logo materialises, extrusion unfolds
 *  90-150 logo settles crisp, light sweep, ready for the cut to the interface
 */
export const Logo3D: React.FC = () => {
  const {fps: realFps} = useVideoConfig();
  const frame = (useCurrentFrame() * 30) / realFps; // timeline below is authored at 30 fps
  const fps = 30;

  const appear = spring({frame: frame - 30, fps, config: {damping: 200}, durationInFrames: 70});
  const settle = Easing.bezier(0.16, 1, 0.3, 1)(interpolate(frame, [30, 120], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));

  const camZ = interpolate(settle, [0, 1], [-1400, 0]);
  const rotY = interpolate(settle, [0, 1], [-38, 0]) + Math.sin(frame / 38) * 2.2 * settle;
  const rotX = interpolate(settle, [0, 1], [12, -3]);
  const spread = interpolate(appear, [0, 1], [0, 1]);
  const opacity = interpolate(frame, [30, 62], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const scale = 1.75 + 0.03 * Math.sin(frame / 30) * settle + interpolate(frame, [120, 150], [0, 0.04], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // glossy light sweep across the logo, 3.3s -> 4.4s
  const sweep = interpolate(frame, [98, 132], [-60, 160], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});

  const mkLogo = (reflection: boolean) => (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: reflection ? '50%' : undefined,
        width: 540,
        height: 510,
        marginLeft: -270,
        transformStyle: 'preserve-3d',
        transform: reflection ? 'translateY(330px) scaleY(-1)' : undefined,
        opacity: reflection ? 0.22 : 1,
        WebkitMaskImage: reflection ? 'linear-gradient(to bottom, transparent 40%, #000 100%)' : undefined,
        maskImage: reflection ? 'linear-gradient(to bottom, transparent 40%, #000 100%)' : undefined,
      }}
    >
      <Mark spread={spread} front={!reflection} layers={reflection ? 3 : LAYERS} />
      <WordMark spread={spread} layers={reflection ? 2 : 6} />
    </div>
  );

  return (
    <div style={{position: 'absolute', inset: 0, perspective: 1400, perspectiveOrigin: '50% 45%', opacity}}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transform: `translateZ(${camZ}px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale})`,
        }}
      >
        <div style={{position: 'absolute', left: 0, top: '50%', width: '100%', marginTop: -330, transformStyle: 'preserve-3d'}}>
          <div style={{position: 'relative', height: 510, transformStyle: 'preserve-3d'}}>{mkLogo(false)}</div>
          <div style={{position: 'relative', height: 0, transformStyle: 'preserve-3d'}}>{mkLogo(true)}</div>
        </div>
      </div>
      {/* sweep highlight (screen-space) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          mixBlendMode: 'screen',
          background: `linear-gradient(105deg, transparent ${sweep - 14}%, rgba(170,200,255,.28) ${sweep}%, transparent ${sweep + 14}%)`,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
