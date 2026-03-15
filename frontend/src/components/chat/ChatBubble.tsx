import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  message: string;
  timestamp: string;
  isOwn?: boolean;
  image?: string;
  status?: "sent" | "delivered" | "read";
}

export const ChatBubble = ({
  message,
  timestamp,
  isOwn = false,
  image,
  status,
}: ChatBubbleProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "flex flex-col max-w-[75%]",
        isOwn ? "ml-auto items-end" : "mr-auto items-start"
      )}
    >
      {image && (
        <div className="mb-2 rounded-2xl overflow-hidden shadow-sm">
          <img src={image} alt="Shared" className="max-w-full max-h-60 object-cover" />
        </div>
      )}
      <div
        className={cn(
          "px-4 py-3 rounded-2xl",
          isOwn
            ? "gradient-primary text-primary-foreground rounded-br-md"
            : "bg-secondary text-secondary-foreground rounded-bl-md"
        )}
      >
        <p className="text-sm leading-relaxed">{message}</p>
      </div>
      <div className="flex items-center gap-1 mt-1 px-1">
        <span className="text-[10px] text-muted-foreground">{timestamp}</span>
        {isOwn && status && (
          <span className="text-[10px] text-muted-foreground">
            {status === "read" ? "✓✓" : status === "delivered" ? "✓✓" : "✓"}
          </span>
        )}
      </div>
    </motion.div>
  );
};
