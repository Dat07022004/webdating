import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { MatchCard } from "@/components/cards/MatchCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface MatchUser {
  id: string;
  name: string;
  age: number;
  image: string;
  isOnline: boolean;
  lastActive: string;
  matchPercentage?: number;
}

export default function Matches() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [matches, setMatches] = useState<MatchUser[]>([]);
  const [likes, setLikes] = useState<MatchUser[]>([]);
  const [sent, setSent] = useState<{status: string, user: MatchUser}[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConnections = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : 'http://localhost:3000';
      const res = await fetch(baseUrl + '/api/users/connections', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data) {
        setMatches(data.matches || []);
        setLikes(data.likes || []);
        setSent(data.sent || []);
      }
    } catch (error) {
      console.error("Failed to load connections:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [getToken]);

  const handleMessage = async (userId: string) => {
    try {
      const token = await getToken();
      if (!token) return;

      const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : 'http://localhost:3000';
      const res = await fetch(baseUrl + '/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetUserId: userId })
      });

      const data = await res.json();
      if (data.success && data.data._id) {
        navigate(`/messages?conversationId=${data.data._id}`);
      } else {
        navigate("/messages");
      }
    } catch (e) {
      console.error("Error creating conversation:", e);
      navigate("/messages");
    }
  };

  const handleAccept = async (userId: string) => {
    try {
      const token = await getToken();
      if (!token) return;

      const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : 'http://localhost:3000';
      const res = await fetch(baseUrl + '/api/users/action', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetUserId: userId, action: 'like' })
      });

      if (res.ok) {
        toast({
          title: "It's a Match! 🎉",
          description: "You can now send them a message.",
        });
        // Refresh the lists
        fetchConnections();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Layout isAuthenticated>
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-serif text-3xl font-bold text-foreground flex items-center gap-2">
              <Heart className="w-8 h-8 text-primary" />
              Matches
            </h1>
            <p className="text-muted-foreground mt-1">
              Your connections are waiting
            </p>
          </div>

          <Tabs defaultValue="matches" className="space-y-6">
            <TabsList className="grid w-full max-w-xl grid-cols-3">
              <TabsTrigger value="matches" className="gap-2">
                <Heart className="w-4 h-4" />
                Matches ({matches.length})
              </TabsTrigger>
              <TabsTrigger value="likes" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Likes ({likes.length})
              </TabsTrigger>
              <TabsTrigger value="sent" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Sent ({sent.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="matches" className="space-y-8">
              {isLoading ? (
                  <p className="text-muted-foreground text-center">Loading matches...</p>
              ) : matches.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {matches.map((match, i) => (
                    <motion.div
                      key={match.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <MatchCard
                        user={match}
                        onMessage={() => handleMessage(match.id)}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-card p-8 text-center shadow-card border border-border">
                  <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                  <p className="text-muted-foreground">No confirmed matches yet. Keep exploring!</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="likes">
              {isLoading ? (
                  <p className="text-muted-foreground text-center">Loading likes...</p>
              ) : likes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {likes.map((like, i) => (
                    <motion.div
                      key={like.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="rounded-2xl bg-card p-4 shadow-card border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={like.image}
                          alt={like.name}
                          className="w-16 h-16 rounded-full object-cover ring-2 ring-primary"
                        />
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {like.name}, {like.age}
                          </h3>
                          <p className="text-sm text-muted-foreground">{like.lastActive}</p>
                        </div>
                      </div>

                      <Button
                        className="w-full mt-4 gap-2"
                        variant="default"
                        onClick={() => handleAccept(like.id)}
                      >
                        <Heart className="w-4 h-4" />
                        Match With {like.name}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-card p-8 text-center shadow-card border border-border">
                  <p className="text-muted-foreground">No incoming likes right now.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="sent">
              {isLoading ? (
                  <p className="text-muted-foreground text-center">Loading sent requests...</p>
              ) : sent.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sent.map((item, i) => (
                    <motion.div
                      key={item.user.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="rounded-2xl bg-card p-4 shadow-card border border-border opacity-80 hover:opacity-100 transition-opacity"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={item.user.image}
                          alt={item.user.name}
                          className="w-16 h-16 rounded-full object-cover grayscale transition-all duration-300 hover:grayscale-0"
                        />
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {item.user.name}, {item.user.age}
                          </h3>
                          <p className="text-sm text-yellow-600 dark:text-yellow-500 font-medium">Pending accept</p>
                        </div>
                      </div>

                      <Button className="w-full mt-4" variant="secondary" disabled>
                        Waiting for response
                      </Button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-card p-8 text-center shadow-card border border-border">
                  <p className="text-muted-foreground">You have not sent any requests yet.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
