import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { CalendarDays, Loader2, MapPin, Star } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

type ReviewUser = {
  username?: string;
  profile?: {
    personalInfo?: {
      name?: string;
    };
  };
};

type ReviewItem = {
  _id: string;
  rating: number;
  tags?: string[];
  comment?: string;
  wouldMeetAgain?: boolean | null;
  createdAt: string;
  reviewerUserId?: ReviewUser | null;
  revieweeUserId?: ReviewUser | null;
  locationId?: {
    name?: string;
    address?: string;
    category?: string;
  } | null;
  appointmentId?: {
    startTime?: string;
    endTime?: string;
    status?: string;
  } | null;
};

const getDisplayName = (user?: ReviewUser | null) =>
  user?.profile?.personalInfo?.name || user?.username || "Unknown user";

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

export default function Reviews() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [received, setReceived] = useState<ReviewItem[]>([]);
  const [written, setWritten] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = useMemo(
    () => (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, "") : "http://localhost:3000"),
    []
  );

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        const [receivedRes, writtenRes] = await Promise.all([
          fetch(`${API_URL}/api/reviews/received`, { headers }),
          fetch(`${API_URL}/api/reviews/mine`, { headers }),
        ]);

        const receivedJson = await receivedRes.json().catch(() => ({}));
        const writtenJson = await writtenRes.json().catch(() => ({}));

        if (!receivedRes.ok) {
          throw new Error(receivedJson?.message || "Failed to load received reviews");
        }
        if (!writtenRes.ok) {
          throw new Error(writtenJson?.message || "Failed to load written reviews");
        }

        setReceived(Array.isArray(receivedJson?.reviews) ? receivedJson.reviews : []);
        setWritten(Array.isArray(writtenJson?.reviews) ? writtenJson.reviews : []);
      } catch (error) {
        console.error("Failed to load reviews:", error);
        toast({
          title: "Cannot load reviews",
          description: String(error instanceof Error ? error.message : error),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [API_URL, getToken, toast]);

  const receivedAverage =
    received.length > 0 ? (received.reduce((sum, item) => sum + Number(item.rating || 0), 0) / received.length).toFixed(1) : null;

  const ReviewCard = ({ item, mode }: { item: ReviewItem; mode: "received" | "written" }) => {
    const otherUser = mode === "received" ? item.reviewerUserId : item.revieweeUserId;
    const otherName = getDisplayName(otherUser);
    const locationName = item.locationId?.name || "Date spot";
    const appointmentDate = item.appointmentId?.startTime ? new Date(item.appointmentId.startTime) : null;

    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="gradient-card hover:shadow-md transition-all">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarFallback className="gradient-primary text-primary-foreground">
                  {getInitials(otherName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-serif text-lg font-semibold text-foreground">{otherName}</h3>
                  <div className="flex items-center gap-1 text-accent">
                    <Star className="w-4 h-4 fill-accent" />
                    <span className="font-semibold">{item.rating}</span>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground mt-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{locationName}</span>
                  </div>
                  {appointmentDate ? (
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                      <span>{format(appointmentDate, "MMM d, yyyy")}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {item.comment ? (
              <p className="text-sm text-muted-foreground italic">"{item.comment}"</p>
            ) : null}

            {item.tags && item.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {typeof item.wouldMeetAgain === "boolean" ? (
                <span>{item.wouldMeetAgain ? "Would meet again" : "Would not meet again"}</span>
              ) : null}
              <span>{format(new Date(item.createdAt), "MMM d, yyyy")}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const renderEmpty = (title: string, description: string) => (
    <div className="text-center py-12 text-muted-foreground">
      <Star className="w-10 h-10 mx-auto mb-3 opacity-40" />
      <h3 className="font-serif text-lg text-foreground mb-1">{title}</h3>
      <p>{description}</p>
    </div>
  );

  return (
    <Layout isAuthenticated>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-foreground">Reviews</h1>
          <p className="text-muted-foreground mt-1">See what others said about you and what you shared about your dates.</p>
        </div>

        {receivedAverage ? (
          <Card className="gradient-card mb-6">
            <CardContent className="p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Average received rating</p>
                <p className="font-serif text-3xl font-bold text-foreground">{receivedAverage}/5</p>
              </div>
              <Badge className="bg-success/10 text-success border-success/20 border">
                {received.length} review{received.length === 1 ? "" : "s"}
              </Badge>
            </CardContent>
          </Card>
        ) : null}

        <Tabs defaultValue="received" className="space-y-6">
          <TabsList className="w-full">
            <TabsTrigger value="received" className="flex-1">Received ({received.length})</TabsTrigger>
            <TabsTrigger value="written" className="flex-1">Written ({written.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading reviews...
              </div>
            ) : received.length > 0 ? (
              received.map((item) => <ReviewCard key={item._id} item={item} mode="received" />)
            ) : (
              renderEmpty("No received reviews yet", "Reviews people leave about you will appear here.")
            )}
          </TabsContent>

          <TabsContent value="written" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading reviews...
              </div>
            ) : written.length > 0 ? (
              written.map((item) => <ReviewCard key={item._id} item={item} mode="written" />)
            ) : (
              renderEmpty("No written reviews yet", "Reviews you submit after a date will appear here.")
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
