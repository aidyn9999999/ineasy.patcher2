import React from 'react';
import {AbsoluteFill, Easing, Freeze, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Logo3D} from './Logo3D';
import {Backdrop, Card, clamp, Fade, Pill, Shot, StepTag, Tapper} from './ui';
import {colors, fontFamily, FPS, HOOK_LINES, sec, T, END} from './theme';
import {useFonts} from './useFonts';

const seg = (k: keyof typeof T) => ({from: sec(T[k][0]), dur: sec(T[k][1] - T[k][0]) + 12});
const Scene: React.FC<{k: keyof typeof T; children: React.ReactNode}> = ({k, children}) => {
  const {from, dur} = seg(k);
  return (
    <Sequence from={from} durationInFrames={dur} layout="none">
      <Sequence from={0} durationInFrames={dur}>
        <Fade dur={dur}>{children}</Fade>
      </Sequence>
    </Sequence>
  );
};

/* ---------- hook: the user's own night video, full-bleed ---------- */
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const scale = 1 + t * 0.003;
  return (
    <AbsoluteFill style={{background: colors.bg}}>
      <AbsoluteFill style={{transform: `scale(${scale})`}}>
        <OffthreadVideo src={staticFile('src1080.mp4')} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(2,4,10,.5), rgba(2,4,10,0) 30%, rgba(2,4,10,.7))'}} />
      {HOOK_LINES.map((l) => {
        const a = l.from;
        const b = l.to;
        if (t < a || t > b) return null;
        const words = l.text.split(' ');
        return (
          <div key={l.from} style={{position: 'absolute', left: 70, right: 70, top: 1250, textAlign: 'center', opacity: interpolate(t, [b - 0.3, b], [1, 0], clamp), fontFamily, fontWeight: 800, fontSize: 56, lineHeight: 1.22, color: colors.text, textShadow: '0 4px 30px rgba(0,0,0,.85)'}}>
            {words.map((w, i) => {
              const s = a + (i / words.length) * (b - a) * 0.6;
              const o = interpolate(t, [s, s + 0.2], [0, 1], clamp);
              const y = interpolate(t, [s, s + 0.25], [22, 0], {...clamp, easing: Easing.out(Easing.cubic)});
              const brand = w.startsWith('INEASY') || w.startsWith('TikTok');
              return <span key={i} style={{display: 'inline-block', marginRight: 16, opacity: o, transform: `translateY(${y}px)`, color: brand ? colors.blueLight : colors.text}}>{w}</span>;
            })}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ---------- split comparison with synchronised video panels ---------- */
const PW = 495;
const PH = 1000;
const CX = 540; // source-pixel centre of the compared fragment (1080p coordinates)
const CY = 760;

const Panel: React.FC<{side: 'l' | 'r'; src: string; scale: number; label: string; sub: string; start: number; ring?: boolean; hot?: boolean; delay?: number; ringAt?: number; labelAt?: number}> = ({side, src, scale, label, sub, start, ring, hot, delay = 0, ringAt = 0, labelAt = 0.4}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps - delay;
  const slide = interpolate(t, [0.05, 0.7], [side === 'l' ? -620 : 620, 0], {...clamp, easing: Easing.out(Easing.cubic)});
  const o = interpolate(t, [0.05, 0.5], [0, 1], clamp);
  const lab = interpolate(t, [labelAt, labelAt + 0.3], [0, 1], clamp);
  const w = scale === 2 ? 540 : 1080;
  const h = scale === 2 ? 960 : 1920;
  const tx = PW / 2 - CX;
  const ty = PH / 2 - CY;
  const pulse = ring ? interpolate(t - ringAt, [0, 0.4, 1.0], [0, 1, 0.55], clamp) : 0;
  return (
    <div style={{position: 'absolute', top: 340, left: side === 'l' ? 30 : 555, width: PW, opacity: o, transform: `translateX(${slide}px)`}}>
      <div style={{display: 'flex', justifyContent: 'center', marginBottom: 22}}>
        <Pill active={hot} style={{fontFamily, fontSize: 44, padding: '16px 38px', opacity: lab, transform: `scale(${0.85 + 0.15 * lab})`}}>{label}</Pill>
      </div>
      <div style={{position: 'relative', width: PW, height: PH, overflow: 'hidden', borderRadius: 28, border: `3px solid ${hot ? colors.blue : 'rgba(127,176,255,.35)'}`, boxShadow: hot ? '0 0 60px rgba(47,107,255,.35)' : undefined}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: w, height: h, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${scale === 2 ? 2 : 1})`}}>
          <OffthreadVideo src={staticFile(src)} muted startFrom={sec(start)} style={{width: w, height: h, display: 'block'}} />
        </div>
        {ring ? <div style={{position: 'absolute', left: PW / 2 - 120, top: PH / 2 - 150, width: 240, height: 240, borderRadius: 120, border: `5px solid rgba(160,205,255,${0.9 * pulse})`, boxShadow: `0 0 40px rgba(80,140,255,${0.7 * pulse})`, transform: `scale(${1 + 0.12 * Math.sin(t * 6) * pulse})`}} /> : null}
      </div>
      <div style={{textAlign: 'center', marginTop: 20, fontSize: 30, opacity: 0.8, fontFamily: "'Onest', sans-serif", color: colors.text}}>{sub}</div>
    </div>
  );
};

const Split: React.FC<{title: string; footer: string; left: string; right: string; leftSub: string; rightSub: string; start: number; ring?: boolean; delay?: number; ringAt?: number; leftAt?: number; rightAt?: number}> = ({title, footer, left, right, leftSub, rightSub, start, ring, delay = 0, ringAt = 0, leftAt = 0.4, rightAt = 0.4}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps - delay;
  const div = interpolate(t, [0.3, 0.9], [0, 1], clamp);
  return (
    <Backdrop>
      <div style={{position: 'absolute', top: 130, left: 50, right: 50, textAlign: 'center', fontFamily, fontWeight: 800, fontSize: 60, lineHeight: 1.2, opacity: interpolate(f / fps, [0, 0.4], [0, 1], clamp)}}>{title}</div>
      <Panel side="l" src="src540.mp4" scale={2} label={left} sub={leftSub} start={start} ring={ring} delay={delay} ringAt={ringAt} labelAt={leftAt} />
      <Panel side="r" src="src1080.mp4" scale={1} label={right} sub={rightSub} start={start} ring={ring} hot delay={delay} ringAt={ringAt} labelAt={rightAt} />
      <div style={{position: 'absolute', left: 539, top: 420 + 0, width: 2, height: PH * div, opacity: t > 0 ? 1 : 0, background: 'rgba(160,205,255,.8)', boxShadow: '0 0 20px rgba(80,140,255,.9)'}} />
      <div style={{position: 'absolute', left: 60, right: 60, bottom: 150, textAlign: 'center', fontSize: 32, lineHeight: 1.35, opacity: 0.75, fontFamily: "'Onest', sans-serif"}}>{footer}</div>
    </Backdrop>
  );
};

/* ---------- stylised third-party steps (not captures of those sites) ---------- */
const Typing: React.FC<{text: string; start: number; cps?: number}> = ({text, start, cps = 14}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const n = Math.max(0, Math.min(text.length, Math.floor((f / fps - start) * cps)));
  return <>{text.slice(0, n)}</>;
};

const Google: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const res = interpolate(t, [1.6, 2.0], [0, 1], clamp);
  return (
    <Backdrop>
      <StepTag n={1} label="Іздеу жүйесінде INEASY.SITE табу" />
      <div style={{position: 'absolute', left: 60, right: 60, top: 520}}>
        <Card style={{padding: '34px 40px', display: 'flex', alignItems: 'center', gap: 24, borderRadius: 70}}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={colors.blueLight} strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <span style={{fontSize: 54, fontWeight: 600}}><Typing text="INEASY.SITE" start={0.3} /><span style={{opacity: Math.floor(t * 2.5) % 2 ? 0 : 1}}>|</span></span>
        </Card>
        <div style={{marginTop: 50, opacity: res, transform: `translateY(${(1 - res) * 30}px)`}}>
          <Card>
            <div style={{fontSize: 30, opacity: 0.6}}>ineasy.site</div>
            <div style={{fontSize: 52, fontWeight: 700, color: colors.blueLight, marginTop: 10}}>INEASY — подготовка видео для TikTok</div>
            <div style={{fontSize: 34, opacity: 0.75, marginTop: 14}}>Патчер для публикации видео без потери качества</div>
          </Card>
        </div>
      </div>
      <Tapper at={2.3} x={540} y={900} />
    </Backdrop>
  );
};

const Zernio: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  return (
    <Backdrop>
      <StepTag n={7} label="Zernio сайтын ашу және кіру" />
      <div style={{position: 'absolute', left: 60, right: 60, top: 420}}>
        <Card>
          <div style={{fontFamily, fontSize: 84, fontWeight: 800, letterSpacing: 2}}>Zernio</div>
          <div style={{fontSize: 36, opacity: 0.65, marginTop: 6}}>zernio.com</div>
          <div style={{marginTop: 54, display: 'flex', flexDirection: 'column', gap: 24}}>
            <div style={{padding: '26px 30px', borderRadius: 22, background: 'rgba(127,176,255,.1)', fontSize: 38, opacity: 0.8}}>Email</div>
            <div style={{padding: '26px 30px', borderRadius: 22, background: 'rgba(127,176,255,.1)', fontSize: 38, opacity: 0.8}}>••••••••</div>
            <Pill active style={{width: '100%', boxSizing: 'border-box'}}>Sign in</Pill>
          </div>
        </Card>
        <div style={{marginTop: 50, opacity: interpolate(t, [3.7, 4.2], [0, 1], clamp)}}>
          <Card>
            <div style={{fontSize: 40, fontWeight: 700, marginBottom: 20}}>Dashboard</div>
            <div style={{display: 'flex', gap: 20, flexWrap: 'wrap'}}>
              <Pill active>Connections</Pill>
              <Pill>API Keys</Pill>
            </div>
          </Card>
        </div>
      </div>
      <Tapper at={3.2} x={540} y={930} />
      <Tapper at={4.6} x={250} y={1510} />
    </Backdrop>
  );
};

const Connections: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const on = t > 2.0;
  return (
    <Backdrop>
      <StepTag n={8} label="Connections бөлімі · TikTok қосу" />
      <div style={{position: 'absolute', left: 60, right: 60, top: 430}}>
        <div style={{fontFamily, fontSize: 64, fontWeight: 800, marginBottom: 36}}>Connections</div>
        <Card style={{display: 'flex', alignItems: 'center', gap: 30}}>
          <div style={{width: 110, height: 110, borderRadius: 28, background: '#000', border: '2px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60}}>♪</div>
          <div style={{flex: 1}}>
            <div style={{fontSize: 52, fontWeight: 700}}>TikTok</div>
            <div style={{fontSize: 32, opacity: 0.65, marginTop: 6}}>{on ? 'Connected' : 'Not connected'}</div>
          </div>
          <Pill active={!on} style={{background: on ? 'rgba(40,200,140,.9)' : undefined}}>{on ? '✓ Connected' : 'Connect'}</Pill>
        </Card>
        <div style={{marginTop: 36, fontSize: 34, opacity: interpolate(t, [2.1, 2.6], [0, 0.8], clamp), lineHeight: 1.4}}>Авторизация TikTok-аккаунта выполняется в окне TikTok.</div>
      </div>
      <Tapper at={1.4} x={860} y={640} />
    </Backdrop>
  );
};

const ApiKey: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const made = t > 0.9;
  const copied = t > 2.3;
  return (
    <Backdrop>
      <StepTag n={9} label="API Key жасау және көшіру" />
      <div style={{position: 'absolute', left: 60, right: 60, top: 430}}>
        <div style={{fontFamily, fontSize: 64, fontWeight: 800, marginBottom: 36}}>API Keys</div>
        <Pill active style={{width: '100%', boxSizing: 'border-box'}}>+ Create API key</Pill>
        <div style={{marginTop: 44, opacity: interpolate(t, [0.9, 1.3], [0, 1], clamp), transform: `translateY(${interpolate(t, [0.9, 1.3], [24, 0], clamp)}px)`}}>
          {made ? (
            <Card>
              <div style={{fontSize: 32, opacity: 0.6}}>Your API key</div>
              <div style={{display: 'flex', alignItems: 'center', gap: 24, marginTop: 18}}>
                <div style={{flex: 1, fontSize: 44, letterSpacing: 4, fontFamily: "'JetBrains Mono', monospace", opacity: 0.9}}>••••••••••••••••</div>
                <Pill active={!copied} style={{background: copied ? 'rgba(40,200,140,.9)' : undefined}}>{copied ? '✓ Copied' : 'Copy'}</Pill>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
      <Tapper at={0.5} x={540} y={640} />
      <Tapper at={2.0} x={880} y={875} />
    </Backdrop>
  );
};

const Toast: React.FC<{at: number; text: string}> = ({at, text}) => {
  const f = useCurrentFrame();
  const t = f / FPS - at;
  const o = interpolate(t, [0, 0.3], [0, 1], clamp);
  return (
    <div style={{position: 'absolute', left: 80, right: 80, bottom: 220, opacity: o, transform: `translateY(${(1 - o) * 40}px)`, padding: '30px 40px', borderRadius: 30, background: 'rgba(30,170,120,.95)', fontFamily: "'Onest', sans-serif", fontWeight: 700, fontSize: 44, textAlign: 'center', color: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,.5)'}}>{text}</div>
  );
};

const OVERVIEW = ['Google-да INEASY.SITE іздеу', 'Сайтты ашу', 'Telegram арқылы кіру', 'Patcher бөліміне өту', 'Видеоны таңдау, өңдеуді бастау', 'Жариялауға дайындалу', 'Zernio сайтына кіру', 'Connections: TikTok байланыстыру', 'API Key жасау', 'API Key көшіру', 'Кілтті INEASY.SITE-қа енгізу', 'Сипаттама жазып, жариялау'];
const Overview: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  return (
    <Backdrop>
      <div style={{position: 'absolute', top: 150, left: 50, right: 50, textAlign: 'center', fontFamily, fontWeight: 800, fontSize: 62, lineHeight: 1.2, opacity: interpolate(t, [0, 0.4], [0, 1], clamp)}}>Қалай жасауға болады?</div>
      <div style={{position: 'absolute', top: 400, left: 60, right: 60}}>
        {OVERVIEW.map((label, i) => {
          const at = 0.5 + i * 0.36;
          const o = interpolate(t, [at, at + 0.3], [0, 1], clamp);
          const x = interpolate(t, [at, at + 0.35], [-50, 0], {...clamp, easing: Easing.out(Easing.cubic)});
          return (
            <div key={label} style={{display: 'flex', alignItems: 'center', gap: 24, marginBottom: 16, opacity: o, transform: `translateX(${x}px)`, padding: '14px 26px', borderRadius: 22, background: 'rgba(10,26,68,.6)', border: '1px solid rgba(127,176,255,.3)', fontSize: 38, fontWeight: 600}}>
              <span style={{minWidth: 52, height: 52, borderRadius: 26, background: colors.blue, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily, fontWeight: 800, fontSize: 26}}>{i + 1}</span>
              {label}
            </div>
          );
        })}
      </div>
    </Backdrop>
  );
};

const Final: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  return (
    <AbsoluteFill style={{background: colors.bg}}>
      <AbsoluteFill style={{background: 'radial-gradient(60% 45% at 50% 38%, rgba(60,110,255,.32), transparent 70%), radial-gradient(80% 50% at 50% 100%, rgba(110,70,255,.22), transparent 70%)'}} />
      <Freeze frame={Math.round(130 * (FPS / 30))}>
        <Logo3D />
      </Freeze>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1260, textAlign: 'center', fontFamily: "'Onest', sans-serif", fontSize: 40, letterSpacing: 4, opacity: interpolate(t, [0.8, 1.6], [0, 0.8], clamp), color: colors.blueLight}}>Patcher · Zernio · TikTok</div>
      <AbsoluteFill style={{background: 'radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(0,0,0,.65))'}} />
    </AbsoluteFill>
  );
};

const shotProps = {
  login: 'ui/login.png', home: 'ui/home.png', patcher: 'ui/patcher.png', process: 'ui/patcher-video.png', result: 'ui/result.png',
  zEmpty: 'ui/zernio-empty.png', zFilled: 'ui/zernio-filled.png', form: 'ui/publish-form.png', cap: 'ui/publish-caption.png', submit: 'ui/publish-submit.png',
};

export const Ad: React.FC<{hasMusic?: boolean}> = ({hasMusic = true}) => {
  useFonts();
  const sTag = (n: number, label: string) => <StepTag n={n} label={label} />;
  return (
    <AbsoluteFill style={{background: colors.bg}}>
      {hasMusic ? null : null}
      <Scene k="hook"><Hook /></Scene>

      <Scene k="compare">
        <Split title="Қарашы, нәтижесі қандай!" left="540p" right="1080p" leftSub="540×960" rightSub="1080×1920" start={6} ring ringAt={5.4} leftAt={3.3} rightAt={4.4}
          footer="Бір видео, бір кадр, 1:1 ұлғайтылған фрагмент. 540p — сіздің бастапқы видеоңыздан жасалған нұсқа." />
      </Scene>

      <Scene k="overview"><Overview /></Scene>

      <Scene k="google"><Google /></Scene>

      <Scene k="site">
        <Shot src={shotProps.login} zooms={[{at: 0, s: 1, x: 540, y: 960}, {at: 3.2, s: 1.12, x: 540, y: 1000}]} />
        {sTag(2, 'Сайтқа өту')}
      </Scene>

      <Scene k="telegram">
        <Shot src={shotProps.login} zooms={[{at: 0, s: 1, x: 540, y: 1000}, {at: 1.2, s: 1.15, x: 540, y: 1200}]} taps={[{at: 1.4, x: 540, y: 1235}]} />
        <Sequence from={sec(1.9)}><Fade dur={sec(1.6)} inF={10} outF={0}><Shot src={shotProps.home} /></Fade></Sequence>
        {sTag(3, 'Telegram арқылы кіру')}
      </Scene>

      <Scene k="patcher">
        <Shot src={shotProps.home} zooms={[{at: 0, s: 1, x: 540, y: 1100}, {at: 1.4, s: 1.25, x: 540, y: 1592}]} taps={[{at: 1.8, x: 540, y: 1592}]} />
        <Sequence from={sec(2.4)}><Fade dur={sec(1.6)} inF={10} outF={0}><Shot src={shotProps.patcher} /></Fade></Sequence>
        {sTag(4, 'Patcher ашу')}
      </Scene>

      <Scene k="process">
        <Shot src={shotProps.process} zooms={[{at: 0, s: 1, x: 540, y: 960}, {at: 1.3, s: 1.25, x: 540, y: 961}]} taps={[{at: 1.8, x: 540, y: 961}]} />
        <Sequence from={sec(2.6)}><Fade dur={sec(1.7)} inF={10} outF={0}><Shot src={shotProps.result} /></Fade></Sequence>
        {sTag(5, 'Видеоны таңдау және өңдеуді бастау')}
      </Scene>

      <Scene k="publish">
        <Shot src={shotProps.result} zooms={[{at: 0, s: 1, x: 540, y: 960}, {at: 1.0, s: 1.3, x: 540, y: 960}]} taps={[{at: 1.5, x: 540, y: 960}]} />
        {sTag(6, 'Жариялау функциясына өту')}
      </Scene>

      <Scene k="zernio"><Zernio /></Scene>
      <Scene k="connections"><Connections /></Scene>
      <Scene k="apikey"><ApiKey /></Scene>

      <Scene k="enterKey">
        <Shot src={shotProps.zFilled} zooms={[{at: 0, s: 1.05, x: 540, y: 1100}, {at: 1.0, s: 1.3, x: 540, y: 1300}]} taps={[{at: 1.9, x: 540, y: 1482}]} />
        {sTag(11, 'INEASY.SITE-қа қайту, кілтті енгізу')}
      </Scene>

      <Scene k="caption">
        <Shot src={shotProps.cap} zooms={[{at: 0, s: 1.1, x: 540, y: 900}, {at: 2.2, s: 1.1, x: 540, y: 1000}]} />
        <Sequence from={sec(2.6)}><Fade dur={sec(2.4)} inF={10} outF={0}><Shot src={shotProps.submit} zooms={[{at: 0, s: 1.1, x: 540, y: 1300}]} taps={[{at: 0.6, x: 540, y: 1464}]} /><Toast at={1.4} text="Жарияланды ✓" /></Fade></Sequence>
        {sTag(12, 'Сипаттама жазып, жариялау')}
      </Scene>

      <Scene k="patchCompare">
        <Split title="Patcher-сіз және Patcher-мен" left="Без Patcher" right="С Patcher" leftSub="демо: 540p" rightSub="демо: 1080p" start={0} delay={3.0}
          footer="Демонстрациялық салыстыру: бір бастапқы видео. Бұл TikTok-қа жарияланғаннан кейінгі нақты нәтиже емес." />
      </Scene>

      <Scene k="final"><Final /></Scene>
    </AbsoluteFill>
  );
};
