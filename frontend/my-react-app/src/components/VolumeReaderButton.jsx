import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Headphones } from 'lucide-react';
import { togglePageReader, stopPageReader, subscribeSpeechState, getIsSpeaking } from '../services/speechReader';

export default function VolumeReaderButton({
  activeTab,
  size = 'normal',
  showLabel = true,
  showFullText = true
}) {
  const [isSpeaking, setIsSpeaking] = useState(getIsSpeaking());
  const [currentSentence, setCurrentSentence] = useState('');

  // Subscribe to speech state changes
  useEffect(() => {
    const unsubscribe = subscribeSpeechState(({ isSpeaking, currentSentence }) => {
      setIsSpeaking(isSpeaking);
      setCurrentSentence(currentSentence);
    });
    return unsubscribe;
  }, []);

  // Automatically cancel speech when user navigates to another view
  useEffect(() => {
    stopPageReader();
  }, [activeTab]);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    togglePageReader();
  };

  const isCompact = size === 'compact';
  const isSidebar = size === 'sidebar';

  let labelText = '';
  if (showLabel) {
    if (showFullText && !isCompact && !isSidebar) {
      labelText = isSpeaking ? 'Reading Page Aloud' : 'Read Page Aloud';
    } else {
      labelText = isSpeaking ? 'Stop' : 'Listen';
    }
  }

  return (
    <button
      type="button"
      className={`volume-reader-btn ${isSpeaking ? 'is-speaking' : ''} ${isCompact ? 'compact-volume-btn' : ''} ${isSidebar ? 'sidebar-volume-btn' : ''}`}
      onClick={handleClick}
      aria-label={isSpeaking ? 'Stop reading page aloud' : 'Read full page aloud'}
      aria-pressed={isSpeaking}
      title={isSpeaking ? 'Click to stop reading page' : 'Read full page text aloud'}
    >
      <div className="volume-icon-wrapper">
        {isSpeaking ? (
          <VolumeX
            size={isCompact ? 13 : 15}
            strokeWidth={2.4}
            className="volume-icon speaking-pulse"
          />
        ) : (
          <Headphones
            size={isCompact ? 13 : 15}
            strokeWidth={2}
            className="volume-icon"
          />
        )}
      </div>

      {showLabel && labelText && (
        <span className="volume-btn-label">
          {labelText}
        </span>
      )}

      {isSpeaking && (
        <span className="speech-equalizer-bars" aria-hidden="true">
          <span className="eq-bar bar-1" />
          <span className="eq-bar bar-2" />
          <span className="eq-bar bar-3" />
        </span>
      )}
    </button>
  );
}

