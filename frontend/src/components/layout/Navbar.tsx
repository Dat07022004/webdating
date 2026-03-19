import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Bell, User, Menu, X, Sparkles, MapPin, CalendarDays, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NavbarProps {
  isAuthenticated?: boolean;
}

export const Navbar = ({ isAuthenticated = false }: NavbarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = isAuthenticated
    ? [
      { to: "/discover", label: "Discover", icon: Sparkles },
      { to: "/matches", label: "Matches", icon: Heart },
      { to: "/messages", label: "Chat", icon: MessageCircle, badge: 3 },
      { to: "/date-spots", label: "Date Spots", icon: MapPin },
      { to: "/appointments", label: "Dates", icon: CalendarDays },
      { to: "/notifications", label: "Activity", icon: Bell, badge: 5 },
      { to: "/profile", label: "Profile", icon: User },
    ]
    : [];

  return (
    <nav className={cn(
      "fixed left-0 right-0 z-50 transition-all duration-300 px-4 mt-4 lg:mt-6",
      scrolled ? "top-0 mt-2" : "top-0"
    )}>
      <div className={cn(
        "max-w-[1200px] mx-auto bg-white/80 backdrop-blur-2xl border border-white/60 shadow-[0_10px_40px_rgba(255,142,83,0.05)] transition-all duration-500",
        scrolled ? "rounded-[2rem] py-2 px-6 shadow-[0_15px_40px_rgba(0,0,0,0.06)]" : "rounded-[2.5rem] py-3 px-6 lg:px-8"
      )}>
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-[1rem] bg-gradient-to-br from-[#FF4D8D] to-[#FF8E53] flex items-center justify-center shadow-[0_4px_15px_rgba(255,77,141,0.3)] group-hover:rotate-12 group-hover:scale-110 transition-all duration-300">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-sans text-2xl font-black text-slate-900 tracking-tight">Heartly</span>
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-1.5 bg-slate-50/50 p-1 rounded-full border border-slate-100">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <Link key={link.to} to={link.to}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "relative rounded-full px-5 h-10 font-bold transition-all duration-300",
                        isActive ? "bg-white text-[#FF4D8D] shadow-sm hover:text-[#FF4D8D]" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                      )}
                    >
                      <link.icon className={cn("w-4 h-4 mr-2", isActive && "fill-[#FF4D8D]/20")} />
                      <span className="hidden lg:inline">{link.label}</span>
                      {link.badge && (
                        <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center bg-gradient-to-r from-[#FF4D8D] to-[#FF8E53] text-[10px] text-white font-black border-2 border-white rounded-full">
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
                <Button variant="ghost" className="rounded-full font-bold px-6 text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                  Log in
                </Button>
              </Link>
              <Link to="/register">
                <Button className="rounded-full font-bold px-6 bg-gradient-to-r from-[#FF4D8D] to-[#FF8E53] text-white border-0 shadow-[0_4px_15px_rgba(255,77,141,0.4)] hover:shadow-[0_8px_25px_rgba(255,142,83,0.5)] hover:-translate-y-0.5 transition-all duration-300">
                  Get Started <Zap className="w-4 h-4 ml-1.5 fill-white" />
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-full text-slate-600 hover:bg-slate-100"
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
            transition={{ duration: 0.2 }}
            className="md:hidden absolute top-[110%] left-4 right-4 bg-white/95 backdrop-blur-3xl border border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.1)] rounded-[2rem] overflow-hidden"
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
                          isActive ? "bg-[#FF4D8D]/10 text-[#FF4D8D]" : "text-slate-600"
                        )}
                      >
                        <div className={cn("p-2 rounded-xl", isActive ? "bg-white shadow-sm" : "bg-slate-100")}>
                          <link.icon className={cn("w-5 h-5", isActive && "fill-[#FF4D8D]/20")} />
                        </div>
                        {link.label}
                        {link.badge && (
                          <Badge className="ml-auto bg-[#FF4D8D] shadow-[0_0_10px_rgba(255,77,141,0.5)] text-white border-0 rounded-full px-2">
                            {link.badge} new
                          </Badge>
                        )}
                      </Button>
                    </Link>
                  )
                })
              ) : (
                <div className="flex flex-col gap-3 p-2">
                  <Link to="/login" onClick={() => setIsOpen(false)} className="w-full">
                    <Button variant="outline" className="w-full h-14 rounded-[1.5rem] font-bold text-lg border-2 border-slate-200">
                      Log in
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setIsOpen(false)} className="w-full">
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
