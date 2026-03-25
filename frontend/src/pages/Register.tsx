import { SignUp } from "@clerk/clerk-react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { Layout } from "@/components/layout/Layout";

export default function Register() {
  return (
    <Layout showNavbar={false}>
      <div className="min-h-screen flex">
        <div className="flex-1 flex items-center justify-center p-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <SignUp
              routing="hash"
              signInUrl="/login"
              fallbackRedirectUrl="/onboarding"
            />
          </motion.div>
        </div>

        <div className="hidden lg:flex flex-1 gradient-primary items-center justify-center p-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center text-primary-foreground"
          >
            <Heart className="w-20 h-20 mx-auto mb-8 animate-float" />
            <h2 className="font-serif text-4xl font-bold mb-4">Find Your Perfect Match</h2>
            <p className="text-primary-foreground/80 max-w-md mx-auto">
              Join our community of millions who have found meaningful connections
              and lasting relationships on Heartly.
            </p>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
