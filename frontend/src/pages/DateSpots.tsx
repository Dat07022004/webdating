import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Star, DollarSign, Clock, Heart, Search, Filter, Coffee, UtensilsCrossed, Wine, TreePine, Music, Palette } from "lucide-react";
import { motion } from "framer-motion";

const spots = [
  {
    id: 1,
    name: "Sunset Rooftop Lounge",
    category: "Bar & Lounge",
    icon: Wine,
    location: "Downtown, 5th Avenue",
    description: "A stunning rooftop bar with panoramic city views. Perfect for a romantic evening watching the sunset over cocktails.",
    cost: "$$$",
    rating: 4.8,
    reviews: 234,
    image: "🌇",
    tags: ["Romantic", "Scenic", "Cocktails"],
    hours: "5 PM – 12 AM",
    liked: false,
  },
  {
    id: 2,
    name: "The Cozy Bean Café",
    category: "Coffee & Café",
    icon: Coffee,
    location: "Midtown, Oak Street",
    description: "Warm, intimate café with artisan coffee and homemade pastries. Ideal for a casual first date.",
    cost: "$",
    rating: 4.6,
    reviews: 189,
    image: "☕",
    tags: ["Casual", "Cozy", "Coffee"],
    hours: "7 AM – 9 PM",
    liked: true,
  },
  {
    id: 3,
    name: "Bella Italia Trattoria",
    category: "Restaurant",
    icon: UtensilsCrossed,
    location: "Little Italy, Vine Road",
    description: "Authentic Italian dining with candlelit tables and live acoustic music on weekends.",
    cost: "$$",
    rating: 4.7,
    reviews: 312,
    image: "🍝",
    tags: ["Italian", "Fine Dining", "Live Music"],
    hours: "11 AM – 11 PM",
    liked: false,
  },
  {
    id: 4,
    name: "Botanical Gardens Walk",
    category: "Outdoor",
    icon: TreePine,
    location: "Westside Park",
    description: "Beautiful botanical gardens with walking trails, a koi pond, and seasonal flower displays.",
    cost: "$",
    rating: 4.9,
    reviews: 567,
    image: "🌸",
    tags: ["Nature", "Walking", "Free-ish"],
    hours: "6 AM – 8 PM",
    liked: false,
  },
  {
    id: 5,
    name: "Jazz & Blues Corner",
    category: "Entertainment",
    icon: Music,
    location: "Arts District",
    description: "Intimate jazz club with craft cocktails and world-class performers every night.",
    cost: "$$",
    rating: 4.5,
    reviews: 198,
    image: "🎷",
    tags: ["Music", "Nightlife", "Cocktails"],
    hours: "7 PM – 2 AM",
    liked: true,
  },
  {
    id: 6,
    name: "Art & Sip Studio",
    category: "Activities",
    icon: Palette,
    location: "Creative Quarter",
    description: "Paint together while enjoying wine! Fun, interactive date idea with guided art sessions.",
    cost: "$$",
    rating: 4.7,
    reviews: 145,
    image: "🎨",
    tags: ["Creative", "Fun", "Wine"],
    hours: "10 AM – 10 PM",
    liked: false,
  },
];

const costColors: Record<string, string> = {
  "$": "text-success",
  "$$": "text-accent",
  "$$$": "text-coral-dark",
};

const DateSpots = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [favorites, setFavorites] = useState<number[]>(spots.filter(s => s.liked).map(s => s.id));

  const filtered = spots.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.location.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || s.category === category;
    return matchSearch && matchCat;
  });

  const toggleFav = (id: number) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <Layout isAuthenticated>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">Date Spot Suggestions</h1>
          <p className="text-muted-foreground text-lg">Discover the perfect place for your next date</p>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search spots..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Bar & Lounge">Bar & Lounge</SelectItem>
              <SelectItem value="Coffee & Café">Coffee & Café</SelectItem>
              <SelectItem value="Restaurant">Restaurant</SelectItem>
              <SelectItem value="Outdoor">Outdoor</SelectItem>
              <SelectItem value="Entertainment">Entertainment</SelectItem>
              <SelectItem value="Activities">Activities</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((spot, i) => (
            <motion.div key={spot.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden gradient-card h-full flex flex-col">
                {/* Image area */}
                <div className="h-40 gradient-primary flex items-center justify-center text-6xl relative">
                  {spot.image}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 bg-card/80 backdrop-blur-sm hover:bg-card"
                    onClick={() => toggleFav(spot.id)}
                  >
                    <Heart className={`w-5 h-5 ${favorites.includes(spot.id) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  </Button>
                  <Badge className="absolute top-3 left-3 bg-card/80 backdrop-blur-sm text-foreground border-0">
                    <spot.icon className="w-3 h-3 mr-1" />
                    {spot.category}
                  </Badge>
                </div>

                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-serif text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{spot.name}</h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <Star className="w-4 h-4 fill-accent text-accent" />
                      <span className="text-sm font-medium">{spot.rating}</span>
                      <span className="text-xs text-muted-foreground">({spot.reviews})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <MapPin className="w-3.5 h-3.5" />
                    {spot.location}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 pb-3">
                  <p className="text-sm text-muted-foreground mb-3">{spot.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {spot.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>

                <CardFooter className="border-t border-border pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span className={`font-semibold ${costColors[spot.cost]}`}>{spot.cost}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {spot.hours}
                    </span>
                  </div>
                  <Button size="sm" variant="gradient" asChild>
                    <a href={`/appointments/book?spot=${spot.id}`}>Book Date</a>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-xl text-foreground mb-2">No spots found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DateSpots;
