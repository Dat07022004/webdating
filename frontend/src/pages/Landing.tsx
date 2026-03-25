import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Heart, Sparkles, MessageCircle, Flame, MapPin, Zap, Camera, Star } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";

// Gen Z playful features - 3D-like colorful icon gradients
const features = [
  {
    icon: Flame,
    title: "Vibe Check",
    gradient: "from-[#FF4D8D] to-[#FF8E53]",
    shadow: "shadow-[0_10px_20px_rgba(255,77,141,0.3)]",
    description: "Match with people on your level. Real vibes only, no fakes allowed.",
  },
  {
    icon: Camera,
    title: "Photo Verified",
    gradient: "from-[#4facfe] to-[#00f2fe]",
    shadow: "shadow-[0_10px_20px_rgba(79,172,254,0.3)]",
    description: "No catfishes here. Everyone goes through strict selfie checks.",
  },
  {
    icon: Zap,
    title: "Instant Spark",
    gradient: "from-[#fa709a] to-[#fee140]",
    shadow: "shadow-[0_10px_20px_rgba(250,112,154,0.3)]",
    description: "Skip the small talk. Use icebreakers to slide into their DMs smoothly.",
  },
  {
    icon: MapPin,
    title: "Local Radar",
    gradient: "from-[#c471f5] to-[#fa71cd]",
    shadow: "shadow-[0_10px_20px_rgba(196,113,245,0.3)]",
    description: "Find cool people chilling nearby right now. Expand your circle.",
  },
];

const testimonials = [
  {
    name: "Alex & Sam",
    image: "https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=200&h=200&fit=crop",
    quote: "Matched on a Tuesday, getting boba on a Wednesday. Best app ever ✨",
    tag: "@alex_vibes",
  },
  {
    name: "Mia & Chris",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
    quote: "Actually found someone who matches my chaotic energy. 10/10 recommend.",
    tag: "@mia.chaos",
  },
  {
    name: "Jordan & Casey",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
    quote: "We bonded over the same weird Spotify playlist. Heartly gets it.",
    tag: "@jordan_jams",
  },
];

