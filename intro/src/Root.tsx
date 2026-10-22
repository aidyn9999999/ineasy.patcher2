import React from 'react';
import {Composition} from 'remotion';
import {Ad} from './Ad';
import {Intro} from './Intro';
import {END, FPS, sec} from './theme';

const common = {fps: FPS, width: 1080, height: 1920} as const;

export const Root: React.FC = () => (
  <>
    <Composition id="IneasyIntro" component={Intro} durationInFrames={sec(5)} {...common} />
    <Composition id="IneasyAd" component={Ad} durationInFrames={sec(END)} {...common} />
  </>
);
