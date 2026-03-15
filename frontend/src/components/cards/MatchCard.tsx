import { motion } from "framer-motion";
import { MessageCircle, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MatchCardProps {
  user: {
    id: string;
    name: string;
    age: number;
    image: string;
    lastActive?: string;
    isOnline?: boolean;
  };
  isNew?: boolean;
  onClick?: () => void;
  onMessage?: () => void;
  className?: string;
}

export const MatchCard = ({
  user,
  isNew = false,
  onClick,
  onMessage,
  className,
}: MatchCardProps) => {
  return (
    <motion.div
      className={cn(
        "relative flex flex-col items-center p-4 rounded-2xl bg-card shadow-card cursor-pointer hover:shadow-md transition-shadow",
        className
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      {/* New Match Indicator */}
      {isNew && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full gradient-primary flex items-center justify-center animate-pulse-soft">
          <Heart className="w-3 h-3 text-primary-foreground" />
        </div>
      )}

      {/* Avatar */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-coral-light">
          <img
            src={user.image}
            alt={user.name}
            className="w-full h-full object-cover"
          />
        </div>
        {user.isOnline && (
          <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-online border-2 border-card" />
        )}
      </div>

      {/* Info */}
      <div className="mt-3 text-center">
        <h4 className="font-medium text-foreground">
          {user.name}, {user.age}
        </h4>
        {user.lastActive && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {user.isOnline ? "Online now" : user.lastActive}
          </p>
        )}
      </div>

      {/* Message Button */}
      <Button
        size="sm"
        variant="soft"
        className="mt-3 gap-1"
        onClick={(e) => {
          e.stopPropagation();
          onMessage?.();
        }}
      >
        <MessageCircle className="w-4 h-4" />
        Message
      </Button>
    </motion.div>
  );
};
