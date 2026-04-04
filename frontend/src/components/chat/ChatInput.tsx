import { useState } from "react";
import { Send, Image, Smile, Mic, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmojiPicker from "./EmojiPicker";
import { useImageUpload } from "@/hooks/useImageUpload";
import React, { useRef } from "react";

interface ChatInputProps {
  onSend: (message: string, type?: 'text' | 'image') => void;
  onVideoCall?: () => void;
}

export const ChatInput = ({
  onSend,
  onVideoCall,
}: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, isUploading } = useImageUpload();

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim(), 'text');
      setMessage("");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await uploadImage(file);
      if (url) {
        onSend(url, 'image');
      }
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-center gap-2 p-4 bg-card border-t border-border">
      <div className="flex items-center gap-1">
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          hidden 
          onChange={handleImageUpload} 
        />
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Image className={`w-5 h-5 ${isUploading ? "animate-pulse" : ""}`} />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
            >
              <Smile className="w-5 h-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-auto p-0 border-none bg-transparent shadow-none" sideOffset={10}>
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          </PopoverContent>
        </Popover>
      </div>
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type a message..."
        className="flex-1 bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary"
      />
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-primary"
          onClick={onVideoCall}
        >
          <Video className="w-5 h-5" />
        </Button>
        <Button
          variant="gradient"
          size="icon"
          className="rounded-full"
          onClick={handleSend}
          disabled={!message.trim()}
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};
