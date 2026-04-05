import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CalendarDays, Clock, MapPin, MessageCircle, Star, Trash2, Edit, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/clerk-react";


interface AppointmentItem {
  _id: string;
  userId: string;
  locationId: any;
  startTime: string;
  endTime?: string;
  totalCost?: number;
  status?: string;
}

const Appointments = () => {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const { toast } = useToast();
  const { userId } = useAuth();
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`/api/appointments/${userId}`)
      .then((r) => r.json())
      .then((data) => setAppointments(Array.isArray(data) ? data : []))
      .catch((err) => toast({ title: "Lỗi", description: String(err), variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleCancelConfirm = async () => {
    if (!cancelId) return;
    try {
      const res = await fetch(`/api/appointments/${cancelId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to cancel");
      const { data } = await res.json();
      setAppointments((prev) => prev.map((p) => (p._id === data._id ? data : p)));
      toast({ title: "Appointment cancelled", description: "Your date has been cancelled." });
      setCancelId(null);
    } catch (err: any) {
      toast({ title: "Không thể hủy", description: String(err.message || err), variant: "destructive" });
    }
  };

  const AppointmentCard = ({ apt, showActions }: { apt: AppointmentItem; showActions: boolean }) => {
    const loc = typeof apt.locationId === "object" ? apt.locationId : null;
    const start = new Date(apt.startTime);
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-4">
          <div className="p-5 rounded-lg border gradient-card">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-sm">??</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-serif font-semibold text-foreground">{loc?.name || "Unknown"}</h3>
                  <div className="text-sm text-muted-foreground">{apt.status}</div>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{loc?.address}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{start.toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                {showActions && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="gap-1">Edit</Button>
                    <Button size="sm" variant="outline" className="gap-1">Chat</Button>
                    <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive" onClick={() => setCancelId(apt._id)}>
                      <Trash2 className="w-3.5 h-3.5" />Cancel
                    </Button>
                  </div>
                )}
                {!showActions && apt.status !== 'cancelled' && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/review/${apt._id}`}>
                        <Star className="w-3.5 h-3.5 mr-1" />Review
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const upcoming = appointments.filter(a => a.status !== 'completed' && a.status !== 'cancelled');
  const past = appointments.filter(a => a.status === 'completed' || a.status === 'cancelled');

  return (
    <Layout isAuthenticated>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">My Appointments</h1>
              <p className="text-muted-foreground">Manage your upcoming and past dates</p>
            </div>
            <Button variant="gradient" asChild>
              <Link to="/appointments/book"><Plus className="w-4 h-4 mr-2" />Book New</Link>
            </Button>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="font-semibold mb-3">Upcoming ({upcoming.length})</h2>
              {loading ? <div>Loading...</div> : upcoming.length > 0 ? upcoming.map(apt => (
                <AppointmentCard key={apt._id} apt={apt} showActions />
              )) : (
                <div className="text-center py-12">
                  <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-serif text-lg text-foreground mb-1">No upcoming dates</h3>
                  <p className="text-muted-foreground mb-4">Book a date with one of your matches!</p>
                  <Button variant="gradient" asChild><Link to="/date-spots">Browse Date Spots</Link></Button>
                </div>
              )}
            </div>

            <div>
              <h2 className="font-semibold mb-3">Past ({past.length})</h2>
              {past.map(apt => (
                <AppointmentCard key={apt._id} apt={apt} showActions={false} />
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelId !== null} onOpenChange={() => setCancelId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Cancel Appointment</DialogTitle>
            <DialogDescription>Are you sure you want to cancel this date? Your match will be notified.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId(null)}>Keep Date</Button>
            <Button variant="destructive" onClick={handleCancelConfirm}>Cancel Date</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};
export default Appointments;
