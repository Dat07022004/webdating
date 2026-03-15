import { useState } from "react";
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

interface Appointment {
  id: number;
  matchName: string;
  matchInitials: string;
  spot: string;
  location: string;
  date: string;
  time: string;
  status: "confirmed" | "pending" | "completed" | "cancelled";
  note?: string;
}

const appointments: Appointment[] = [
  { id: 1, matchName: "Emma W.", matchInitials: "EW", spot: "Sunset Rooftop Lounge", location: "Downtown", date: "Mar 20, 2026", time: "7:00 PM", status: "confirmed", note: "Looking forward to it!" },
  { id: 2, matchName: "Sophie L.", matchInitials: "SL", spot: "The Cozy Bean Café", location: "Midtown", date: "Mar 22, 2026", time: "2:00 PM", status: "pending" },
  { id: 3, matchName: "Olivia M.", matchInitials: "OM", spot: "Botanical Gardens Walk", location: "Westside Park", date: "Mar 10, 2026", time: "10:00 AM", status: "completed" },
  { id: 4, matchName: "Isabella R.", matchInitials: "IR", spot: "Bella Italia Trattoria", location: "Little Italy", date: "Mar 5, 2026", time: "8:00 PM", status: "cancelled" },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  confirmed: { label: "Confirmed", className: "bg-success/10 text-success border-success/20" },
  pending: { label: "Pending", className: "bg-accent/10 text-accent border-accent/20" },
  completed: { label: "Completed", className: "bg-primary/10 text-primary border-primary/20" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const Appointments = () => {
  const [cancelId, setCancelId] = useState<number | null>(null);
  const { toast } = useToast();

  const upcoming = appointments.filter(a => a.status === "confirmed" || a.status === "pending");
  const past = appointments.filter(a => a.status === "completed" || a.status === "cancelled");

  const handleCancel = () => {
    toast({ title: "Appointment cancelled", description: "Your date has been cancelled." });
    setCancelId(null);
  };

  const AppointmentCard = ({ apt, showActions }: { apt: Appointment; showActions: boolean }) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="gradient-card hover:shadow-md transition-all">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarFallback className="gradient-primary text-primary-foreground">{apt.matchInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-serif font-semibold text-foreground">{apt.matchName}</h3>
                <Badge variant="outline" className={statusConfig[apt.status].className}>
                  {statusConfig[apt.status].label}
                </Badge>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{apt.spot} — {apt.location}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{apt.date}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{apt.time}</span>
                </div>
              </div>
              {apt.note && (
                <p className="text-sm text-muted-foreground mt-2 italic">"{apt.note}"</p>
              )}
              {showActions && (
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="gap-1"><Edit className="w-3.5 h-3.5" />Edit</Button>
                  <Button size="sm" variant="outline" className="gap-1"><MessageCircle className="w-3.5 h-3.5" />Chat</Button>
                  <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive" onClick={() => setCancelId(apt.id)}>
                    <Trash2 className="w-3.5 h-3.5" />Cancel
                  </Button>
                </div>
              )}
              {apt.status === "completed" && (
                <div className="mt-3">
                  <Button size="sm" variant="soft" className="gap-1" asChild>
                    <Link to={`/review/${apt.id}`}><Star className="w-3.5 h-3.5" />Leave Review</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

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

          <Tabs defaultValue="upcoming" className="space-y-6">
            <TabsList className="w-full">
              <TabsTrigger value="upcoming" className="flex-1">Upcoming ({upcoming.length})</TabsTrigger>
              <TabsTrigger value="past" className="flex-1">Past ({past.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              {upcoming.length > 0 ? upcoming.map(apt => (
                <AppointmentCard key={apt.id} apt={apt} showActions />
              )) : (
                <div className="text-center py-12">
                  <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-serif text-lg text-foreground mb-1">No upcoming dates</h3>
                  <p className="text-muted-foreground mb-4">Book a date with one of your matches!</p>
                  <Button variant="gradient" asChild><Link to="/date-spots">Browse Date Spots</Link></Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
              {past.map(apt => (
                <AppointmentCard key={apt.id} apt={apt} showActions={false} />
              ))}
            </TabsContent>
          </Tabs>
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
            <Button variant="destructive" onClick={handleCancel}>Cancel Date</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Appointments;
