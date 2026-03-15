import { useState } from "react";
import { Send, Image, Smile, Mic, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatInputProps {
  onSend: (message: string) => void;
  onImageClick?: () => void;
  onEmojiClick?: () => void;
  onVideoCall?: () => void;
}

export const ChatInput = ({
  onSend,
  onImageClick,
  onEmojiClick,
  onVideoCall,
}: ChatInputProps) => {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
      setMessage("");
    }
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
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          onClick={onImageClick}
        >
          <Image className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          onClick={onEmojiClick}
        >
          <Smile className="w-5 h-5" />
        </Button>
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
