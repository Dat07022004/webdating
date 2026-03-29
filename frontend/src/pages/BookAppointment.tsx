import { useState, useEffect } from "react";
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
import { useAuth } from "@clerk/clerk-react";

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
  const { userId } = useAuth();

  const [budget, setBudget] = useState<number | "">("");
  const [category, setCategory] = useState<string>("all");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !spot || !matchUser) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    // Build ISO startTime from date + time
    const dateStr = format(date!, "yyyy-MM-dd");
    const startIso = makeISOFromTime(dateStr, time);

    if (!userId) {
      toast({ title: "Không xác thực", description: "Không có userId", variant: "destructive" });
      return;
    }

    fetch(`/api/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, locationId: spot, startTime: startIso }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).message || "Failed to create");
        return r.json();
      })
      .then(() => {
        setSubmitted(true);
        toast({ title: "Date booked! 🎉", description: "Your appointment has been scheduled." });
      })
      .catch((err) => {
        toast({ title: "Không thể đặt lịch", description: String(err.message || err), variant: "destructive" });
      });
  };

  function makeISOFromTime(dateStr: string, timeStr: string) {
    // timeStr like "7:00 PM" or "10:00 AM"
    const [t, ampm] = timeStr.split(" ");
    const [hh, mm] = t.split(":").map(Number);
    let hour = hh;
    if (ampm?.toUpperCase() === "PM" && hh !== 12) hour = hh + 12;
    if (ampm?.toUpperCase() === "AM" && hh === 12) hour = 0;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${dateStr}T${pad(hour)}:${pad(mm)}:00.000Z`;
  }

  const fetchSuggestions = async () => {
    if (!date) return toast({ title: "Chọn ngày", description: "Vui lòng chọn ngày để gợi ý." });
    if (!userId) return toast({ title: "Không xác thực", description: "Vui lòng đăng nhập." });

    setLoadingSuggest(true);
    try {
      const res = await fetch(`/api/appointments/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, category: category === "all" ? "cafe" : category, budget: budget === "" ? 999999 : Number(budget), date: format(date, "yyyy-MM-dd") }),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch suggestions");
      const data = await res.json();
      setSuggestions(data);
    } catch (err: any) {
      toast({ title: "Lỗi gợi ý", description: String(err.message || err), variant: "destructive" });
    } finally {
      setLoadingSuggest(false);
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

            {/* Suggestion controls */}
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="text-lg font-serif flex items-center gap-2">Gợi ý địa điểm</CardTitle>
                <CardDescription>Nhập ngân sách và loại địa điểm để nhận gợi ý</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-2 block">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="cafe">Cafe</SelectItem>
                        <SelectItem value="restaurant">Restaurant</SelectItem>
                        <SelectItem value="cinema">Cinema</SelectItem>
                        <SelectItem value="park">Park</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-2 block">Budget (VND)</Label>
                    <Input value={budget === "" ? "" : String(budget)} onChange={(e) => setBudget(e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g. 200000" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={fetchSuggestions} disabled={loadingSuggest}>{loadingSuggest ? "Đang tìm..." : "Gợi ý"}</Button>
                  <Button variant="ghost" onClick={() => { setSuggestions([]); setBudget(""); setCategory("all"); }}>Xóa</Button>
                </div>

                {suggestions.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {suggestions.map((s, i) => (
                      <div key={i} className="p-3 border rounded-lg flex items-center justify-between">
                        <div>
                          <div className="font-medium">{s.location?.name}</div>
                          <div className="text-sm text-muted-foreground">{s.location?.address} • Giá dự kiến: {s.estimatedCost}</div>
                          <div className="text-sm text-muted-foreground">Thời gian: {new Date(s.startTime).toLocaleString()}</div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button size="sm" onClick={() => {
                            setSpot(s.location.id || s.location.id);
                            // set time from ISO
                            const t = new Date(s.startTime);
                            const h = t.getHours();
                            const m = t.getMinutes();
                            const ampm = h >= 12 ? 'PM' : 'AM';
                            const hh = ((h + 11) % 12) + 1;
                            setTime(`${hh}:${String(m).padStart(2,'0')} ${ampm}`);
                          }}>Chọn gợi ý</Button>
                          <Button size="sm" variant="outline" asChild>
                            <a href={`/date-spots?loc=${s.location?.id}`}>Xem</a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
