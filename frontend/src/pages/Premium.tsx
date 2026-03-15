import { motion } from "framer-motion";
import { Check, Crown, Sparkles, Heart, Zap, Shield, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";
import { useNavigate } from "react-router-dom";

const plans = [
  {
    id: "basic",
    name: "Basic",
    price: "Free",
    period: "",
    description: "Get started with essential features",
    features: [
      "5 likes per day",
      "Basic profile",
      "Limited matches",
      "Standard support",
    ],
    icon: Heart,
    popular: false,
    gradient: "from-muted to-muted/50",
  },
  {
    id: "gold",
    name: "Gold",
    price: "$14.99",
    period: "/month",
    description: "Unlock more connections",
    features: [
      "Unlimited likes",
      "See who likes you",
      "5 Super Likes per day",
      "Rewind last swipe",
      "1 Boost per month",
      "Priority support",
    ],
    icon: Crown,
    popular: true,
    gradient: "from-amber-400 to-orange-500",
  },
  {
    id: "platinum",
    name: "Platinum",
    price: "$29.99",
    period: "/month",
    description: "The ultimate dating experience",
    features: [
      "Everything in Gold",
      "Unlimited Super Likes",
      "Message before matching",
      "Priority profile visibility",
      "See who viewed you",
      "Advanced filters",
      "Weekly Boosts",
      "Dedicated support",
    ],
    icon: Sparkles,
    popular: false,
    gradient: "from-violet-500 to-purple-600",
  },
];

const perks = [
  {
    icon: Zap,
    title: "Boost Your Profile",
    description: "Get 10x more visibility for 30 minutes",
  },
  {
    icon: Star,
    title: "Super Likes",
    description: "Stand out and get 3x more likely to match",
  },
  {
    icon: Shield,
    title: "Priority Support",
    description: "Get help faster with dedicated support",
  },
];

const Premium = () => {
  const navigate = useNavigate();

  const handleSelectPlan = (planId: string) => {
    if (planId !== "basic") {
      navigate(`/payment?plan=${planId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar isAuthenticated />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Badge className="mb-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0">
            <Crown className="w-3 h-3 mr-1" />
            Premium Plans
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Find Love <span className="text-primary">Faster</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Upgrade to unlock exclusive features and increase your chances of finding your perfect match
          </p>
        </motion.div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className={`relative h-full transition-all duration-300 hover:shadow-xl ${
                  plan.popular 
                    ? "border-2 border-primary shadow-lg scale-105" 
                    : "hover:border-primary/50"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground shadow-md">
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-2">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center shadow-lg`}>
                    <plan.icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="text-center">
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  
                  <ul className="space-y-3 mb-6 text-left">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    onClick={() => handleSelectPlan(plan.id)}
                    variant={plan.popular ? "gradient" : "outline"}
                    className="w-full"
                    size="lg"
                  >
                    {plan.id === "basic" ? "Current Plan" : "Get Started"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Perks Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-2xl font-bold text-center mb-8">Premium Perks</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {perks.map((perk, index) => (
              <Card key={index} className="text-center p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                  <perk.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{perk.title}</h3>
                <p className="text-sm text-muted-foreground">{perk.description}</p>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* FAQ or Guarantee */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <Card className="max-w-2xl mx-auto p-8 bg-gradient-to-br from-primary/5 to-secondary/5">
            <Shield className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">30-Day Money Back Guarantee</h3>
            <p className="text-muted-foreground">
              Not satisfied? Get a full refund within 30 days, no questions asked.
            </p>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default Premium;
