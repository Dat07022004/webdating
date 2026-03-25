import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, ArrowLeft, Check, Heart, MapPin, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const tags = ["Great conversation", "Very kind", "Good listener", "Funny", "Respectful", "Charming", "Adventurous", "Thoughtful"];

const DateReview = () => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [wouldMeetAgain, setWouldMeetAgain] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast({ title: "Please add a rating", variant: "destructive" });
      return;
    }
    setSubmitted(true);
    toast({ title: "Review submitted! 💕", description: "Thanks for sharing your experience." });
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
                <Button variant="gradient" asChild><Link to="/appointments">Back to Appointments</Link></Button>
              </CardContent>
            </Card>
          </motion.div>
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

          {/* Date Info */}
          <Card className="gradient-card mb-6">
            <CardContent className="p-5 flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="gradient-primary text-primary-foreground text-lg">OM</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-serif font-semibold text-foreground">Olivia M.</h3>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Botanical Gardens</span>
                  <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />Mar 10</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Star Rating */}
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="text-lg font-serif">Overall Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map(star => (
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
                  {rating === 1 && "Not great"}{rating === 2 && "Could be better"}{rating === 3 && "It was okay"}{rating === 4 && "Really good!"}{rating === 5 && "Amazing! ✨"}
                </p>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="text-lg font-serif">What stood out?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
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

            {/* Would meet again */}
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
                    <Heart className="w-4 h-4" />Yes!
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

            {/* Written Review */}
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="text-lg font-serif">Write a Review (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Share your experience..."
                  value={review}
                  onChange={e => setReview(e.target.value)}
                  maxLength={500}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">{review.length}/500</p>
              </CardContent>
            </Card>

            <Button type="submit" variant="hero" className="w-full">Submit Review</Button>
          </form>
        </motion.div>
      </div>
    </Layout>
  );
};

export default DateReview;
