import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Star, DollarSign, Clock, Heart, Search, Filter, Coffee, UtensilsCrossed, Wine, TreePine, Music, Palette } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

type DateSpotItem = {
  _id: string;
  name: string;
  address?: string;
  category?: string;
  averagePrice?: number;
  openingHours?: { open?: string; close?: string };
  averageRating?: number;
  totalReviews?: number;
};

const categoryLabel: Record<string, string> = {
  cafe: "Coffee & Cafe",
  restaurant: "Restaurant",
  cinema: "Cinema",
  park: "Park",
};

const categoryIconMap: Record<string, any> = {
  cafe: Coffee,
  restaurant: UtensilsCrossed,
  cinema: Music,
  park: TreePine,
};

const costColors: Record<string, string> = {
  "$": "text-success",
  "$$": "text-accent",
  "$$$": "text-coral-dark",
};

const DateSpots = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [spots, setSpots] = useState<DateSpotItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSpots = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (category !== "all") params.set("category", category);

      const res = await fetch(`/api/date-spots?${params.toString()}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to load date spots");
      }

      const payload = await res.json();
      setSpots(Array.isArray(payload?.items) ? payload.items : []);
    } catch (err: any) {
      toast({ title: "Lỗi tải địa điểm", description: String(err?.message || err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpots();
  }, []);

  const filtered = useMemo(() => spots, [spots]);

  const toggleFav = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toCostTier = (price?: number) => {
    if (!price || price <= 100000) return "$";
    if (price <= 300000) return "$$";
    return "$$$";
  };

  const toIcon = (categoryKey?: string) => categoryIconMap[categoryKey || ""] || Palette;

  const toHours = (openingHours?: { open?: string; close?: string }) => {
    if (!openingHours?.open || !openingHours?.close) return "N/A";
    return `${openingHours.open} - ${openingHours.close}`;
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
              <SelectItem value="cafe">Coffee & Cafe</SelectItem>
              <SelectItem value="restaurant">Restaurant</SelectItem>
              <SelectItem value="cinema">Cinema</SelectItem>
              <SelectItem value="park">Park</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchSpots} disabled={loading}>
            {loading ? "Loading..." : "Apply"}
          </Button>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((spot, i) => {
            const IconComp = toIcon(spot.category);
            const costTier = toCostTier(spot.averagePrice);

            return (
            <motion.div key={spot._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden gradient-card h-full flex flex-col">
                {/* Image area */}
                <div className="h-40 gradient-primary flex items-center justify-center text-6xl relative">
                  {spot.category === "cafe" ? "☕" : spot.category === "restaurant" ? "🍽️" : spot.category === "cinema" ? "🎬" : "🌿"}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 bg-card/80 backdrop-blur-sm hover:bg-card"
                    onClick={() => toggleFav(spot._id)}
                  >
                    <Heart className={`w-5 h-5 ${favorites.includes(spot._id) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  </Button>
                  <Badge className="absolute top-3 left-3 bg-card/80 backdrop-blur-sm text-foreground border-0">
                    <IconComp className="w-3 h-3 mr-1" />
                    {categoryLabel[spot.category || ""] || "Date Spot"}
                  </Badge>
                </div>

                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-serif text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{spot.name}</h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <Star className="w-4 h-4 fill-accent text-accent" />
                      <span className="text-sm font-medium">{(spot.averageRating || 0).toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">({spot.totalReviews || 0})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <MapPin className="w-3.5 h-3.5" />
                    {spot.address || "No address"}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 pb-3">
                  <p className="text-sm text-muted-foreground mb-3">Địa điểm phù hợp cho hẹn hò, có thống kê đánh giá từ cộng đồng.</p>
                </CardContent>

                <CardFooter className="border-t border-border pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span className={`font-semibold ${costColors[costTier]}`}>{costTier}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {toHours(spot.openingHours)}
                    </span>
                  </div>
                  <Button size="sm" variant="gradient" asChild>
                    <a href={`/appointments/book?spot=${spot._id}`}>Book Date</a>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )})}
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
