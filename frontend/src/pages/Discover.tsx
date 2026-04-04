import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, Sparkles } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { ProfileCard } from "@/components/cards/ProfileCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export interface DiscoverUser {
  id: string;
  name: string;
  age: number;
  location: string;
  bio: string;
  image: string;
  interests: string[];
  verified: boolean;
  distance: string;
}

export default function Discover() {
  const [users, setUsers] = useState<DiscoverUser[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { getToken } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        
        const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : 'http://localhost:3000';
        const res = await fetch(baseUrl + '/api/users/discover', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        const data = await res.json();
        if (data.users && Array.isArray(data.users)) {
             setUsers(data.users);
        }
      } catch (error) {
        console.error("Failed to fetch discover users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [getToken]);

  const currentUser = users[currentIndex];

  const handleAction = async (action: 'like' | 'pass') => {
    if (!currentUser) return;

    setDirection(action === 'like' ? "right" : "left");
    
    if (action === 'like') {
      toast({
        title: "❤️ You liked " + currentUser.name,
        description: "Check the Matches tab later to see if they liked you back.",
      });
    }

    const actedUserId = currentUser.id;

    setTimeout(() => {
      setUsers((prevUsers) => {
        const nextUsers = prevUsers.filter((user) => user.id !== actedUserId);
        setCurrentIndex((prevIndex) => {
          if (nextUsers.length === 0) {
            return 0;
          }
          return prevIndex >= nextUsers.length ? nextUsers.length - 1 : prevIndex;
        });
        return nextUsers;
      });
      setDirection(null);
    }, 300);

    try {
      const token = await getToken();
      if (token) {
        const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : 'http://localhost:3000';
        await fetch(baseUrl + '/api/users/action', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ targetUserId: currentUser.id, action })
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLike = () => handleAction('like');
  const handlePass = () => handleAction('pass');

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
            {isLoading ? (
               <div className="w-full max-w-sm aspect-[3/4] flex flex-col items-center justify-center text-center p-8 bg-card rounded-3xl shadow-card border border-border">
                  <Sparkles className="w-12 h-12 text-primary mb-4 animate-pulse" />
                  <h3 className="text-xl font-bold mb-2">Finding Matches...</h3>
               </div>
            ) : currentUser ? (
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
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            ) : (
              <div className="w-full max-w-sm aspect-[3/4] flex flex-col items-center justify-center text-center p-8 bg-card rounded-3xl shadow-card border border-border">
                <Sparkles className="w-12 h-12 text-primary mb-4 opacity-50" />
                <h3 className="text-xl font-bold mb-2">You're caught up!</h3>
                <p className="text-muted-foreground">Check back later for more potential matches.</p>
              </div>
            )}
          </div>

          {/* Instructions */}
          {currentUser && (
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground mt-4">
              <span>← Pass</span>
              <span>Match →</span>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
