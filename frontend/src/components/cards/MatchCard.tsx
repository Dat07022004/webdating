import { motion } from "framer-motion";
import { MessageCircle, Heart, MoreVertical, ShieldAlert, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  actionIcon?: "message" | "heart";
  actionClassName?: string;
  className?: string;
}

export const MatchCard = ({
  user,
  isNew = false,
  onClick,
  onMessage,
  onReport,
  onBlock,
  actionLabel = "Message",
  onAction,
  actionDisabled = false,
  actionIcon = "message",
  actionClassName,
  className,
}: MatchCardProps) => {
  const handleAction = onAction || onMessage;

  return (
    <motion.div
      className={cn(
        "relative flex flex-col items-center p-4 rounded-2xl bg-card shadow-card cursor-pointer group hover:shadow-md transition-shadow",
        className
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      {/* 3-dots Menu - visible on hover */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl border-none shadow-xl bg-card">
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onReport?.(); }}
              className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-lg font-medium"
            >
              <ShieldAlert className="h-4 w-4" />
              Report
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onBlock?.(); }}
              className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-lg font-medium"
            >
              <Ban className="h-4 w-4" />
              Block
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
        className={cn("mt-3 gap-1", actionClassName)}
        disabled={actionDisabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!actionDisabled) {
            handleAction?.();
          }
        }}
      >
        {actionIcon === "heart" ? (
          <Heart className="w-4 h-4" />
        ) : (
          <MessageCircle className="w-4 h-4" />
        )}
        {actionLabel}
      </Button>
    </motion.div>
  );
};
