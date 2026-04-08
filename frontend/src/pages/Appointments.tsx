import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CalendarIcon,
  Check,
  Clock,
  Loader2,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  Star,
  Trash2,
  X
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type AppointmentStatus = "confirmed" | "pending" | "completed" | "cancelled" | "scheduled";

type BackendUser = {
  _id?: string;
  clerkId?: string;
  username?: string;
  profile?: {
    personalInfo?: {
      name?: string;
    };
  };
};

type BackendAppointment = {
  _id: string;
  startTime: string;
  endTime?: string;
  status: AppointmentStatus;
  note?: string;
  userId?: BackendUser | string | null;
  matchUserId?: BackendUser | string | null;
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
  counterpartUserId: string;
  canCancel: boolean;
  canRespond: boolean;
  canEdit: boolean;
  canChat: boolean;
  canReview: boolean;
  initials: string;
  title: string;
  spot: string;
  location: string;
  date: string;
  time: string;
  rawStatus: AppointmentStatus;
  status: AppointmentStatus;
  isPast: boolean;
  startTimeISO: string;
  statusHint?: string;
  note?: string;
};

const timeSlots = [
  "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM",
  "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM",
];

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

const makeISOStart = (d: Date, timeStr: string) => {
  const parts = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!parts) return null;
  let hh = Number(parts[1]);
  const mm = Number(parts[2]);
  const ampm = parts[3].toUpperCase();
  if (ampm === "PM" && hh < 12) hh += 12;
  if (ampm === "AM" && hh === 12) hh = 0;
  const dt = new Date(d);
  dt.setHours(hh, mm, 0, 0);
  return dt.toISOString();
};

