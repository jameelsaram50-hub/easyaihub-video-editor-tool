import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { ClipRenderer } from './ClipRenderer';
import { CompositionSettings, TimelineClip } from '../types/project';

export interface MainCompositionProps {
  [key: string]: unknown;
  settings: CompositionSettings;
  clips: TimelineClip[];
  hiddenTracks?: Record<number, boolean>;
}

export const MainComposition: React.FC<MainCompositionProps> = ({
  settings,
  clips,
  hiddenTracks = {},
}) => {
  const visibleClips = (clips || []).filter((clip) => !hiddenTracks[clip.trackIndex]);
  const sortedClips = [...visibleClips].sort((a, b) => a.trackIndex - b.trackIndex);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: settings?.backgroundColor || '#000000',
        overflow: 'hidden',
      }}
    >
      {sortedClips.map((clip) => (
        // Each clip lives in its own Sequence so media starts at its own frame 0
        // (plus mediaStartFrame) instead of the composition's absolute frame.
        <Sequence
          key={clip.id}
          from={clip.startFrame}
          durationInFrames={Math.max(1, clip.durationInFrames)}
          layout="none"
          name={clip.name}
        >
          <ClipRenderer clip={clip} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
