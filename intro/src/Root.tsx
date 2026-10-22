import React from 'react';
import {AbsoluteFill, Composition, Sequence} from 'remotion';
import {Intro} from './Intro';
import {VoiceScene} from './VoiceScene';
import {FPS, FULL_FRAMES, INTRO_FRAMES, VOICE_FRAMES} from './theme';

type Props = {hasVoiceover: boolean};

const Full: React.FC<Props> = ({hasVoiceover}) => (
  <AbsoluteFill>
    <Sequence from={INTRO_FRAMES} durationInFrames={VOICE_FRAMES}>
      <VoiceScene hasVoiceover={hasVoiceover} />
    </Sequence>
    <Sequence durationInFrames={INTRO_FRAMES}>
      <Intro />
    </Sequence>
  </AbsoluteFill>
);

const common = {fps: FPS, width: 1080, height: 1920} as const;

export const Root: React.FC = () => (
  <>
    <Composition id="IneasyIntro" component={Intro} durationInFrames={INTRO_FRAMES} {...common} />
    <Composition id="IneasyFull" component={Full} durationInFrames={FULL_FRAMES} defaultProps={{hasVoiceover: false}} {...common} />
  </>
);
