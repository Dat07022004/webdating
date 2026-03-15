import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Heart, Shield, MessageCircle, Calendar, MapPin, Star, Users, Video } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const features = [
  {
    icon: Heart,
    title: "Smart Matching",
    description: "AI-powered suggestions based on your interests and behavior",
  },
  {
    icon: Shield,
    title: "Verified Profiles",
    description: "Email and phone verification for authentic connections",
  },
  {
    icon: MessageCircle,
    title: "Real-time Chat",
    description: "Instant messaging with photos, emojis, and more",
  },
  {
    icon: Video,
    title: "Video Calls",
    description: "Face-to-face conversations with your matches",
  },
  {
    icon: Calendar,
    title: "Easy Scheduling",
    description: "Plan and manage your dates effortlessly",
  },
  {
    icon: MapPin,
    title: "Location-based",
    description: "Find connections near you for convenient meetups",
  },
];

const testimonials = [
  {
    name: "Sarah & Mike",
    image: "https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=100&h=100&fit=crop",
    quote: "We matched on Heartly and got married 2 years later!",
  },
  {
    name: "Emily & James",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    quote: "The video call feature helped us connect before meeting.",
  },
  {
    name: "Alex & Jordan",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    quote: "Best dating app we've ever used. Simple and effective!",
  },
];

export default function Landing() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={heroBg}
            alt="Romantic sunset"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/40 to-background" />
        </div>

        <div className="relative container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-coral-light text-coral-dark text-sm font-medium mb-6">
              <Heart className="w-4 h-4" />
              Find Your Perfect Match
            </span>
            <h1 className="font-serif text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              Where Love Stories
              <br />
              <span className="text-gradient">Begin</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Discover meaningful connections with people who share your interests.
              Start your journey to finding love today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register">
                <Button variant="hero" size="xl">
                  Start For Free
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="xl">
                  I Have an Account
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-20 grid grid-cols-3 gap-8 max-w-lg mx-auto"
          >
            {[
              { value: "2M+", label: "Active Users" },
              { value: "500K+", label: "Matches Made" },
              { value: "50K+", label: "Success Stories" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-serif font-bold text-gradient">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-card">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-4xl font-bold text-foreground mb-4">
              Why Choose Heartly?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Everything you need to find love, all in one beautiful app
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-background shadow-card hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-4xl font-bold text-foreground mb-4">
              Love Stories
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Real couples who found love on Heartly
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-card shadow-card text-center"
              >
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-16 h-16 rounded-full mx-auto mb-4 object-cover ring-2 ring-coral-light"
                />
                <p className="text-foreground mb-4 italic">"{testimonial.quote}"</p>
                <div className="flex items-center justify-center gap-1 text-gold">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm font-medium text-muted-foreground mt-2">
                  {testimonial.name}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-card">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center p-12 rounded-3xl gradient-primary"
          >
            <Heart className="w-12 h-12 text-primary-foreground mx-auto mb-6 animate-heart-beat" />
            <h2 className="font-serif text-4xl font-bold text-primary-foreground mb-4">
              Ready to Find Love?
            </h2>
            <p className="text-primary-foreground/90 mb-8 max-w-lg mx-auto">
              Join millions of singles who have found their perfect match on Heartly.
              Your love story starts here.
            </p>
            <Link to="/register">
              <Button
                variant="outline"
                size="xl"
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 border-0"
              >
                Get Started Free
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Heart className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-serif text-lg font-semibold">Heartly</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">About</a>
              <a href="#" className="hover:text-foreground transition-colors">Safety</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Heartly. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </Layout>
  );
}
