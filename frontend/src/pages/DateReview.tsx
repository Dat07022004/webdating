import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays, Check, Heart, Loader2, MapPin, Star } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const tags = ["Great conversation", "Very kind", "Good listener", "Funny", "Respectful", "Charming", "Adventurous", "Thoughtful"];

type ReviewFormResponse = {
  appointment?: {
    id: string;
    startTime: string;
    endTime?: string;
    status: string;
    note?: string;
    location?: {
      name?: string;
      address?: string;
      category?: string;
    } | null;
    counterpart?: {
      _id?: string;
      username?: string;
      profile?: {
        personalInfo?: {
          name?: string;
        };
      };
    } | null;
  };
  existingReview?: {
    _id: string;
    rating: number;
    tags?: string[];
    comment?: string;
    wouldMeetAgain?: boolean | null;
  } | null;
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

const DateReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [wouldMeetAgain, setWouldMeetAgain] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ReviewFormResponse | null>(null);

  const API_URL = useMemo(
    () => (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, "") : "http://localhost:3000"),
    []
  );

  useEffect(() => {
    const load = async () => {
      try {
        if (!id) {
          throw new Error("Missing appointment id");
        }

        const token = await getToken();
        const res = await fetch(`${API_URL}/api/reviews/appointment/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.message || "Failed to load review form");
        }

        setFormData(json);
        if (json?.existingReview) {
          setRating(json.existingReview.rating || 0);
          setReview(json.existingReview.comment || "");
          setSelectedTags(Array.isArray(json.existingReview.tags) ? json.existingReview.tags : []);
          setWouldMeetAgain(
            typeof json.existingReview.wouldMeetAgain === "boolean" ? json.existingReview.wouldMeetAgain : null
          );
        }
      } catch (error) {
        console.error("Failed to load review form:", error);
        toast({
          title: "Cannot load review form",
          description: String(error instanceof Error ? error.message : error),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [API_URL, getToken, id, toast]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const counterpartName =
    formData?.appointment?.counterpart?.profile?.personalInfo?.name ||
    formData?.appointment?.counterpart?.username ||
    "Your match";
  const locationName = formData?.appointment?.location?.name || "Date spot";
  const appointmentDate = formData?.appointment?.startTime ? new Date(formData.appointment.startTime) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast({ title: "Please add a rating", variant: "destructive" });
      return;
    }
    if (!id) {
      toast({ title: "Missing appointment", variant: "destructive" });
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          appointmentId: id,
          rating,
          tags: selectedTags,
          comment: review,
          wouldMeetAgain,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || "Failed to create review");
      }

      setSubmitted(true);
      toast({ title: "Review submitted!", description: "Thanks for sharing your experience." });
    } catch (error) {
      console.error("Failed to submit review:", error);
      toast({
        title: "Review failed",
        description: String(error instanceof Error ? error.message : error),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Layout isAuthenticated>
        <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <Card className="max-w-md w-full text-center gradient-card">
              <CardContent className="pt-8 pb-8 space-y-4">
                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-primary-foreground" />
                </div>
                <h2 className="font-serif text-2xl font-bold text-foreground">Review Submitted!</h2>
                <p className="text-muted-foreground">Your feedback helps make the community better.</p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" asChild><Link to="/appointments">Back to Appointments</Link></Button>
                  <Button variant="gradient" asChild><Link to="/reviews">View Reviews</Link></Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout isAuthenticated>
        <div className="container mx-auto px-4 py-16 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading review form...
        </div>
      </Layout>
    );
  }

  if (!formData?.appointment) {
    return (
      <Layout isAuthenticated>
        <div className="container mx-auto px-4 py-16 max-w-xl">
          <Card className="gradient-card">
            <CardContent className="py-10 text-center space-y-4">
              <h2 className="font-serif text-2xl font-bold text-foreground">Review unavailable</h2>
              <p className="text-muted-foreground">We could not load this review form.</p>
              <Button variant="gradient" onClick={() => navigate("/appointments")}>Back to Appointments</Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (formData.existingReview) {
    return (
      <Layout isAuthenticated>
        <div className="container mx-auto px-4 py-8 max-w-xl">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/reviews"><ArrowLeft className="w-4 h-4 mr-2" />Back to Reviews</Link>
          </Button>
          <Card className="gradient-card">
            <CardContent className="py-10 text-center space-y-4">
              <h2 className="font-serif text-2xl font-bold text-foreground">Review already submitted</h2>
              <p className="text-muted-foreground">You have already reviewed this appointment.</p>
              <Button variant="gradient" asChild><Link to="/reviews">View Reviews</Link></Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout isAuthenticated>
      <div className="container mx-auto px-4 py-8 max-w-xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/appointments"><ArrowLeft className="w-4 h-4 mr-2" />Back to Appointments</Link>
          </Button>

          <div className="mb-8">
            <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Rate Your Date</h1>
            <p className="text-muted-foreground">Share how your experience went</p>
          </div>

          <Card className="gradient-card mb-6">
            <CardContent className="p-5 flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="gradient-primary text-primary-foreground text-lg">
                  {getInitials(counterpartName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-serif font-semibold text-foreground">{counterpartName}</h3>
                <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{locationName}</span>
                  {appointmentDate ? (
                    <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{format(appointmentDate, "MMM d, yyyy")}</span>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="text-lg font-serif">Overall Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star className={cn(
                        "w-10 h-10 transition-colors",
                        (hoverRating || rating) >= star ? "fill-accent text-accent" : "text-border"
                      )} />
                    </button>
                  ))}
                </div>
                <p className="text-center text-sm text-muted-foreground mt-2">
                  {rating === 1 && "Not great"}
                  {rating === 2 && "Could be better"}
                  {rating === 3 && "It was okay"}
                  {rating === 4 && "Really good!"}
                  {rating === 5 && "Amazing!"}
                </p>
              </CardContent>
            </Card>

            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="text-lg font-serif">What stood out?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm border transition-all",
                        selectedTags.includes(tag)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="text-lg font-serif">Would you meet again?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 justify-center">
                  <Button
                    type="button"
                    variant={wouldMeetAgain === true ? "gradient" : "outline"}
                    onClick={() => setWouldMeetAgain(true)}
                    className="gap-2 flex-1 max-w-[140px]"
                  >
                    <Heart className="w-4 h-4" />Yes
                  </Button>
                  <Button
                    type="button"
                    variant={wouldMeetAgain === false ? "destructive" : "outline"}
                    onClick={() => setWouldMeetAgain(false)}
                    className="flex-1 max-w-[140px]"
                  >
                    Not really
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="text-lg font-serif">Write a Review (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Share your experience..."
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  maxLength={500}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">{review.length}/500</p>
              </CardContent>
            </Card>

            <Button type="submit" variant="hero" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Review"}
            </Button>
          </form>
        </motion.div>
      </div>
    </Layout>
  );
};

export default DateReview;
