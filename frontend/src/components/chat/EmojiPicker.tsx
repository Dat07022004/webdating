import React, { useRef, useEffect } from "react";
import "emoji-picker-element";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  className?: string;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, className }) => {
  const pickerRef = useRef<any>(null);

  useEffect(() => {
    const handleEmoji = (event: any) => {
      onEmojiSelect(event.detail.unicode);
    };

    const currentPicker = pickerRef.current;
    if (currentPicker) {
      currentPicker.addEventListener("emoji-click", handleEmoji);
    }

    return () => {
      if (currentPicker) {
        currentPicker.removeEventListener("emoji-click", handleEmoji);
      }
    };
  }, [onEmojiSelect]);

  return (
    <div className={className}>
      {/* @ts-ignore: custom element */}
      <emoji-picker ref={pickerRef}></emoji-picker>
    </div>
  );
};

export default EmojiPicker;