export default function Landing() {
  return (
    <Layout>
      <div className="bg-[#FFF8FA] min-h-screen text-[#1E1E2F] font-sans selection:bg-[#FF4D8D]/30 overflow-hidden">

        {/* Helper CSS for custom organic shapes and masks */}
        <style dangerouslySetInnerHTML={{
          __html: `
          .organic-blob {
            border-radius: 41% 59% 46% 54% / 54% 39% 61% 46%;
          }
          .organic-blob-reverse {
            border-radius: 65% 35% 36% 64% / 44% 52% 48% 56%;
          }
          .heart-bounce {
            animation: bounce-gentle 3s ease-in-out infinite both alternate;
          }
          @keyframes bounce-gentle {
            0% { transform: translateY(0) scale(1); }
            100% { transform: translateY(-10px) scale(1.02); }
          }
        `}} />

        {/* SVG Clip Paths defined globally */}
        <svg width="0" height="0" className="absolute -z-10">
          <clipPath id="heart-clip" clipPathUnits="objectBoundingBox">
            <path d="M0.5,0.93 C0.5,0.93 0.05,0.65 0.05,0.35 C0.05,0.15 0.2,0.02 0.4,0.15 C0.5,0.25 0.5,0.25 0.5,0.25 C0.5,0.25 0.5,0.25 0.6,0.15 C0.8,0.02 0.95,0.15 0.95,0.35 C0.95,0.65 0.5,0.93 0.5,0.93 Z" />
          </clipPath>
        </svg>

        {/* Hero Section */}
        <section className="relative min-h-[90svh] flex flex-col justify-center pt-24 pb-16">
          {/* Background Decorative Blobs */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[#FF4D8D]/20 to-[#FF8E53]/20 blur-3xl organic-blob -z-10 translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-10 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-[#c471f5]/20 to-[#fa71cd]/20 blur-3xl organic-blob-reverse -z-10 -translate-x-1/3" />

          <div className="container mx-auto px-6 lg:px-12 flex flex-col-reverse lg:flex-row items-center justify-between gap-12 lg:gap-20">

            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="lg:w-1/2 text-left z-10"
            >
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[2rem] bg-white shadow-[0_4px_16px_rgba(255,77,141,0.15)] text-[#FF4D8D] font-bold text-sm mb-6 border-2 border-[#FF4D8D]/10">
                <Sparkles className="w-4 h-4" />
                Dating that actually makes sense
              </div>

              <h1 className="text-6xl md:text-7xl lg:text-[5rem] font-black leading-[1.05] tracking-tight mb-8">
                Made for <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4D8D] to-[#FF8E53]">
                  your vibe.
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-slate-600 font-medium mb-12 max-w-lg leading-snug">
                Stop swiping on ghosts. Meet verified profiles, chaotic good energy, and people who pass the vibe check.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-5">
                <Link to="/register" className="w-full sm:w-auto">
                  <Button
                    size="xl"
                    className="w-full h-16 px-10 text-xl font-bold rounded-[2rem] bg-gradient-to-r from-[#FF4D8D] to-[#FF8E53] text-white border-0 shadow-[0_0_25px_rgba(255,77,141,0.5)] hover:shadow-[0_0_40px_rgba(255,142,83,0.7)] hover:scale-105 transition-all duration-300"
                  >
                    Start For Free <Zap className="w-5 h-5 ml-2 fill-white" />
                  </Button>
                </Link>
                <Link to="/login" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="xl"
                    className="w-full h-16 px-10 text-xl font-bold rounded-[2rem] text-slate-800 border-2 border-slate-200 hover:border-[#FF4D8D]/50 hover:bg-[#FF4D8D]/5 transition-all duration-300 bg-white"
                  >
                    Log In
                  </Button>
                </Link>
              </div>

              <div className="mt-10 flex items-center gap-4 text-slate-500 font-semibold tracking-wide text-sm bg-white/60 p-3 pr-6 rounded-[2rem] inline-flex backdrop-blur-md">
                <div className="flex -space-x-3">
                  {testimonials.map((t, i) => (
                    <img key={i} src={t.image} alt="User" className="w-10 h-10 rounded-full border-2 border-white object-cover" />
                  ))}
                </div>
                Trusted by 2M+ members
              </div>
            </motion.div>

            {/* Stylized Heart Image Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, type: "spring", bounce: 0.4 }}
              className="lg:w-1/2 w-full max-w-[500px] relative heart-bounce"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-[#FF4D8D] to-[#FF8E53] organic-blob scale-105 blur-md opacity-40 translate-y-4" />
              <div className="relative aspect-square w-full">
                <img
                  src="https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=1000&auto=format&fit=crop"
                  alt="Happy young couple"
                  className="w-full h-full object-cover"
                  style={{ clipPath: "url(#heart-clip)" }}
                />

                {/* Floating Elements */}
                <motion.div
                  animate={{ y: [0, -15, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className="absolute top-[10%] -left-[5%] bg-white p-4 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] border-2 border-slate-50 flex items-center gap-3 z-20"
                >
                  <div className="bg-gradient-to-br from-[#FF4D8D] to-[#FF8E53] w-10 h-10 rounded-full flex items-center justify-center">
                    <Heart className="w-5 h-5 text-white fill-white" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 leading-none">It's a Match!</div>
                    <div className="text-pink-500 text-sm font-semibold">Just now</div>
                  </div>
                </motion.div>

                <motion.div
                  animate={{ y: [0, 15, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="absolute bottom-[20%] -right-[5%] bg-white p-4 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] border-2 border-slate-50 flex items-center gap-3 z-20"
                >
                  <div className="bg-gradient-to-br from-[#4facfe] to-[#00f2fe] w-10 h-10 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white fill-white" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 leading-none">@alex.199</div>
                    <div className="text-blue-500 text-sm font-semibold">"Omg same!"</div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="container mx-auto px-6 lg:px-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20 max-w-2xl mx-auto"
            >
              <h2 className="text-5xl md:text-6xl font-black mb-6 text-slate-900 tracking-tight">
                Not your average <br /> dating app
              </h2>
              <p className="text-xl text-slate-500 font-medium font-sans">
                We're throwing out the old rules. Heartly is built for real connections, zero cringe, and good times.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border-2 border-slate-100 hover:border-pink-200 transition-all duration-300 hover:scale-105 hover:-translate-y-2 group"
                >
                  <div className={`w-16 h-16 rounded-[1.5rem] bg-gradient-to-br ${feature.gradient} ${feature.shadow} flex items-center justify-center mb-8 rotate-3 group-hover:rotate-12 transition-transform duration-300`}>
                    <feature.icon className="w-8 h-8 text-white" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-slate-500 font-medium leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 bg-gradient-to-b from-[#FFF8FA] to-white relative">
          <div className="container mx-auto px-6 lg:px-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-20"
            >
              <h2 className="text-5xl md:text-6xl font-black text-slate-900 mb-4 tracking-tight text-center">
                Success <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4D8D] to-[#FF8E53]">Stories</span>
              </h2>
              <p className="text-slate-500 text-xl font-medium text-center">Don't just take our word for it.</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {testimonials.map((testimonial, i) => (
                <motion.div
                  key={testimonial.name}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-8 rounded-[2.5rem] bg-slate-50 border-2 border-slate-100/50 hover:bg-white hover:shadow-[0_20px_40px_rgba(255,77,141,0.08)] transition-all duration-300 group"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-16 h-16 rounded-full object-cover shadow-lg border-4 border-white group-hover:border-pink-200 transition-colors"
                    />
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg">{testimonial.name}</h4>
                      <p className="text-pink-500 font-semibold text-sm">{testimonial.tag}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-[#FF8E53] fill-[#FF8E53]" />
                    ))}
                  </div>
                  <p className="text-slate-600 font-medium text-lg leading-relaxed">
                    "{testimonial.quote}"
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="container mx-auto px-6 lg:px-12 max-w-[1200px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative p-12 md:p-20 rounded-[3rem] bg-gradient-to-br from-[#FF4D8D] to-[#FF8E53] text-center overflow-hidden shadow-[0_20px_50px_rgba(255,142,83,0.3)]"
            >
              {/* Background patterns */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl mix-blend-overlay" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-400/40 rounded-full blur-3xl mix-blend-overlay" />

              <div className="relative z-10 flex flex-col items-center">
                <h2 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight leading-[1.1]">
                  Ready to match <br /> your energy?
                </h2>
                <p className="text-white/90 font-medium text-xl md:text-2xl mb-12 max-w-2xl">
                  Download the app, create your vibe, and start meeting people who actually get you.
                </p>
                <Link to="/register">
                  <Button
                    size="xl"
                    className="h-20 px-12 text-2xl font-black rounded-[2rem] bg-white text-[#FF4D8D] hover:bg-slate-50 hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all duration-300"
                  >
                    Get the App <Sparkles className="w-6 h-6 ml-2 text-[#FF8E53]" />
                  </Button>
                </Link>
                <p className="text-white/80 font-semibold mt-6">Free forever. Premium options available.</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 bg-white">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-[#FF4D8D] to-[#FF8E53] p-2 rounded-xl">
                  <Heart className="w-6 h-6 text-white fill-white" />
                </div>
                <span className="font-black text-2xl text-slate-900 tracking-tight">Heartly</span>
              </div>
              <div className="flex items-center gap-8 font-bold text-slate-500">
                <a href="#" className="hover:text-[#FF4D8D] transition-colors">TikTok</a>
                <a href="#" className="hover:text-[#FF4D8D] transition-colors">Instagram</a>
                <a href="#" className="hover:text-[#FF4D8D] transition-colors">Terms</a>
              </div>
              <p className="font-semibold text-slate-400">
                © {new Date().getFullYear()} Heartly. Vibe checking correctly.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </Layout>
  );
}
