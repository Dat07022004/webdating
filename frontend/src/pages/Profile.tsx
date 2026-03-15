import { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Settings,
  Camera,
  MapPin,
  Verified,
  Edit3,
  LogOut,
  Shield,
  Bell,
  HelpCircle,
  ChevronRight,
  Plus,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { UserButton } from "@clerk/clerk-react";

const mockProfile = {
  name: "Alex Johnson",
  age: 28,
  location: "New York City",
  bio: "Adventure seeker, coffee enthusiast, and hopeless romantic. Looking for someone to share life's little moments with. 🌟",
  photos: [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=400&fit=crop",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=400&fit=crop",
  ],
  interests: ["Travel", "Photography", "Hiking", "Coffee", "Music", "Movies"],
  verified: {
    email: true,
    phone: true,
    photo: false,
  },
  completionPercent: 85,
};

const menuItems = [
  { icon: Edit3, label: "Edit Profile", href: "#" },
  { icon: Settings, label: "Account Settings", href: "#" },
  { icon: Bell, label: "Notifications", href: "/notifications" },
  { icon: Shield, label: "Privacy & Safety", href: "#" },
  { icon: HelpCircle, label: "Help & Support", href: "#" },
];

export default function Profile() {
  return (
    <Layout isAuthenticated>
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-3xl shadow-card p-6 mb-6"
          >
            {/* Main Photo */}
            <div className="relative w-32 h-32 mx-auto mb-4">
              <img
                src={mockProfile.photos[0]}
                alt={mockProfile.name}
                className="w-full h-full rounded-full object-cover ring-4 ring-coral-light"
              />
              <button className="absolute bottom-0 right-0 w-10 h-10 rounded-full gradient-primary flex items-center justify-center shadow-md">
                <Camera className="w-5 h-5 text-primary-foreground" />
              </button>
            </div>

            {/* Name & Info */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2">
                <h1 className="font-serif text-2xl font-bold text-foreground">
                  <UserButton />
                  {mockProfile.name}, {mockProfile.age}
                </h1>
                {mockProfile.verified.email && (
                  <Verified className="w-5 h-5 text-blue-500 fill-blue-500" />
                )}
              </div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground mt-1">
                <MapPin className="w-4 h-4" />
                <span>{mockProfile.location}</span>
              </div>
            </div>

            {/* Profile Completion */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Profile completion</span>
                <span className="font-medium text-foreground">{mockProfile.completionPercent}%</span>
              </div>
              <Progress value={mockProfile.completionPercent} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                Complete your profile to get more matches!
              </p>
            </div>

            {/* Photo Gallery */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {mockProfile.photos.map((photo, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] rounded-xl overflow-hidden relative group"
                >
                  <img
                    src={photo}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Edit3 className="w-5 h-5 text-white" />
                  </div>
                </div>
              ))}
              {mockProfile.photos.length < 6 && (
                <button className="aspect-[3/4] rounded-xl border-2 border-dashed border-border flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors">
                  <Plus className="w-6 h-6 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Bio */}
            <div className="mb-6">
              <h3 className="font-medium text-foreground mb-2">About me</h3>
              <p className="text-muted-foreground text-sm">{mockProfile.bio}</p>
            </div>

            {/* Interests */}
            <div>
              <h3 className="font-medium text-foreground mb-2">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {mockProfile.interests.map((interest) => (
                  <Badge key={interest} variant="secondary" className="rounded-full">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Verification Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-3xl shadow-card p-6 mb-6"
          >
            <h2 className="font-serif text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Verification
            </h2>
            <div className="space-y-3">
              {Object.entries(mockProfile.verified).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="capitalize text-foreground">{key} Verified</span>
                  {value ? (
                    <Badge className="gradient-primary border-0">Verified</Badge>
                  ) : (
                    <Button variant="soft" size="sm">
                      Verify Now
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Menu */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-3xl shadow-card overflow-hidden mb-6"
          >
            {menuItems.map((item, i) => (
              <div key={item.label}>
                <button className="w-full p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors">
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="flex-1 text-left text-foreground">{item.label}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
                {i < menuItems.length - 1 && <Separator />}
              </div>
            ))}
          </motion.div>

          {/* Logout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              variant="outline"
              className="w-full gap-2 text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-5 h-5" />
              Log Out
            </Button>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
