import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
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
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const MAX_PHOTOS = 6;

const normalizeLocationName = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const stripProvincePrefix = (value: string) =>
  value
    .replace(/^thanh pho\s+/i, "")
    .replace(/^tp\.?\s*/i, "")
    .replace(/^tinh\s+/i, "")
    .trim();

const stripWardPrefix = (value: string) =>
  value
    .replace(/^phuong\s+/i, "")
    .replace(/^xa\s+/i, "")
    .replace(/^thi tran\s+/i, "")
    .replace(/^tt\.?\s*/i, "")
    .trim();

type UploadedPhoto = {
  url: string;
  publicId?: string;
};

type Province = {
  province_code: string;
  name: string;
};

type Ward = {
  ward_code: string;
  ward_name: string;
  province_code: string;
};

type ReverseGeocodeResult = {
  displayLocation: string;
  provinceName: string;
  wardName: string;
};

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [saveError, setSaveError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
  const [selectedWardCode, setSelectedWardCode] = useState("");
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingWards, setIsLoadingWards] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [formData, setFormData] = useState({
    birthday: "",
    gender: "",
    lookingFor: "",
    location: "",
    photos: [] as UploadedPhoto[],
    interests: [] as string[],
    bio: "",
  });
  const navigate = useNavigate();
  const { user } = useUser();
  const apiBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

  const selectedProvince = useMemo(
    () => provinces.find((province) => province.province_code === selectedProvinceCode) || null,
    [provinces, selectedProvinceCode]
  );

  useEffect(() => {
    let isActive = true;

    const loadProvinces = async () => {
      setIsLoadingProvinces(true);
      try {
        const response = await fetch("https://34tinhthanh.com/api/provinces");
        const data = (await response.json().catch(() => [])) as Province[];
        if (isActive) {
          setProvinces(Array.isArray(data) ? data : []);
        }
      } catch {
        if (isActive) {
          setProvinces([]);
        }
      } finally {
        if (isActive) {
          setIsLoadingProvinces(false);
        }
      }
    };

    void loadProvinces();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedProvinceCode) {
      setWards([]);
      setSelectedWardCode("");
      return;
    }

    let isActive = true;

    const loadWards = async () => {
      setIsLoadingWards(true);
      try {
        const response = await fetch(
          `https://34tinhthanh.com/api/wards?province_code=${selectedProvinceCode}`
        );
        const data = (await response.json().catch(() => [])) as Ward[];
        if (isActive) {
          setWards(Array.isArray(data) ? data : []);
        }
      } catch {
        if (isActive) {
          setWards([]);
        }
      } finally {
        if (isActive) {
          setIsLoadingWards(false);
        }
      }
    };

    void loadWards();

    return () => {
      isActive = false;
    };
  }, [selectedProvinceCode]);

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
        photos: formData.photos.map((photo, index) => ({
          url: photo.url,
          publicId: photo.publicId || "",
          isPrimary: index === 0,
        })),
        birthday: formData.birthday,
        gender: formData.gender,
        lookingFor: formData.lookingFor,
        location: formData.location,
        interests: formData.interests,
        bio: formData.bio,
      };

      const response = await fetch(`${apiBaseUrl}/api/users/onboarding`, {
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
    if (currentStep === 2 && formData.photos.length < 2) {
      setSaveError("Vui long tai len it nhat 2 anh truoc khi tiep tuc");
      return;
    }

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

  const formatLocation = (provinceName?: string, wardName?: string) => {
    if (!provinceName && !wardName) return "";
    if (provinceName && wardName) return `${wardName}, ${provinceName}`;
    return provinceName || wardName || "";
  };

  const handleProvinceChange = (value: string) => {
    const province = provinces.find((item) => item.province_code === value);
    setSelectedProvinceCode(value);
    setSelectedWardCode("");
    setFormData((prev) => ({
      ...prev,
      location: formatLocation(province?.name),
    }));
  };

  const handleWardChange = (value: string) => {
    const ward = wards.find((item) => item.ward_code === value);
    setSelectedWardCode(value);
    setFormData((prev) => ({
      ...prev,
      location: formatLocation(selectedProvince?.name, ward?.ward_name),
    }));
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      );
      if (!response.ok) {
        return { displayLocation: "", provinceName: "", wardName: "" };
      }
      const data = (await response.json().catch(() => null)) as
        | {
            display_name?: string;
            address?: {
              suburb?: string;
              neighbourhood?: string;
              quarter?: string;
              city_district?: string;
              state_district?: string;
              city?: string;
              town?: string;
              village?: string;
              county?: string;
              state?: string;
              region?: string;
            };
          }
        | null;
      if (!data?.address) {
        return {
          displayLocation: data?.display_name || "",
          provinceName: "",
          wardName: "",
        };
      }

      const wardName =
        data.address.suburb ||
        data.address.neighbourhood ||
        data.address.quarter ||
        data.address.city_district ||
        data.address.state_district ||
        "";
      const provinceName =
        data.address.state ||
        data.address.city ||
        data.address.town ||
        data.address.village ||
        data.address.region ||
        data.address.county ||
        "";

      return {
        displayLocation: formatLocation(provinceName, wardName) || data.display_name || "",
        provinceName,
        wardName,
      } satisfies ReverseGeocodeResult;
    } catch {
      return { displayLocation: "", provinceName: "", wardName: "" };
    }
  };

  const findProvinceMatch = (name: string) => {
    const normalizedTarget = normalizeLocationName(stripProvincePrefix(name));
    if (!normalizedTarget) return null;

    return (
      provinces.find((province) => {
        const normalizedProvince = normalizeLocationName(stripProvincePrefix(province.name));
        return (
          normalizedProvince === normalizedTarget ||
          normalizedProvince.includes(normalizedTarget) ||
          normalizedTarget.includes(normalizedProvince)
        );
      }) || null
    );
  };

  const findWardMatch = (name: string, wardOptions: Ward[]) => {
    const normalizedTarget = normalizeLocationName(stripWardPrefix(name));
    if (!normalizedTarget) return null;

    return (
      wardOptions.find((ward) => {
        const normalizedWard = normalizeLocationName(stripWardPrefix(ward.ward_name));
        return (
          normalizedWard === normalizedTarget ||
          normalizedWard.includes(normalizedTarget) ||
          normalizedTarget.includes(normalizedWard)
        );
      }) || null
    );
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported on this device.");
      return;
    }

    setIsLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ lat: latitude, lng: longitude });
        const resolvedLocation = await reverseGeocode(latitude, longitude);
        const fallbackLocation = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

        let nextLocation = resolvedLocation.displayLocation || fallbackLocation;
        const matchedProvince = resolvedLocation.provinceName
          ? findProvinceMatch(resolvedLocation.provinceName)
          : null;

        if (matchedProvince) {
          setSelectedProvinceCode(matchedProvince.province_code);

          try {
            const wardResponse = await fetch(
              `https://34tinhthanh.com/api/wards?province_code=${matchedProvince.province_code}`
            );
            const wardData = (await wardResponse.json().catch(() => [])) as Ward[];
            const loadedWards = Array.isArray(wardData) ? wardData : [];
            setWards(loadedWards);

            const matchedWard = resolvedLocation.wardName
              ? findWardMatch(resolvedLocation.wardName, loadedWards)
              : null;

            if (matchedWard) {
              setSelectedWardCode(matchedWard.ward_code);
              nextLocation = formatLocation(matchedProvince.name, matchedWard.ward_name);
            } else {
              setSelectedWardCode("");
              nextLocation = formatLocation(matchedProvince.name);
            }
          } catch {
            setSelectedWardCode("");
            nextLocation = formatLocation(matchedProvince.name);
          }
        }

        setFormData((prev) => ({
          ...prev,
          location: nextLocation,
        }));
        setIsLocating(false);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError("Location permission denied.");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError("Location information is unavailable.");
        } else if (error.code === error.TIMEOUT) {
          setLocationError("Location request timed out.");
        } else {
          setLocationError("Unable to retrieve your location.");
        }
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const openPhotoPicker = () => {
    if (isUploadingPhotos) {
      return;
    }

    fileInputRef.current?.click();
  };

  const setPrimaryPhoto = (index: number) => {
    if (index <= 0 || index >= formData.photos.length) {
      return;
    }

    setFormData((prev) => {
      const nextPhotos = [...prev.photos];
      const [selected] = nextPhotos.splice(index, 1);
      nextPhotos.unshift(selected);
      return { ...prev, photos: nextPhotos };
    });
  };

  const removePhotoAt = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const handlePhotoInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";

    if (selectedFiles.length === 0) {
      return;
    }

    const availableSlots = MAX_PHOTOS - formData.photos.length;
    if (availableSlots <= 0) {
      setSaveError("Ban chi co the tai len toi da 6 anh");
      return;
    }

    const filesToUpload = selectedFiles.slice(0, availableSlots);
    setIsUploadingPhotos(true);
    setSaveError("");

    try {
      const body = new FormData();
      body.append("clerkId", user?.id || "");
      filesToUpload.forEach((file) => body.append("photos", file));

      const response = await fetch(`${apiBaseUrl}/api/users/photos/upload`, {
        method: "POST",
        body,
      });

      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
        photos?: UploadedPhoto[];
      };

      if (!response.ok) {
        throw new Error(data.message || "Tai anh that bai");
      }

      if (!Array.isArray(data.photos) || data.photos.length === 0) {
        throw new Error("Khong nhan duoc anh sau khi tai len");
      }

      setFormData((prev) => ({
        ...prev,
        photos: [...prev.photos, ...data.photos],
      }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Tai anh that bai");
    } finally {
      setIsUploadingPhotos(false);
    }
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
                  <div className="space-y-2">
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Select
                        value={selectedProvinceCode}
                        onValueChange={handleProvinceChange}
                      >
                        <SelectTrigger className="pl-10 h-12">
                          <SelectValue
                            placeholder={
                              isLoadingProvinces ? "Loading provinces..." : "Select province"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {provinces.map((province) => (
                            <SelectItem key={province.province_code} value={province.province_code}>
                              {province.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Select
                      value={selectedWardCode}
                      onValueChange={handleWardChange}
                      disabled={!selectedProvinceCode || isLoadingWards}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue
                          placeholder={
                            !selectedProvinceCode
                              ? "Select ward"
                              : isLoadingWards
                              ? "Loading wards..."
                              : "Select ward"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {wards.map((ward) => (
                          <SelectItem key={ward.ward_code} value={ward.ward_code}>
                            {ward.ward_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUseCurrentLocation}
                      disabled={isLocating}
                      className="w-full"
                    >
                      {isLocating ? "Locating..." : "Use current location"}
                    </Button>
                    {locationError && (
                      <p className="text-xs text-destructive">{locationError}</p>
                    )}
                    {coordinates && !locationError && (
                      <p className="text-xs text-muted-foreground">
                        Coordinates: {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}
                      </p>
                    )}
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoInputChange}
                />
                <div className="grid grid-cols-3 gap-3">
                  {[...Array(MAX_PHOTOS)].map((_, i) => {
                    const photo = formData.photos[i];

                    return (
                    <div
                      key={i}
                      onClick={() => {
                        if (!photo) {
                          openPhotoPicker();
                          return;
                        }

                        if (i !== 0) {
                          setPrimaryPhoto(i);
                        }
                      }}
                      className={cn(
                        "relative aspect-[3/4] rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors overflow-hidden",
                        i === 0
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary hover:bg-primary/5"
                      )}
                    >
                      {photo ? (
                        <>
                          <img
                            src={photo.url}
                            alt={`Photo ${i + 1}`}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              removePhotoAt(i);
                            }}
                            className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                            aria-label="Remove photo"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          {i === 0 && (
                            <span className="absolute bottom-1 left-1 rounded bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
                              Main
                            </span>
                          )}
                        </>
                      ) : (
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
                      )}
                    </div>
                    );
                  })}
                </div>
                <p className="text-sm text-muted-foreground">
                  {isUploadingPhotos
                    ? "Dang tai anh len..."
                    : `${formData.photos.length}/${MAX_PHOTOS} anh`}
                </p>
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
          <Button
            variant="gradient"
            onClick={handleNext}
            className="gap-2"
            disabled={isSaving || isUploadingPhotos}
          >
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
