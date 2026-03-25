import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, Sparkles } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { ProfileCard } from "@/components/cards/ProfileCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const mockUsers = [
  {
    id: "1",
    name: "Emma",
    age: 26,
    location: "New York City",
    bio: "Adventure seeker & coffee lover. Let's explore the city together! 🌆",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop",
    interests: ["Travel", "Photography", "Coffee"],
    verified: true,
    distance: "2 miles away",
  },
  {
    id: "2",
    name: "Sophia",
    age: 24,
    location: "Brooklyn",
    bio: "Artist by day, foodie by night. Looking for someone to share adventures with.",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=500&fit=crop",
    interests: ["Art", "Food", "Music"],
    verified: true,
    distance: "5 miles away",
  },
  {
    id: "3",
    name: "Olivia",
    age: 28,
    location: "Manhattan",
    bio: "Yoga instructor who loves hiking and sunset walks. Let's connect! ✨",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop",
    interests: ["Yoga", "Hiking", "Wellness"],
    verified: false,
    distance: "3 miles away",
  },
];

export default function Discover() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const { toast } = useToast();

  const currentUser = mockUsers[currentIndex];

  const handleLike = () => {
    setDirection("right");
    toast({
      title: "❤️ You liked " + currentUser.name + "!",
      description: "We'll let you know if they like you back.",
    });
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % mockUsers.length);
      setDirection(null);
    }, 300);
  };

  const handlePass = () => {
    setDirection("left");
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % mockUsers.length);
      setDirection(null);
    }, 300);
  };

  const handleSuperLike = () => {
    setDirection("right");
    toast({
      title: "⭐ Super Like sent to " + currentUser.name + "!",
      description: "They'll see you at the top of their list.",
    });
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % mockUsers.length);
      setDirection(null);
    }, 300);
  };

  return (
    <Layout isAuthenticated>
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-serif text-3xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-primary" />
                Discover
              </h1>
              <p className="text-muted-foreground mt-1">
                Find your perfect match
              </p>
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </Button>
          </div>

          {/* Card Stack */}
          <div className="flex items-center justify-center py-8">
            <div className="relative w-full max-w-sm aspect-[3/4]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentUser.id}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    x: direction === "left" ? -200 : direction === "right" ? 200 : 0,
                    rotate: direction === "left" ? -15 : direction === "right" ? 15 : 0,
                  }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0"
                >
                  <ProfileCard
                    user={currentUser}
                    onLike={handleLike}
                    onPass={handlePass}
                    onSuperLike={handleSuperLike}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Instructions */}
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground mt-4">
            <span>← Pass</span>
            <span>⭐ Super Like</span>
            <span>Like →</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
