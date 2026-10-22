import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fontFamily} from './theme';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Scene wrapper: fades in/out at its edges. `dur` in frames. */
export const Fade: React.FC<{dur: number; inF?: number; outF?: number; children: React.ReactNode}> = ({dur, inF = 12, outF = 12, children}) => {
  const f = useCurrentFrame();
  const end = Math.max(dur, inF + 3);
  const outStart = outF === 0 ? end - 1 : Math.max(end - outF, inF + 1);
  const o = interpolate(f, [0, inF, outStart, end], [0, 1, 1, outF === 0 ? 1 : 0], clamp);
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

export const StepTag: React.FC<{n: number; label: string}> = ({n, label}) => {
  const f = useCurrentFrame();
  const y = interpolate(f, [0, 18], [-30, 0], {...clamp, easing: Easing.out(Easing.cubic)});
  const o = interpolate(f, [0, 14], [0, 1], clamp);
  return (
    <div style={{position: 'absolute', top: 64, left: 56, right: 56, display: 'flex', alignItems: 'center', gap: 18, opacity: o, transform: `translateY(${y}px)`, padding: '16px 26px', borderRadius: 26, background: 'rgba(6,14,38,.78)', border: '1px solid rgba(127,176,255,.35)', backdropFilter: 'blur(10px)', fontFamily: "'Onest', sans-serif", color: colors.text}}>
      <span style={{minWidth: 58, height: 58, borderRadius: 29, background: colors.blue, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily, fontWeight: 800, fontSize: 28}}>{n}</span>
      <span style={{fontSize: 38, fontWeight: 600, lineHeight: 1.15}}>{label}</span>
      <span style={{marginLeft: 'auto', fontSize: 26, opacity: 0.55, fontFamily}}>{n}/12</span>
    </div>
  );
};

type Tap = {at: number; x: number; y: number};
type Zoom = {at: number; s: number; x: number; y: number};

/**
 * Real screenshot of INEASY.SITE (captured from the repo's public/ pages, mocked API data).
 * `at` values are in seconds relative to the scene start.
 */
export const Shot: React.FC<{src: string; zooms?: Zoom[]; taps?: Tap[]; showFrom?: number; dim?: number}> = ({src, zooms = [{at: 0, s: 1, x: 540, y: 960}], taps = [], showFrom = 0}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const times = zooms.map((z) => z.at);
  const ease = (a: number[]) => interpolate(t, times, a, {...clamp, easing: Easing.inOut(Easing.cubic)});
  const s = times.length > 1 ? ease(zooms.map((z) => z.s)) : zooms[0].s;
  const cx = times.length > 1 ? ease(zooms.map((z) => z.x)) : zooms[0].x;
  const cy = times.length > 1 ? ease(zooms.map((z) => z.y)) : zooms[0].y;
  const tx = 540 - cx * s;
  const ty = 960 - cy * s;
  return (
    <AbsoluteFill style={{background: colors.bg, opacity: interpolate(t, [showFrom, showFrom + 0.3], [0, 1], clamp)}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${s})`}}>
        <Img src={staticFile(src)} style={{width: 1080, height: 1919, display: 'block'}} />
        {taps.map((tp, i) => {
          const d = t - tp.at;
          if (d < -0.45 || d > 0.9) return null;
          const approach = interpolate(d, [-0.45, 0], [70, 0], {...clamp, easing: Easing.out(Easing.cubic)});
          const ring = interpolate(d, [0, 0.6], [0, 1], clamp);
          return (
            <React.Fragment key={i}>
              <div style={{position: 'absolute', left: tp.x - 40, top: tp.y - 40, width: 80, height: 80, borderRadius: 40, border: '5px solid rgba(160,200,255,.95)', opacity: d < 0 ? 0 : 1 - ring, transform: `scale(${0.6 + ring * 1.4})`}} />
              <div style={{position: 'absolute', left: tp.x - 17 + approach, top: tp.y - 17 + approach, width: 34, height: 34, borderRadius: 17, background: 'rgba(255,255,255,.95)', boxShadow: '0 0 0 8px rgba(47,107,255,.45), 0 8px 30px rgba(0,0,0,.5)', transform: d > 0 && d < 0.15 ? 'scale(.8)' : 'scale(1)', opacity: interpolate(d, [-0.45, -0.3, 0.7, 0.9], [0, 1, 1, 0], clamp)}} />
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** Dark navy backdrop used by the stylised (non-site) cards. */
export const Backdrop: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{background: `radial-gradient(70% 40% at 50% 20%, rgba(47,107,255,.28), transparent 70%), ${colors.bg}`, fontFamily: "'Onest', sans-serif", color: colors.text}}>{children}</AbsoluteFill>
);

export const Card: React.FC<{style?: React.CSSProperties; children: React.ReactNode}> = ({style, children}) => (
  <div style={{borderRadius: 36, background: 'rgba(14,26,66,.72)', border: '1px solid rgba(127,176,255,.28)', boxShadow: '0 30px 80px rgba(0,0,0,.55)', padding: 44, ...style}}>{children}</div>
);

export const Pill: React.FC<{children: React.ReactNode; active?: boolean; style?: React.CSSProperties}> = ({children, active, style}) => (
  <div style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '24px 40px', borderRadius: 24, fontSize: 40, fontWeight: 700, background: active ? colors.blue : 'rgba(127,176,255,.14)', color: colors.text, boxShadow: active ? '0 0 50px rgba(47,107,255,.55)' : undefined, ...style}}>{children}</div>
);

export const Tapper: React.FC<{at: number; x: number; y: number}> = ({at, x, y}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const d = f / fps - at;
  if (d < -0.4 || d > 0.9) return null;
  const ring = interpolate(d, [0, 0.6], [0, 1], clamp);
  const approach = interpolate(d, [-0.4, 0], [60, 0], {...clamp, easing: Easing.out(Easing.cubic)});
  return (
    <>
      <div style={{position: 'absolute', left: x - 40, top: y - 40, width: 80, height: 80, borderRadius: 40, border: '5px solid rgba(160,200,255,.95)', opacity: d < 0 ? 0 : 1 - ring, transform: `scale(${0.6 + ring * 1.4})`}} />
      <div style={{position: 'absolute', left: x - 17 + approach, top: y - 17 + approach, width: 34, height: 34, borderRadius: 17, background: '#fff', boxShadow: '0 0 0 8px rgba(47,107,255,.45)', opacity: interpolate(d, [-0.4, -0.25, 0.7, 0.9], [0, 1, 1, 0], clamp)}} />
    </>
  );
};
