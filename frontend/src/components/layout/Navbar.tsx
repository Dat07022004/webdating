import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Bell,
  User,
  Menu,
  X,
  Sparkles,
  MapPin,
  CalendarDays,
  Zap,
  Crown,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";

interface NavbarProps {
  isAuthenticated?: boolean;
}

export const Navbar = ({ isAuthenticated = false }: NavbarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { getToken } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const { data: userProfile } = useQuery({
    queryKey: ["userProfileNav"],
    queryFn: async () => {
      if (!isAuthenticated) return null;
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.profile;
    },
    enabled: isAuthenticated,
    staleTime: Infinity,
  });

  const isAdmin = userProfile?.role === "admin";

  const { data: unreadCounts } = useQuery({
    queryKey: ["unread-counts"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/notifications/unread-counts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return null;
      return await res.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 60000,
  });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const navLinks = useMemo(() => {
    if (!isAuthenticated) return [];

    const links = [
      { to: "/discover", label: "Discover", icon: Sparkles },
      { to: "/matches", label: "Matches", icon: Heart },
      { to: "/messages", label: "Chat", icon: MessageCircle, badge: unreadCounts?.messageCount },
      { to: "/date-spots", label: "Date Spots", icon: MapPin },
      { to: "/appointments", label: "Dates", icon: CalendarDays },
      { to: "/notifications", label: "Activity", icon: Bell, badge: unreadCounts?.notificationCount },
      { to: "/premium", label: "Premium", icon: Crown },
      { to: "/profile", label: "Profile", icon: User },
    ];

    if (isAdmin) {
      links.push({ to: "/admin", label: "Admin", icon: Shield });
    }

    return links;
  }, [isAuthenticated, isAdmin, unreadCounts]);

  return (
    <nav className="sticky top-2 sm:top-3 z-50 px-3 sm:px-4 lg:px-6 py-2">
      <div
        className={cn(
          "max-w-[1240px] mx-auto bg-white/85 backdrop-blur-2xl border border-white/70 shadow-[0_10px_34px_rgba(15,23,42,0.08)] transition-all duration-400",
          scrolled ? "rounded-[1.75rem]" : "rounded-[2.25rem]",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3 transition-all duration-300",
            scrolled ? "h-14 px-3 sm:px-4 lg:px-5" : "h-16 px-3 sm:px-5 lg:px-6",
          )}
        >
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="relative w-10 h-10 rounded-[1rem] bg-gradient-to-br from-[#FF4D8D] via-[#FF6D7B] to-[#FF8E53] flex items-center justify-center shadow-[0_8px_18px_rgba(255,77,141,0.35)] group-hover:rotate-6 group-hover:scale-105 transition-all duration-300">
              <Heart className="w-5 h-5 text-white fill-white" />
              <span className="absolute inset-0 rounded-[1rem] bg-white/30 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100" />
            </div>
            <div className="leading-tight">
              <p className="font-sans text-[2rem] sm:text-[2.1rem] font-black text-slate-900 tracking-tight">
                VibeMatch
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden md:flex flex-1 min-w-0 justify-center">
              <div className="rounded-full bg-slate-50/50 p-1 border border-slate-100 flex items-center gap-1">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.to;
                  return (
                    <Link key={link.to} to={link.to}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "relative rounded-full px-4 h-10 font-bold transition-all duration-300 whitespace-nowrap",
                          isActive 
                            ? "bg-white text-[#FF4D8D] shadow-sm hover:text-[#FF4D8D]" 
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                        )}
                      >
                        <link.icon className={cn("w-4 h-4 mr-2", isActive && "fill-[#FF4D8D]/20")} />
                        <span className="hidden xl:inline">{link.label}</span>
                        {link.badge !== undefined && link.badge > 0 && (
                          <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center bg-gradient-to-r from-[#FF4D8D] to-[#FF8E53] text-[10px] text-white font-black border-2 border-white rounded-full">
                            {link.badge}
                          </Badge>
                        )}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Auth Buttons */}
          {!isAuthenticated && (
            <div className="hidden md:flex items-center gap-2 shrink-0 ml-auto">
              <Link to="/login">
                <Button
                  variant="ghost"
                  className="rounded-full font-semibold px-5 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  Log in
                </Button>
              </Link>
              <Link to="/register">
                <Button className="rounded-full font-semibold px-5 bg-gradient-to-r from-[#FF4D8D] to-[#FF8E53] text-white border-0 shadow-[0_6px_18px_rgba(255,77,141,0.4)] hover:shadow-[0_10px_24px_rgba(255,142,83,0.5)] hover:-translate-y-0.5 transition-all duration-300">
                  Get Started <Zap className="w-4 h-4 ml-1.5 fill-white" />
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden ml-auto rounded-full text-slate-600 hover:bg-slate-100"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.22 }}
            className="md:hidden mt-2 bg-white/95 backdrop-blur-3xl border border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.1)] rounded-[1.5rem] overflow-hidden"
          >
            <div className="p-4 space-y-2">
              {isAuthenticated ? (
                navLinks.map((link) => {
                  const isActive = location.pathname === link.to;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setIsOpen(false)}
                      className="block"
                    >
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-4 rounded-[1.5rem] h-14 font-bold text-lg",
                          isActive
                            ? "bg-[#FF4D8D]/10 text-[#FF4D8D]"
                            : "text-slate-600",
                        )}
                      >
                        <div
                          className={cn(
                            "p-2 rounded-xl",
                            isActive ? "bg-white shadow-sm" : "bg-slate-100",
                          )}
                        >
                          <link.icon
                            className={cn(
                              "w-5 h-5",
                              isActive && "fill-[#FF4D8D]/20",
                            )}
                          />
                        </div>
                        {link.label}
                        {link.badge !== undefined && link.badge > 0 && (
                          <Badge className="ml-auto bg-[#FF4D8D] shadow-[0_0_10px_rgba(255,77,141,0.5)] text-white border-0 rounded-full px-2">
                            {link.badge} new
                          </Badge>
                        )}
                      </Button>
                    </Link>
                  );
                })
              ) : (
                <div className="flex flex-col gap-3 p-2">
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="w-full"
                  >
                    <Button
                      variant="outline"
                      className="w-full h-14 rounded-[1.5rem] font-bold text-lg border-2 border-slate-200"
                    >
                      Log in
                    </Button>
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsOpen(false)}
                    className="w-full"
                  >
                    <Button className="w-full h-14 rounded-[1.5rem] font-bold text-lg bg-gradient-to-r from-[#FF4D8D] to-[#FF8E53] text-white shadow-[0_10px_25px_rgba(255,77,141,0.4)]">
                      Get Started <Zap className="w-5 h-5 ml-2 fill-white" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