const Appointments = () => {
  const { getToken, userId } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentCardItem | null>(null);
  const [editDate, setEditDate] = useState<Date>();
  const [editTime, setEditTime] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
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
        const nowMs = Date.now();
        const nextAppointments = (Array.isArray(data) ? data : []).map((item: BackendAppointment) => {
          const location = item.locationId && typeof item.locationId === "object" ? item.locationId : null;
          const owner = item.userId && typeof item.userId === "object" ? item.userId : null;
          const guest = item.matchUserId && typeof item.matchUserId === "object" ? item.matchUserId : null;
          const isOwner = owner?.clerkId === userId;
          const isGuest = guest?.clerkId === userId;
          const counterpart = isOwner ? guest : owner;
          const counterpartName = counterpart?.profile?.personalInfo?.name || counterpart?.username || "Your match";
          const counterpartUserId = counterpart?._id || "";
          const spotName = location?.name || "Date Spot";
          const place = location?.address || "Unknown location";
          const start = new Date(item.startTime);
          const startMs = start.getTime();
          const isPast = Number.isFinite(startMs) && startMs < nowMs;
          const displayStatus: AppointmentStatus =
            item.status === "cancelled" ? "cancelled" : isPast ? "completed" : item.status || "pending";

          return {
            id: item._id,
            counterpartUserId,
            canCancel: isOwner && !isPast && item.status !== "cancelled",
            canRespond: isGuest && !isPast && item.status === "pending",
            canEdit: isOwner && !isPast && item.status !== "cancelled",
            canChat: Boolean(counterpartUserId) && !isPast && item.status === "confirmed",
            canReview: isPast && item.status !== "cancelled",
            initials: getInitials(counterpartName),
            title: counterpartName,
            spot: spotName,
            location: place,
            date: Number.isNaN(startMs) ? "Unknown date" : format(start, "MMM d, yyyy"),
            time: Number.isNaN(startMs) ? "Unknown time" : format(start, "p"),
            rawStatus: item.status || "pending",
            status: displayStatus,
            isPast,
            startTimeISO: item.startTime,
            statusHint:
              !isPast && item.status === "pending"
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
    () => appointments.filter((a) => !a.isPast && a.status !== "cancelled"),
    [appointments]
  );

  const past = useMemo(
    () => appointments.filter((a) => a.isPast || a.status === "cancelled"),
    [appointments]
  );

  const handleChat = async (targetUserId: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`${baseUrl}/api/chat/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ targetUserId }),
      });

      const data = await res.json().catch(() => ({}));
      if (data?.success && data?.data?._id) {
        navigate(`/messages?conversationId=${data.data._id}`);
        return;
      }

      navigate("/messages");
    } catch (error) {
      console.error("Failed to open appointment chat:", error);
      toast({
        title: "Cannot open chat",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (appointment: AppointmentCardItem) => {
    const parsed = new Date(appointment.startTimeISO);
    setEditingAppointment(appointment);
    setEditDate(parsed);
    setEditTime(format(parsed, "h:mm aa"));
  };

  const closeEditDialog = () => {
    setEditingAppointment(null);
    setEditDate(undefined);
    setEditTime("");
    setIsSavingEdit(false);
  };

  const handleSaveEdit = async () => {
    if (!editingAppointment || !editDate || !editTime) {
      toast({
        title: "Missing schedule",
        description: "Please select both a new date and time.",
        variant: "destructive",
      });
      return;
    }

    const nextStartISO = makeISOStart(editDate, editTime);
    if (!nextStartISO) {
      toast({
        title: "Invalid time",
        description: "Could not parse the selected time.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSavingEdit(true);
      const token = await getToken();
      const res = await fetch(`${baseUrl}/api/appointments/${editingAppointment.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ startTime: nextStartISO }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to reschedule appointment");
      }

      const nextDate = new Date(nextStartISO);
      setAppointments((prev) =>
        prev.map((item) =>
          item.id === editingAppointment.id
            ? {
                ...item,
                rawStatus: "pending",
                status: "pending",
                startTimeISO: nextStartISO,
                date: format(nextDate, "MMM d, yyyy"),
                time: format(nextDate, "p"),
                isPast: false,
                canCancel: true,
                canEdit: true,
                canChat: false,
                canReview: false,
                canRespond: false,
                statusHint: `Waiting for ${item.title} to confirm.`,
              }
            : item
        )
      );

      closeEditDialog();
      toast({
        title: "Appointment updated",
        description: "The new time was saved and sent for confirmation again.",
      });
    } catch (error) {
      console.error("Failed to reschedule appointment:", error);
      toast({
        title: "Edit failed",
        description: String(error instanceof Error ? error.message : error),
        variant: "destructive",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

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
        prev.map((item) =>
          item.id === cancelId
            ? {
                ...item,
                rawStatus: "cancelled",
                status: "cancelled",
                canCancel: false,
                canEdit: false,
                canChat: false,
                canRespond: false,
                canReview: false,
                statusHint: undefined,
              }
            : item
        )
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

      const nextRawStatus: AppointmentStatus = action === "confirm" ? "confirmed" : "cancelled";
      const nextStatus: AppointmentStatus = action === "confirm" ? "confirmed" : "cancelled";
      setAppointments((prev) =>
        prev.map((item) =>
          item.id === appointmentId
            ? {
                ...item,
                rawStatus: nextRawStatus,
                status: nextStatus,
                canRespond: false,
                canChat: action === "confirm" && !item.isPast,
                statusHint: undefined,
              }
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

  const AppointmentCard = ({ apt }: { apt: AppointmentCardItem }) => (
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
              {apt.canEdit || apt.canChat || apt.canCancel ? (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {apt.canEdit ? (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => openEditDialog(apt)}>
                      <Pencil className="w-3.5 h-3.5" />Edit
                    </Button>
                  ) : null}
                  {apt.canChat ? (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => handleChat(apt.counterpartUserId)}>
                      <MessageCircle className="w-3.5 h-3.5" />Chat
                    </Button>
                  ) : null}
                  {apt.canCancel ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-destructive hover:text-destructive"
                      onClick={() => setCancelId(apt.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />Cancel
                    </Button>
                  ) : null}
                </div>
              ) : null}
              {apt.canReview ? (
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

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

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
                upcoming.map((apt) => <AppointmentCard key={apt.id} apt={apt} />)
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
                past.map((apt) => <AppointmentCard key={apt.id} apt={apt} />)
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

      <Dialog open={Boolean(editingAppointment)} onOpenChange={(open) => { if (!open) closeEditDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Choosing a new time will send this appointment back to pending so your match can confirm again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !editDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editDate ? format(editDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editDate}
                    onSelect={setEditDate}
                    disabled={(d) => d < startOfToday}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="mb-2 block">Time</Label>
              <Select value={editTime} onValueChange={setEditTime}>
                <SelectTrigger>
                  <Clock className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>Cancel</Button>
            <Button variant="gradient" onClick={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Appointments;
