import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { motion } from "framer-motion";
import { Heart, Sparkles, Ghost } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { MatchCard } from "@/components/cards/MatchCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ReportUserDialog } from "@/components/ReportUserDialog";
import { BlockUserDialog } from "@/components/BlockUserDialog";

interface MatchUser {
  id: string;
  name: string;
  age: number;
  image: string;
  isOnline: boolean;
  lastActive: string;
}

export default function Matches() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [matches, setMatches] = useState<MatchUser[]>([]);
  const [likes, setLikes] = useState<MatchUser[]>([]);
  const [sent, setSent] = useState<{ status: string; user: MatchUser }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // States for Safety Actions
  const [reportTarget, setReportTarget] = useState<MatchUser | null>(null);
  const [blockTarget, setBlockTarget] = useState<MatchUser | null>(null);

  const fetchConnections = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:3000";
      const res = await fetch(`${baseUrl}/api/users/connections`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
      const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:3000";
      const res = await fetch(`${baseUrl}/api/chat/conversations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetUserId: userId }),
      });

      const data = await res.json();
      if (data.success && data.data._id) {
        navigate(`/messages?conversationId=${data.data._id}`);
      } else {
        navigate("/messages");
      }
    } catch (e) {
      navigate("/messages");
    }
  };

  const handleSafetyAction = async (targetId: string, action: "report" | "block", details?: any) => {
    try {
      const token = await getToken();
      const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:3000";

      const payload =
        action === "block"
          ? { reportedId: targetId, reason: "Other", details: "Direct block from Matches UI", shouldBlock: true }
          : { reportedId: targetId, ...details };

      const res = await fetch(`${baseUrl}/api/safety/report`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast({
          title: action === "block" ? "User Blocked Successfully" : "Report Submitted",
          description: action === "block" 
            ? "This user has been removed from your matches." 
            : "Thank you for helping keep our community safe.",
        });
        fetchConnections(); // Refresh lists to remove blocked user
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process request. Please try again.",
      });
    }
  };

  return (
    <Layout isAuthenticated>
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="font-serif text-3xl font-bold text-foreground flex items-center gap-2">
              <Heart className="w-8 h-8 text-primary" />
              Matches
            </h1>
            <p className="text-muted-foreground mt-1">Your recent connections and interests</p>
          </div>

          <Tabs defaultValue="matches" className="space-y-6">
            <TabsList className="grid w-full max-w-xl grid-cols-3">
              <TabsTrigger value="matches" className="gap-2">
                Matches ({matches.length})
              </TabsTrigger>
              <TabsTrigger value="likes" className="gap-2">
                Likes ({likes.length})
              </TabsTrigger>
              <TabsTrigger value="sent" className="gap-2">
                Sent ({sent.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="matches" className="min-h-[400px]">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <p className="text-muted-foreground animate-pulse">Loading matches...</p>
                </div>
              ) : matches.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {matches.map((match, i) => (
                    <motion.div
                      key={match.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <MatchCard
                        user={match}
                        onMessage={() => handleMessage(match.id)}
                        onReport={() => setReportTarget(match)}
                        onBlock={() => setBlockTarget(match)}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-3xl border border-dashed border-border">
                  <Ghost className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground italic text-center">
                    No matches yet. Keep discovering new people!
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="likes">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <p className="text-muted-foreground animate-pulse">Loading likes...</p>
                </div>
              ) : likes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {likes.map((like) => (
                    <div key={like.id} className="p-4 bg-card rounded-2xl border border-border flex items-center gap-4">
                      <img src={like.image} className="w-16 h-16 rounded-full object-cover" alt={like.name} />
                      <div className="flex-1">
                        <h3 className="font-bold">{like.name}, {like.age}</h3>
                        <p className="text-xs text-muted-foreground">Interested in you</p>
                      </div>
                      <Button size="sm" onClick={() => navigate("/discover")}>View Profile</Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-3xl border border-dashed border-border">
                  <Heart className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground italic text-center">
                    No likes yet. Keep improving your profile!
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="sent">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <p className="text-muted-foreground animate-pulse">Loading sent requests...</p>
                </div>
              ) : sent.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sent.map((item) => (
                    <div key={item.user.id} className="p-4 bg-card rounded-2xl border border-border flex items-center gap-4">
                      <img src={item.user.image} className="w-16 h-16 rounded-full object-cover" alt={item.user.name} />
                      <div className="flex-1">
                        <h3 className="font-bold">{item.user.name}, {item.user.age}</h3>
                        <p className="text-xs text-muted-foreground">Request sent</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => navigate("/discover")}>View Profile</Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-3xl border border-dashed border-border">
                  <Ghost className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground italic text-center">
                    No sent requests yet. Start discovering!
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Safety Dialogs */}
      {reportTarget && (
        <ReportUserDialog
          isOpen={!!reportTarget}
          onClose={() => setReportTarget(null)}
          targetUser={{ id: reportTarget.id, name: reportTarget.name }}
          onSubmit={(data) => handleSafetyAction(reportTarget.id, "report", data)}
        />
      )}

      {blockTarget && (
        <BlockUserDialog
          isOpen={!!blockTarget}
          onClose={() => setBlockTarget(null)}
          targetUser={{ id: blockTarget.id, name: blockTarget.name }}
          onConfirm={() => handleSafetyAction(blockTarget.id, "block")}
        />
      )}
    </Layout>
  );
}