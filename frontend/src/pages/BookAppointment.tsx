import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarIcon, Clock, MapPin, Heart, ArrowLeft, Check } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const matchedUsers = [
  { id: 1, name: "Emma W.", initials: "EW", age: 26 },
  { id: 2, name: "Sophie L.", initials: "SL", age: 24 },
  { id: 3, name: "Olivia M.", initials: "OM", age: 28 },
];

const spots = [
  { id: 1, name: "Sunset Rooftop Lounge", location: "Downtown" },
  { id: 2, name: "The Cozy Bean Café", location: "Midtown" },
  { id: 3, name: "Bella Italia Trattoria", location: "Little Italy" },
  { id: 4, name: "Botanical Gardens Walk", location: "Westside Park" },
  { id: 5, name: "Jazz & Blues Corner", location: "Arts District" },
];

const timeSlots = [
  "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM",
  "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM",
];

const BookAppointment = () => {
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [spot, setSpot] = useState("");
  const [matchUser, setMatchUser] = useState("");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !spot || !matchUser) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setSubmitted(true);
    toast({ title: "Date booked! 🎉", description: "Your appointment has been scheduled." });
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
                <h2 className="font-serif text-2xl font-bold text-foreground">Date Booked!</h2>
                <p className="text-muted-foreground">Your date has been confirmed. You'll receive a notification when your match responds.</p>
                <div className="flex gap-3 justify-center pt-4">
                  <Button variant="outline" asChild><Link to="/appointments">View Appointments</Link></Button>
                  <Button variant="gradient" asChild><Link to="/date-spots">Browse More</Link></Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout isAuthenticated>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/date-spots"><ArrowLeft className="w-4 h-4 mr-2" />Back to Date Spots</Link>
          </Button>

          <div className="mb-8">
            <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Book a Date</h1>
            <p className="text-muted-foreground">Schedule a perfect meeting with your match</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Select Match */}
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="text-lg font-serif flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />Select Your Match
                </CardTitle>
                <CardDescription>Choose who you'd like to go on a date with</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {matchedUsers.map(user => (
                    <button
                      type="button"
                      key={user.id}
                      onClick={() => setMatchUser(String(user.id))}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border-2 transition-all",
                        matchUser === String(user.id)
                          ? "border-primary bg-coral-light/30"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="gradient-primary text-primary-foreground text-sm">{user.initials}</AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <p className="font-medium text-foreground text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">Age {user.age}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Select Spot */}
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="text-lg font-serif flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />Choose a Place
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={spot} onValueChange={setSpot}>
                  <SelectTrigger><SelectValue placeholder="Select a date spot" /></SelectTrigger>
                  <SelectContent>
                    {spots.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name} — {s.location}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Date & Time */}
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="text-lg font-serif flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary" />Date & Time
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-2 block">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        disabled={(d) => d < new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="mb-2 block">Time</Label>
                  <Select value={time} onValueChange={setTime}>
                    <SelectTrigger>
                      <Clock className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Note */}
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="text-lg font-serif">Add a Note (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Anything you'd like your date to know..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  maxLength={300}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">{note.length}/300</p>
              </CardContent>
            </Card>

            <Button type="submit" variant="hero" className="w-full">
              Confirm Date Booking
            </Button>
          </form>
        </motion.div>
      </div>
    </Layout>
  );
};

export default BookAppointment;
