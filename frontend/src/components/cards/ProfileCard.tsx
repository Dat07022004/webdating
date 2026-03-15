import { motion } from "framer-motion";
import { Heart, X, Star, MapPin, Verified } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProfileCardProps {
  user: {
    id: string;
    name: string;
    age: number;
    location: string;
    bio: string;
    image: string;
    interests: string[];
    verified: boolean;
    distance?: string;
  };
  onLike?: () => void;
  onPass?: () => void;
  onSuperLike?: () => void;
  className?: string;
}

export const ProfileCard = ({
  user,
  onLike,
  onPass,
  onSuperLike,
  className,
}: ProfileCardProps) => {
  return (
    <motion.div
      className={cn(
        "relative w-full max-w-sm bg-card rounded-3xl overflow-hidden shadow-card",
        className
      )}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={user.image}
          alt={user.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        
        {/* Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-serif text-2xl font-semibold">
              {user.name}, {user.age}
            </h3>
            {user.verified && (
              <Verified className="w-5 h-5 text-blue-400 fill-blue-400" />
            )}
          </div>
          <div className="flex items-center gap-1 text-white/80 text-sm mb-3">
            <MapPin className="w-4 h-4" />
            <span>{user.location}</span>
            {user.distance && (
              <span className="ml-1">• {user.distance}</span>
            )}
          </div>
          <p className="text-sm text-white/90 line-clamp-2 mb-3">{user.bio}</p>
          <div className="flex flex-wrap gap-2">
            {user.interests.slice(0, 3).map((interest) => (
              <Badge
                key={interest}
                variant="secondary"
                className="bg-white/20 text-white border-0 backdrop-blur-sm"
              >
                {interest}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-4 px-6">
        <Button
          size="icon"
          variant="soft"
          className="w-14 h-14 rounded-full bg-white/90 hover:bg-white shadow-lg backdrop-blur-sm text-muted-foreground hover:text-destructive"
          onClick={onPass}
        >
          <X className="w-7 h-7" />
        </Button>
        <Button
          size="icon"
          variant="gold"
          className="w-12 h-12 rounded-full shadow-lg"
          onClick={onSuperLike}
        >
          <Star className="w-6 h-6" />
        </Button>
        <Button
          size="icon"
          variant="gradient"
          className="w-14 h-14 rounded-full shadow-lg"
          onClick={onLike}
        >
          <Heart className="w-7 h-7" />
        </Button>
      </div>
    </motion.div>
  );
};
