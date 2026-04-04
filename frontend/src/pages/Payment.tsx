import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, Lock, Check, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/layout/Navbar";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/clerk-react";

const planDetails = {
  gold: {
    name: "Gold",
    price: 14.99,
    icon: Crown,
    gradient: "from-amber-400 to-orange-500",
    features: ["Unlimited likes", "See who likes you", "5 Super Likes/day", "1 Boost/month"],
  },
  platinum: {
    name: "Platinum",
    price: 29.99,
    icon: Sparkles,
    gradient: "from-violet-500 to-purple-600",
    features: ["Everything in Gold", "Unlimited Super Likes", "Message before matching", "Weekly Boosts"],
  },
};

const Payment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { getToken } = useAuth();
  const planId = searchParams.get("plan") as keyof typeof planDetails || "gold";
  const plan = planDetails[planId] || planDetails.gold;
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const resultCode = searchParams.get("resultCode");
    if (!resultCode) return;

    const confirmReturn = async () => {
      setIsProcessing(true);

      try {
        const baseUrl = import.meta.env.VITE_API_URL
          ? import.meta.env.VITE_API_URL.replace(/\/$/, "")
          : "http://localhost:3000";

        const token = await getToken();
        const payload = Object.fromEntries(searchParams.entries());

        const res = await fetch(`${baseUrl}/api/premium/momo-return`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || "Failed to confirm payment");
        }

        if (data?.status === "success" || resultCode === "0") {
          toast({
            title: "Payment Successful! 🎉",
            description: `Welcome to ${plan.name}! Your premium features are now active.`,
          });
          navigate("/discover");
          return;
        }

        toast({
          title: "Payment Failed",
          description: "Your payment did not complete. Please try again.",
          variant: "destructive",
        });
      } catch (error) {
        toast({
          title: "Payment Confirmation Error",
          description: error instanceof Error ? error.message : "Unable to verify payment",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    };

    confirmReturn();
  }, [getToken, navigate, plan.name, searchParams, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const token = await getToken();
      if (!token) {
        toast({
          title: "Authentication required",
          description: "Please sign in before purchasing a plan.",
          variant: "destructive",
        });
        return;
      }

      const baseUrl = import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace(/\/$/, "")
        : "http://localhost:3000";

      const res = await fetch(`${baseUrl}/api/premium/create-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: planId }),
      });

      const data = await res.json();
      if (!res.ok || !data?.payUrl) {
        throw new Error(data?.message || "Failed to start payment");
      }

      window.location.href = data.payUrl;
    } catch (error) {
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Unable to create payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar isAuthenticated />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate("/premium")}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Plans
          </Button>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Order Summary */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center shadow-lg`}>
                      <plan.icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{plan.name} Plan</h3>
                      <p className="text-muted-foreground">Monthly subscription</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${plan.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span>$0.00</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                      <span>Total</span>
                      <span className="text-primary">${plan.price.toFixed(2)}/mo</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security Badge */}
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Lock className="w-4 h-4" />
                <span>Secured with 256-bit SSL encryption</span>
              </div>
            </motion.div>

            {/* Payment Action */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      You will be redirected to MoMo to complete the payment securely.
                    </p>

                    <Button
                      type="submit"
                      variant="gradient"
                      size="lg"
                      className="w-full"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing...
                        </div>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Pay with MoMo
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      By confirming, you agree to our Terms of Service and authorize this recurring charge.
                      Cancel anytime.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Payment;
