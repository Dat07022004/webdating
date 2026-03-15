import { motion } from "framer-motion";
import { Bell, Heart, MessageCircle, Calendar, Star, UserCheck, Settings } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const mockNotifications = [
  {
    id: "1",
    type: "match",
    icon: Heart,
    title: "New Match!",
    message: "You and Emma matched! Start the conversation now.",
    time: "2 min ago",
    read: false,
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop",
  },
  {
    id: "2",
    type: "message",
    icon: MessageCircle,
    title: "New Message",
    message: "Sophia sent you a message: \"Hey! How's your day going?\"",
    time: "15 min ago",
    read: false,
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&h=80&fit=crop",
  },
  {
    id: "3",
    type: "like",
    icon: Star,
    title: "Someone Likes You!",
    message: "Someone new liked your profile. Upgrade to see who!",
    time: "1 hour ago",
    read: true,
    image: null,
  },
  {
    id: "4",
    type: "appointment",
    icon: Calendar,
    title: "Date Reminder",
    message: "You have a date with Olivia tomorrow at 7 PM.",
    time: "3 hours ago",
    read: true,
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop",
  },
  {
    id: "5",
    type: "verification",
    icon: UserCheck,
    title: "Profile Verified!",
    message: "Your email has been verified. Your profile now shows a verified badge.",
    time: "1 day ago",
    read: true,
    image: null,
  },
];

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
  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  return (
    <Layout isAuthenticated>
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-serif text-3xl font-bold text-foreground flex items-center gap-2">
                <Bell className="w-8 h-8 text-primary" />
                Notifications
              </h1>
              <p className="text-muted-foreground mt-1">
                {unreadCount > 0 ? `${unreadCount} new notifications` : "You're all caught up!"}
              </p>
            </div>
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {mockNotifications.map((notification, i) => {
              const Icon = notification.icon;
              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "p-4 rounded-2xl flex items-start gap-4 cursor-pointer transition-colors",
                    notification.read
                      ? "bg-card hover:bg-secondary/50"
                      : "bg-coral-light/30 hover:bg-coral-light/50"
                  )}
                >
                  {/* Icon or Image */}
                  {notification.image ? (
                    <div className="relative">
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
                        "w-12 h-12 rounded-full flex items-center justify-center",
                        getIconColor(notification.type)
                      )}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-foreground">{notification.title}</h3>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {notification.time}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                  </div>

                  {/* Unread Indicator */}
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full gradient-primary mt-2" />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Empty State */}
          {mockNotifications.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <Bell className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
                No notifications yet
              </h3>
              <p className="text-muted-foreground">
                When you get matches, messages, or likes, they'll appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
