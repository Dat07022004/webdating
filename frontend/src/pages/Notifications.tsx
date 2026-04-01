import { motion } from "framer-motion";
import { Bell, Heart, MessageCircle, Calendar, Star, UserCheck, Settings, CheckCheck } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface NotificationData {
  _id: string;
  type: "match" | "message" | "like" | "appointment" | "verification" | "system";
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  image?: string;
}

const getIcon = (type: string) => {
  switch (type) {
    case "match": return Heart;
    case "message": return MessageCircle;
    case "like": return Star;
    case "appointment": return Calendar;
    case "verification": return UserCheck;
    default: return Bell;
  }
};

const getIconColor = (type: string) => {
  switch (type) {
    case "match":
      return "bg-primary text-primary-foreground";
    case "message":
      return "bg-blue-500 text-white";
    case "like":
      return "bg-gold text-white";
    case "appointment":
      return "bg-success text-white";
    case "verification":
      return "bg-green-500 text-white";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export default function Notifications() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      return json.notifications as NotificationData[];
    }
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      await fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-counts"] });
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      await fetch(`${API_URL}/api/notifications/read-all`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-counts"] });
    }
  });

  const notifications = data || [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Layout isAuthenticated>
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-serif text-3xl font-bold text-foreground flex items-center gap-2">
                <Bell className="w-8 h-8 text-primary" />
                Thông báo
              </h1>
              <p className="text-muted-foreground mt-1">
                {unreadCount > 0 ? `Bạn có ${unreadCount} thông báo mới` : "Bạn đã xem hết thông báo!"}
              </p>
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-primary hover:text-primary/80"
                  onClick={() => markAllReadMutation.mutate()}
                >
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Đánh dấu hết đã đọc
                </Button>
              )}
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-10 text-muted-foreground">Đang tải thông báo...</div>
            ) : notifications.map((notification, i) => {
              const Icon = getIcon(notification.type);
              return (
                <motion.div
                  key={notification._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => !notification.read && markReadMutation.mutate(notification._id)}
                  className={cn(
                    "p-4 rounded-2xl flex items-start gap-4 cursor-pointer transition-colors border border-transparent",
                    notification.read
                      ? "bg-card hover:bg-secondary/50"
                      : "bg-coral-light/20 hover:bg-coral-light/30 border-coral-light/30"
                  )}
                >
                  {/* Icon or Image */}
                  {notification.image ? (
                    <div className="relative flex-shrink-0">
                      <img
                        src={notification.image}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div
                        className={cn(
                          "absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center",
                          getIconColor(notification.type)
                        )}
                      >
                        <Icon className="w-3 h-3" />
                      </div>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                        getIconColor(notification.type)
                      )}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={cn("text-sm font-medium", !notification.read ? "text-foreground font-bold" : "text-foreground/80")}>
                        {notification.title}
                      </h3>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: vi })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                  </div>

                  {/* Unread Indicator */}
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Empty State */}
          {!isLoading && notifications.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <Bell className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
                Chưa có thông báo nào
              </h3>
              <p className="text-muted-foreground">
                Khi bạn có tương hợp, tin nhắn hoặc lượt thích mới, chúng sẽ xuất hiện ở đây.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
