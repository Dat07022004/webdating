import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Check, MapPin, CalendarDays, UserCheck, UserX, AlertCircle, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@clerk/clerk-react";

const behaviorOptions = [
  { id: 'polite', label: 'Polite / Respectful', icon: '✨', type: 'positive' },
  { id: 'engaging', label: 'Engaging Conversation', icon: '🗣️', type: 'positive' },
  { id: 'rude', label: 'Rude', icon: '😠', type: 'negative' },
  { id: 'harassment', label: 'Harassment / Coercion', icon: '⚠️', type: 'danger' },
];

const DateReview = () => {
  const { appointmentId } = useParams();
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [metInPerson, setMetInPerson] = useState<boolean | null>(null);
  const [whoDidNotShow, setWhoDidNotShow] = useState<string | null>(null);
  const [photoAccuracy, setPhotoAccuracy] = useState<number | null>(null);
  const [behaviors, setBehaviors] = useState<string[]>([]);
  const [suggestSimilar, setSuggestSimilar] = useState<boolean | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Mock data for UI (In real app, fetch by appointmentId)
  const targetUser = { id: "mock_id", name: "Olivia M.", initials: "OM", spot: "Botanical Gardens", date: "Mar 10" };

  const toggleBehavior = (id: string) => {
    setBehaviors(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (metInPerson === null) {
      toast({ title: "Please answer Question 1", variant: "destructive" });
      return;
    }

    if (metInPerson === false && !whoDidNotShow) {
      toast({ title: "Please select who did not show up", variant: "destructive" });
      return;
    }

    if (metInPerson === true && photoAccuracy === null) {
      toast({ title: "Please rate the photo accuracy", variant: "destructive" });
      return;
    }

    if (suggestSimilar === null) {
      toast({ title: "Please answer the final question", variant: "destructive" });
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await getToken();
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
      
      const response = await fetch(`${baseUrl}/api/users/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          appointmentId,
          reviewedId: targetUser.id, // Should be dynamic
          metInPerson,
          whoDidNotShow,
          photoAccuracy,
          behaviors,
          suggestSimilar
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        toast({ title: "Review submitted! 💕", description: "Thank you for your feedback." });
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to submit review");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Layout isAuthenticated>
        <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <Card className="max-w-md w-full text-center gradient-card border-primary/20">
              <CardContent className="pt-8 pb-8 space-y-4">
                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto shadow-lg">
                  <Check className="w-8 h-8 text-primary-foreground" />
                </div>
                <h2 className="font-serif text-2xl font-bold text-foreground">Review Submitted!</h2>
                <p className="text-muted-foreground">Your feedback helps make the community safer and better.</p>
                <div className="bg-muted/50 p-4 rounded-xl border border-border/50 text-sm italic text-muted-foreground">
                  "Double-blind rule: The other person will not see your evaluation."
                </div>
                <Button variant="gradient" asChild className="w-full mt-4 shadow-md"><Link to="/appointments">Back to Appointments</Link></Button>
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
          <Button variant="ghost" asChild className="mb-4 hover:bg-muted">
            <Link to="/appointments"><ArrowLeft className="w-4 h-4 mr-2" />Back</Link>
          </Button>

          <div className="mb-8">
            <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Post-Date Review</h1>
            <p className="text-muted-foreground italic">Your feedback is completely private (Double-blind)</p>
          </div>

          {/* Date Info Summary */}
          <Card className="gradient-card mb-6 border-primary/10 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <Avatar className="h-14 w-14 border-2 border-background shadow-sm">
                <AvatarFallback className="gradient-primary text-primary-foreground text-lg">{targetUser.initials}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-serif font-semibold text-foreground text-lg">{targetUser.name}</h3>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{targetUser.spot}</span>
                  <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{targetUser.date}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-6 pb-12">
            
            {/* Q1: Verification */}
            <Card className="gradient-card border-none shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-serif flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">1</span>
                  Did you and {targetUser.name} meet in person?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={metInPerson === true ? "gradient" : "outline"}
                    onClick={() => setMetInPerson(true)}
                    className="flex-1 h-12 rounded-xl"
                  >
                    <UserCheck className="w-4 h-4 mr-2" /> Yes
                  </Button>
                  <Button
                    type="button"
                    variant={metInPerson === false ? "destructive" : "outline"}
                    onClick={() => setMetInPerson(false)}
                    className="flex-1 h-12 rounded-xl"
                  >
                    <UserX className="w-4 h-4 mr-2" /> No
                  </Button>
                </div>

                <AnimatePresence>
                  {metInPerson === false && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-3 pt-2"
                    >
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-destructive" /> Who did not show up?
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={whoDidNotShow === "me" ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => setWhoDidNotShow("me")}
                          className="rounded-lg h-10"
                        >
                          It was me
                        </Button>
                        <Button
                          type="button"
                          variant={whoDidNotShow === targetUser.id ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => setWhoDidNotShow(targetUser.id)}
                          className="rounded-lg h-10"
                        >
                          It was {targetUser.name}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Q2: Photo Accuracy - Only if met */}
            <AnimatePresence>
              {metInPerson === true && (
                <motion.div
                  initial={{ height: 0, opacity: 0, y: 10 }}
                  animate={{ height: "auto", opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: 10 }}
                >
                  <Card className="gradient-card border-none shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-serif flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">2</span>
                        How accurate was {targetUser.name}'s profile photo?
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {[
                        { val: 100, label: "90 - 100% (Identical)", color: "text-success" },
                        { val: 75, label: "50 - 80% (Some edits)", color: "text-accent" },
                        { val: 40, label: "Below 50% (Very different / Fake)", color: "text-destructive" }
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setPhotoAccuracy(opt.val)}
                          className={cn(
                            "w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between",
                            photoAccuracy === opt.val
                              ? "bg-primary/5 border-primary shadow-sm"
                              : "bg-background border-border hover:border-primary/30"
                          )}
                        >
                          <span className={cn("font-medium", photoAccuracy === opt.val ? opt.color : "text-foreground")}>
                            {opt.label}
                          </span>
                          {photoAccuracy === opt.val && <Check className="w-5 h-5 text-primary" />}
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Q3: Behaviors */}
            <Card className="gradient-card border-none shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-serif flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">3</span>
                  Select the characteristics you observed:
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  {behaviorOptions.map(opt => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => toggleBehavior(opt.id)}
                      className={cn(
                        "p-3 rounded-xl border text-left flex items-center gap-3 transition-all",
                        behaviors.includes(opt.id)
                          ? opt.type === 'danger' ? "bg-destructive/10 border-destructive text-destructive" : "bg-primary/10 border-primary text-primary shadow-sm"
                          : "bg-background border-border hover:border-primary/20"
                      )}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <span className="flex-1 font-medium">{opt.label}</span>
                      {behaviors.includes(opt.id) && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Q4: Algorithm Opt */}
            <Card className="gradient-card border-none shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-serif flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">4</span>
                  Would you like to meet more people like {targetUser.name}?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={suggestSimilar === true ? "gradient" : "outline"}
                    onClick={() => setSuggestSimilar(true)}
                    className="flex-1 h-12 rounded-xl"
                  >
                    Yes, absolutely
                  </Button>
                  <Button
                    type="button"
                    variant={suggestSimilar === false ? "soft" : "outline"}
                    onClick={() => setSuggestSimilar(false)}
                    className="flex-1 h-12 rounded-xl"
                  >
                    No
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="pt-4">
              <Button 
                type="submit" 
                variant="hero" 
                className="w-full h-14 text-lg font-bold shadow-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Safety Review"}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground mt-4 flex items-center justify-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Your information is securely protected by our safety system.
              </p>
            </div>
          </form>
        </motion.div>
      </div>
    </Layout>
  );
};

export default DateReview;
