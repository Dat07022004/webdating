import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Bell, User, Menu, X, Sparkles, MapPin, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NavbarProps {
  isAuthenticated?: boolean;
}

export const Navbar = ({ isAuthenticated = false }: NavbarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = isAuthenticated
    ? [
        { to: "/discover", label: "Discover", icon: Sparkles },
        { to: "/matches", label: "Matches", icon: Heart },
        { to: "/messages", label: "Chat", icon: MessageCircle, badge: 3 },
        { to: "/date-spots", label: "Date Spots", icon: MapPin },
        { to: "/appointments", label: "Appointments", icon: CalendarDays },
        { to: "/notifications", label: "Notifications", icon: Bell, badge: 5 },
        { to: "/profile", label: "Profile", icon: User },
      ]
    : [];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-md">
              <Heart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-serif text-xl font-semibold text-foreground">Heartly</span>
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <Link key={link.to} to={link.to}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "relative",
                        isActive && "bg-coral-light text-coral-dark"
                      )}
                    >
                      <link.icon className="w-5 h-5" />
                      <span className="hidden lg:inline">{link.label}</span>
                      {link.badge && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center gradient-primary text-[10px] border-0">
                          {link.badge}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Auth Buttons */}
          {!isAuthenticated && (
            <div className="hidden md:flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost">Log in</Button>
              </Link>
              <Link to="/register">
                <Button variant="gradient">Get Started</Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b border-border"
          >
            <div className="container mx-auto px-4 py-4 space-y-2">
              {isAuthenticated ? (
                navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3"
                    >
                      <link.icon className="w-5 h-5" />
                      {link.label}
                      {link.badge && (
                        <Badge className="ml-auto gradient-primary border-0">
                          {link.badge}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                ))
              ) : (
                <>
                  <Link to="/login" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full">
                      Log in
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setIsOpen(false)}>
                    <Button variant="gradient" className="w-full">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
