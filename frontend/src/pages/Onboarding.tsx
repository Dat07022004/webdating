import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/clerk-react";
import {
  Heart,
  Camera,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, title: "Basic Info", description: "Tell us about yourself" },
  { id: 2, title: "Photos", description: "Add your best photos" },
  { id: 3, title: "Interests", description: "What do you enjoy?" },
  { id: 4, title: "Bio", description: "Write something about you" },
];

const interestOptions = [
  "Travel", "Photography", "Music", "Movies", "Books", "Fitness",
  "Cooking", "Art", "Gaming", "Sports", "Nature", "Fashion",
  "Technology", "Dancing", "Yoga", "Coffee", "Wine", "Hiking",
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [formData, setFormData] = useState({
    birthday: "",
    gender: "",
    lookingFor: "",
    location: "",
    photos: [] as string[],
    interests: [] as string[],
    bio: "",
  });
  const navigate = useNavigate();
  const { user } = useUser();

  const saveOnboarding = async () => {
    setIsSaving(true);
    setSaveError("");
    try {
      const payload = {
        clerkId: user?.id || "",
        email: user?.primaryEmailAddress?.emailAddress || "",
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        imageUrl: user?.imageUrl || "",
        birthday: formData.birthday,
        gender: formData.gender,
        lookingFor: formData.lookingFor,
        location: formData.location,
        interests: formData.interests,
        bio: formData.bio,
      };

      const response = await fetch("/api/users/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Authorization: `Bearer ${token}`, // Removed hard dependency on token
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message || "Lưu thông tin thất bại");
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Lưu thông tin thất bại");
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    try {
      await saveOnboarding();
      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1);
      } else {
        navigate("/discover");
      }
    } catch {
      // Error is already shown in UI state.
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  return (
    <div className="min-h-screen gradient-hero">
      <div className="container mx-auto px-4 py-8 max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-md">
            <Heart className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Complete Your Profile
          </h1>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  currentStep > step.id
                    ? "gradient-primary text-primary-foreground"
                    : currentStep === step.id
                    ? "gradient-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "w-full h-1 mx-2 rounded-full transition-colors",
                    currentStep > step.id ? "gradient-primary" : "bg-secondary"
                  )}
                  style={{ width: "40px" }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-card rounded-3xl shadow-card p-6 mb-6"
          >
            <h2 className="font-serif text-xl font-semibold text-foreground mb-1">
              {steps[currentStep - 1].title}
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              {steps[currentStep - 1].description}
            </p>

            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Birthday</Label>
                  <Input
                    type="date"
                    value={formData.birthday}
                    onChange={(e) =>
                      setFormData({ ...formData, birthday: e.target.value })
                    }
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>I am a</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Man", "Woman", "Other"].map((option) => (
                      <Button
                        key={option}
                        variant={formData.gender === option ? "gradient" : "outline"}
                        onClick={() => setFormData({ ...formData, gender: option })}
                        className="h-12"
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Looking for</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Men", "Women", "Everyone"].map((option) => (
                      <Button
                        key={option}
                        variant={formData.lookingFor === option ? "gradient" : "outline"}
                        onClick={() => setFormData({ ...formData, lookingFor: option })}
                        className="h-12"
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      placeholder="Enter your city"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      className="pl-10 h-12"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Photos */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Add at least 2 photos to continue. Your first photo will be your main profile picture.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "aspect-[3/4] rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors",
                        i === 0
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary hover:bg-primary/5"
                      )}
                    >
                      <div className="text-center">
                        {i === 0 ? (
                          <Camera className="w-8 h-8 text-primary mx-auto" />
                        ) : (
                          <Plus className="w-6 h-6 text-muted-foreground mx-auto" />
                        )}
                        {i === 0 && (
                          <span className="text-xs text-primary mt-1 block">Main</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Interests */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select at least 3 interests to help us find better matches for you.
                </p>
                <div className="flex flex-wrap gap-2">
                  {interestOptions.map((interest) => (
                    <Badge
                      key={interest}
                      variant={formData.interests.includes(interest) ? "default" : "secondary"}
                      className={cn(
                        "cursor-pointer transition-all py-2 px-4 text-sm",
                        formData.interests.includes(interest)
                          ? "gradient-primary text-primary-foreground border-0"
                          : "hover:bg-primary/10"
                      )}
                      onClick={() => toggleInterest(interest)}
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Selected: {formData.interests.length}/3 minimum
                </p>
              </div>
            )}

            {/* Step 4: Bio */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Write a short bio to introduce yourself. Be creative!
                </p>
                <Textarea
                  placeholder="Tell potential matches about yourself..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="min-h-[150px] resize-none"
                />
                <p className="text-sm text-muted-foreground text-right">
                  {formData.bio.length}/500
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          {currentStep > 1 ? (
            <Button variant="ghost" onClick={handleBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          ) : (
            <div />
          )}
          <Button variant="gradient" onClick={handleNext} className="gap-2" disabled={isSaving}>
            {currentStep === steps.length ? (
              <>
                <Sparkles className="w-4 h-4" />
                {isSaving ? "Saving..." : "Complete Profile"}
              </>
            ) : (
              <>
                {isSaving ? "Saving..." : "Next"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
        {saveError && (
          <p className="text-sm text-destructive mt-4 text-center">{saveError}</p>
        )}
      </div>
    </div>
  );
}
