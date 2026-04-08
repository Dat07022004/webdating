import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CalendarDays, Check, Clock, Loader2, MapPin, Plus, Star, Trash2, X } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type AppointmentStatus = "confirmed" | "pending" | "completed" | "cancelled" | "scheduled";

type BackendAppointment = {
  _id: string;
  startTime: string;
  endTime?: string;
  status: AppointmentStatus;
  note?: string;
  userId?:
    | {
        _id?: string;
        clerkId?: string;
        username?: string;
        profile?: {
          personalInfo?: {
            name?: string;
          };
        };
      }
    | string
    | null;
  matchUserId?:
    | {
        _id?: string;
        clerkId?: string;
        username?: string;
        profile?: {
          personalInfo?: {
            name?: string;
          };
        };
      }
    | string
    | null;
  locationId?:
    | {
        _id?: string;
        name?: string;
        address?: string;
      }
    | string
    | null;
};

type AppointmentCardItem = {
  id: string;
  canCancel: boolean;
  canRespond: boolean;
  initials: string;
  title: string;
  spot: string;
  location: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  statusHint?: string;
  note?: string;
};

const statusConfig: Record<AppointmentStatus, { label: string; className: string }> = {
  confirmed: { label: "Confirmed", className: "bg-success/10 text-success border-success/20" },
  pending: { label: "Pending", className: "bg-accent/10 text-accent border-accent/20" },
  scheduled: { label: "Scheduled", className: "bg-primary/10 text-primary border-primary/20" },
  completed: { label: "Completed", className: "bg-primary/10 text-primary border-primary/20" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

const Appointments = () => {
  const { getToken, userId } = useAuth();
  const { toast } = useToast();
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<AppointmentCardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const baseUrl = useMemo(
    () => (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, "") : "http://localhost:3000"),
    []
  );

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        if (!userId) {
          setAppointments([]);
          return;
        }

        const token = await getToken();
        const res = await fetch(`${baseUrl}/api/appointments/${userId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.message || "Failed to load appointments");
        }

        const data = await res.json();
        const nextAppointments = (Array.isArray(data) ? data : []).map((item: BackendAppointment) => {
          const location =
            item.locationId && typeof item.locationId === "object" ? item.locationId : null;
          const owner = item.userId && typeof item.userId === "object" ? item.userId : null;
          const guest = item.matchUserId && typeof item.matchUserId === "object" ? item.matchUserId : null;
          const isOwner = owner?.clerkId === userId;
          const isGuest = guest?.clerkId === userId;
          const counterpart = isOwner ? guest : owner;
          const counterpartName =
            counterpart?.profile?.personalInfo?.name || counterpart?.username || "Your match";
          const spotName = location?.name || "Date Spot";
          const place = location?.address || "Unknown location";
          const start = new Date(item.startTime);

          return {
            id: item._id,
            canCancel: isOwner,
            canRespond: isGuest && item.status === "pending",
            initials: getInitials(counterpartName),
            title: counterpartName,
            spot: spotName,
            location: place,
            date: Number.isNaN(start.getTime()) ? "Unknown date" : format(start, "MMM d, yyyy"),
            time: Number.isNaN(start.getTime()) ? "Unknown time" : format(start, "p"),
            status: item.status || "pending",
            statusHint:
              item.status === "pending"
                ? isGuest
                  ? "Waiting for your confirmation."
                  : `Waiting for ${counterpartName} to confirm.`
                : undefined,
            note: item.note || undefined,
          };
        });

        setAppointments(nextAppointments);
      } catch (error) {
        console.error("Failed to load appointments:", error);
        toast({
          title: "Cannot load appointments",
          description: String(error instanceof Error ? error.message : error),
          variant: "destructive",
        });
        setAppointments([]);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchAppointments();
  }, [baseUrl, getToken, toast, userId]);

  const upcoming = useMemo(
    () => appointments.filter((a) => a.status === "confirmed" || a.status === "pending" || a.status === "scheduled"),
    [appointments]
  );

  const past = useMemo(
    () => appointments.filter((a) => a.status === "completed" || a.status === "cancelled"),
    [appointments]
  );

  const handleCancel = async () => {
    if (!cancelId) return;

    try {
      const token = await getToken();
      const res = await fetch(`${baseUrl}/api/appointments/${cancelId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to cancel appointment");
      }

      setAppointments((prev) =>
        prev.map((item) => (item.id === cancelId ? { ...item, status: "cancelled" } : item))
      );
      toast({ title: "Appointment cancelled", description: "Your date has been cancelled." });
    } catch (error) {
      console.error("Failed to cancel appointment:", error);
      toast({
        title: "Cancel failed",
        description: String(error instanceof Error ? error.message : error),
        variant: "destructive",
      });
    } finally {
      setCancelId(null);
    }
  };

  const handleRespond = async (appointmentId: string, action: "confirm" | "decline") => {
    try {
      setRespondingId(appointmentId);
      const token = await getToken();
      const res = await fetch(`${baseUrl}/api/appointments/${appointmentId}/respond`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to respond to appointment");
      }

      const nextStatus: AppointmentStatus = action === "confirm" ? "confirmed" : "cancelled";
      setAppointments((prev) =>
        prev.map((item) =>
          item.id === appointmentId
            ? { ...item, status: nextStatus, canRespond: false, statusHint: undefined }
            : item
        )
      );
      toast({
        title: action === "confirm" ? "Appointment confirmed" : "Appointment declined",
        description:
          action === "confirm"
            ? "The other person has been notified."
            : "The invitation has been declined.",
      });
    } catch (error) {
      console.error("Failed to respond to appointment:", error);
      toast({
        title: "Response failed",
        description: String(error instanceof Error ? error.message : error),
        variant: "destructive",
      });
    } finally {
      setRespondingId(null);
    }
  };

  const AppointmentCard = ({ apt, showActions }: { apt: AppointmentCardItem; showActions: boolean }) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="gradient-card hover:shadow-md transition-all">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarFallback className="gradient-primary text-primary-foreground">{apt.initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1 gap-3">
                <h3 className="font-serif font-semibold text-foreground">{apt.title}</h3>
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
              {apt.note ? (
                <p className="text-sm text-muted-foreground mt-2 italic">"{apt.note}"</p>
              ) : null}
              {apt.statusHint ? (
                <p className="text-sm text-muted-foreground mt-2">{apt.statusHint}</p>
              ) : null}
              {apt.canRespond ? (
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="gradient"
                    className="gap-1"
                    onClick={() => handleRespond(apt.id, "confirm")}
                    disabled={respondingId === apt.id}
                  >
                    <Check className="w-3.5 h-3.5" />Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => handleRespond(apt.id, "decline")}
                    disabled={respondingId === apt.id}
                  >
                    <X className="w-3.5 h-3.5" />Decline
                  </Button>
                </div>
              ) : null}
              {showActions ? (
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-destructive hover:text-destructive"
                    onClick={() => setCancelId(apt.id)}
                    disabled={!apt.canCancel}
                  >
                    <Trash2 className="w-3.5 h-3.5" />Cancel
                  </Button>
                </div>
              ) : null}
              {apt.status === "completed" ? (
                <div className="mt-3">
                  <Button size="sm" variant="soft" className="gap-1" asChild>
                    <Link to={`/review/${apt.id}`}><Star className="w-3.5 h-3.5" />Leave Review</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderEmptyState = (message: string) => (
    <div className="text-center py-12">
      <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
      <h3 className="font-serif text-lg text-foreground mb-1">{message}</h3>
      <p className="text-muted-foreground mb-4">Book a date with one of your matches!</p>
      <Button variant="gradient" asChild><Link to="/date-spots">Browse Date Spots</Link></Button>
    </div>
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
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading appointments...
                </div>
              ) : upcoming.length > 0 ? (
                upcoming.map((apt) => <AppointmentCard key={apt.id} apt={apt} showActions={apt.canCancel} />)
              ) : (
                renderEmptyState("No upcoming dates")
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading appointments...
                </div>
              ) : past.length > 0 ? (
                past.map((apt) => <AppointmentCard key={apt.id} apt={apt} showActions={false} />)
              ) : (
                renderEmptyState("No past dates")
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      <Dialog open={cancelId !== null} onOpenChange={() => setCancelId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Cancel Appointment</DialogTitle>
            <DialogDescription>Are you sure you want to cancel this date?</DialogDescription>
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
