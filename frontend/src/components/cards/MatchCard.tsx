import { motion } from "framer-motion";
import { MessageCircle, Heart, MoreVertical, ShieldAlert, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  onReport?: () => void;
  onBlock?: () => void;
  className?: string;
}

export const MatchCard = ({
  user,
  isNew = false,
  onClick,
  onMessage,
  onReport,
  onBlock,
  className,
}: MatchCardProps) => {
  return (
    <motion.div
      className={cn(
        "group relative flex flex-col items-center p-4 rounded-2xl bg-card shadow-card cursor-pointer hover:shadow-md transition-all border border-transparent hover:border-border",
        className
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      {/* Action Menu (3 dots) - Visible on Hover */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem 
              className="text-destructive cursor-pointer gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onReport?.();
              }}
            >
              <ShieldAlert className="w-4 h-4" />
              Report
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive cursor-pointer gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onBlock?.();
              }}
            >
              <Ban className="w-4 h-4" />
              Block
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* New Match Indicator */}
      {isNew && (
        <div className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center animate-pulse z-10">
          <Heart className="w-3 h-3 text-primary-foreground" />
        </div>
      )}

      {/* Avatar */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-primary/20">
          <img
            src={user.image}
            alt={user.name}
            className="w-full h-full object-cover"
          />
        </div>
        {user.isOnline && (
          <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-card" />
        )}
      </div>

      {/* Info */}
      <div className="mt-3 text-center">
        <h4 className="font-medium text-foreground text-sm sm:text-base">
          {user.name}, {user.age}
        </h4>
        {user.lastActive && (
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            {user.isOnline ? "Online now" : user.lastActive}
          </p>
        )}
      </div>

      {/* Message Button */}
      <Button
        size="sm"
        variant="soft"
        className="mt-3 gap-1 w-full h-8 text-xs"
        onClick={(e) => {
          e.stopPropagation();
          onMessage?.();
        }}
      >
        <MessageCircle className="w-3.5 h-3.5" />
        Message
      </Button>
    </motion.div>
  );
};