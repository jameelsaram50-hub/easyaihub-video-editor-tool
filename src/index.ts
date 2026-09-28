import React from 'react';
import { registerRoot, Composition } from 'remotion';
import { MainComposition, MainCompositionProps } from './remotion/MainComposition';

export const RemotionRoot: React.FC = () => {
  return React.createElement(Composition as any, {
    id: 'Main',
    component: MainComposition,
    durationInFrames: 240,
    fps: 30,
    width: 1920,
    height: 1080,
    calculateMetadata: ({ props }: { props: MainCompositionProps }) => {
      const s = props?.settings;
      return {
        durationInFrames: s?.durationInFrames ? Math.max(1, s.durationInFrames) : 240,
        fps: s?.fps || 30,
        width: s?.width || 1920,
        height: s?.height || 1080,
      };
    },
    defaultProps: {
      settings: {
        id: 'main-comp',
        title: 'YouTube Long Video (16:9)',
        fps: 30,
        durationInFrames: 240,
        width: 1920,
        height: 1080,
        backgroundColor: '#090a10',
      },
      clips: [],
    } as MainCompositionProps,
  });
};

registerRoot(RemotionRoot);
