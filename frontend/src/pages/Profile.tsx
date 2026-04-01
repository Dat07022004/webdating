import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Camera,
  MapPin,
  Verified,
  Edit3,
  LogOut,
  Shield,
  Bell,
  HelpCircle,
  ChevronRight,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { UserButton, useClerk, useUser, useAuth } from "@clerk/clerk-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type ProfilePhoto = {
  url: string;
  publicId?: string;
  isPrimary?: boolean;
};

const MAX_PROFILE_PHOTOS = 6;

type ProfileData = {
  name: string;
  phone: string;
  age: number | null;
  birthday: string | null;
  gender: string;
  location: string;
  bio: string;
  interests: string[];
  photos: ProfilePhoto[];
  verified: {
    email: boolean;
    phone: boolean;
    photo: boolean;
  };
  completionPercent: number;
};

const emptyProfile: ProfileData = {
  name: "",
  phone: "",
  age: null,
  birthday: null,
  gender: "",
  location: "",
  bio: "",
  interests: [],
  photos: [],
  verified: {
    email: false,
    phone: false,
    photo: false,
  },
  completionPercent: 0,
};

const menuItems = [
  { icon: Edit3, label: "Edit Profile", href: "#" },
  { icon: Settings, label: "Account Settings", href: "#" },
  { icon: Bell, label: "Notifications", href: "/notifications" },
  { icon: Shield, label: "Privacy & Safety", href: "#" },
  { icon: HelpCircle, label: "Help & Support", href: "#" },
];

const genderOptions = ["Man", "Woman", "Other"];

export default function Profile() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const clerk = useClerk();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [draft, setDraft] = useState<ProfileData>(emptyProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [newInterest, setNewInterest] = useState("");
  const [premiumPlan, setPremiumPlan] = useState<{ plan: string; expiresAt: string | null; isActive: boolean } | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);

  const activeProfile = isEditing ? draft : profile;

  const coverPhoto = useMemo(() => {
    if (activeProfile.photos.length > 0) {
      return activeProfile.photos[0].url;
    }

    return "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=300&h=400&fit=crop";
  }, [activeProfile.photos]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const loadProfile = async () => {
      setIsLoading(true);

      try {
        const query = new URLSearchParams();
        if (user?.id) {
          query.set("clerkId", user.id);
        }
        const email = user?.primaryEmailAddress?.emailAddress;
        if (email) {
          query.set("email", email);
        }

        const response = await fetch(`/api/users/me?${query.toString()}`);
        const data = (await response.json().catch(() => ({}))) as {
          message?: string;
          profile?: ProfileData;
        };

        if (!response.ok || !data.profile) {
          throw new Error(data.message || "Khong the tai profile");
        }

        const nextProfile = {
          ...emptyProfile,
          ...data.profile,
          interests: Array.isArray(data.profile.interests) ? data.profile.interests : [],
          photos: Array.isArray(data.profile.photos) ? data.profile.photos : [],
          verified: {
            ...emptyProfile.verified,
            ...(data.profile.verified || {}),
          },
        };

        setProfile(nextProfile);
        setDraft(nextProfile);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Khong the tai profile";
        toast({
          title: "Tai profile that bai",
          description: message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, [isLoaded, toast, user?.id, user?.primaryEmailAddress?.emailAddress]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const loadPlan = async () => {
      setIsLoadingPlan(true);

      try {
        const token = await getToken();
        if (!token) return;

        const baseUrl = import.meta.env.VITE_API_URL
          ? import.meta.env.VITE_API_URL.replace(/\/$/, "")
          : "http://localhost:3000";

        const response = await fetch(`${baseUrl}/api/premium/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await response.json().catch(() => ({}))) as {
          plan?: string;
          expiresAt?: string | null;
          isActive?: boolean;
        };

        if (response.ok) {
          setPremiumPlan({
            plan: data.plan || "none",
            expiresAt: data.expiresAt || null,
            isActive: Boolean(data.isActive),
          });
        }
      } finally {
        setIsLoadingPlan(false);
      }
    };

    void loadPlan();
  }, [getToken, isLoaded]);

  const formatPlanLabel = (plan: string) => {
    if (plan === "platinum") return "Platinum";
    if (plan === "gold") return "Gold";
    return "Basic";
  };

  const formatDate = (value: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("vi-VN", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  const addInterest = () => {
    const value = newInterest.trim();
    if (!value) {
      return;
    }

    if (draft.interests.includes(value)) {
      setNewInterest("");
      return;
    }

    setDraft((prev) => ({
      ...prev,
      interests: [...prev.interests, value],
    }));
    setNewInterest("");
  };

  const removeInterest = (interest: string) => {
    setDraft((prev) => ({
      ...prev,
      interests: prev.interests.filter((item) => item !== interest),
    }));
  };

  const cancelEdit = () => {
    setDraft(profile);
    setIsEditing(false);
    setNewInterest("");
  };

  const openPhotoPicker = () => {
    if (!isEditing || isUploadingPhotos) {
      return;
    }

    fileInputRef.current?.click();
  };

  const setPrimaryPhoto = (index: number) => {
    setDraft((prev) => {
      if (index < 0 || index >= prev.photos.length) {
        return prev;
      }

      const nextPhotos = prev.photos.map((photo, photoIndex) => ({
        ...photo,
        isPrimary: photoIndex === index,
      }));
      const selected = nextPhotos[index];
      const remaining = nextPhotos.filter((_, photoIndex) => photoIndex !== index);

      return {
        ...prev,
        photos: [selected, ...remaining],
      };
    });
  };

  const removePhoto = (index: number) => {
    setDraft((prev) => {
      const remaining = prev.photos.filter((_, photoIndex) => photoIndex !== index);
      if (remaining.length > 0) {
        remaining[0] = { ...remaining[0], isPrimary: true };
        for (let i = 1; i < remaining.length; i += 1) {
          remaining[i] = { ...remaining[i], isPrimary: false };
        }
      }

      return {
        ...prev,
        photos: remaining,
      };
    });
  };

  const handlePhotoInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";

    if (selectedFiles.length === 0 || !isEditing) {
      return;
    }

    const remainingSlots = MAX_PROFILE_PHOTOS - draft.photos.length;
    if (remainingSlots <= 0) {
      toast({
        title: "Toi da 6 anh",
        description: "Ban da dat gioi han anh profile.",
        variant: "destructive",
      });
      return;
    }

    const filesToUpload = selectedFiles.slice(0, remainingSlots);

    try {
      setIsUploadingPhotos(true);
      const body = new FormData();
      body.append("clerkId", user?.id || "");
      filesToUpload.forEach((file) => body.append("photos", file));

      const response = await fetch("/api/users/photos/upload", {
        method: "POST",
        body,
      });

      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
        photos?: ProfilePhoto[];
      };

      if (!response.ok || !Array.isArray(data.photos)) {
        throw new Error(data.message || "Tai anh that bai");
      }

      setDraft((prev) => {
        const mergedPhotos = [...prev.photos, ...data.photos].slice(0, MAX_PROFILE_PHOTOS);
        if (mergedPhotos.length > 0) {
          mergedPhotos[0] = { ...mergedPhotos[0], isPrimary: true };
          for (let i = 1; i < mergedPhotos.length; i += 1) {
            mergedPhotos[i] = { ...mergedPhotos[i], isPrimary: false };
          }
        }

        return {
          ...prev,
          photos: mergedPhotos,
        };
      });

      toast({ title: "Tai anh thanh cong" });
    } catch (error) {
      toast({
        title: "Tai anh that bai",
        description: error instanceof Error ? error.message : "Vui long thu lai",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const saveProfile = async () => {
    setIsSaving(true);

    try {
      const response = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user?.id || "",
          email: user?.primaryEmailAddress?.emailAddress || "",
          name: draft.name,
          birthday: draft.birthday,
          gender: draft.gender,
          phone: draft.phone,
          location: draft.location,
          bio: draft.bio,
          interests: draft.interests,
          photos: draft.photos,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
        profile?: ProfileData;
      };

      if (!response.ok || !data.profile) {
        throw new Error(data.message || "Cap nhat profile that bai");
      }

      const nextProfile = {
        ...emptyProfile,
        ...data.profile,
        interests: Array.isArray(data.profile.interests) ? data.profile.interests : [],
        photos: Array.isArray(data.profile.photos) ? data.profile.photos : [],
        verified: {
          ...emptyProfile.verified,
          ...(data.profile.verified || {}),
        },
      };

      setProfile(nextProfile);
      setDraft(nextProfile);
      setIsEditing(false);
      toast({ title: "Da cap nhat profile" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cap nhat profile that bai";
      toast({
        title: "Luu thay doi that bai",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await clerk.signOut({ redirectUrl: "/login" });
  };

  const handleVerifyNow = (type: keyof ProfileData["verified"]) => {
    if (type === "phone") {
      setIsEditing(true);
      window.setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 0);
      toast({
        title: "Them so dien thoai de xac minh",
        description: "Nhap so dien thoai roi bam Save changes.",
      });
      return;
    }

    if (type === "photo") {
      setIsEditing(true);
      window.setTimeout(() => {
        fileInputRef.current?.click();
      }, 0);
      toast({
        title: "Them anh de xac minh",
        description: "Tai len it nhat 1 anh roi bam Save changes.",
      });
      return;
    }

    toast({
      title: "Email verification",
      description: "Email duoc quan ly boi Clerk account.",
    });
  };

  return (
    <Layout isAuthenticated>
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-3xl shadow-card p-6 mb-6"
          >
            {isLoading && (
              <p className="text-center text-sm text-muted-foreground mb-4">Dang tai profile...</p>
            )}

            {/* Main Photo */}
            <div className="relative w-32 h-32 mx-auto mb-4">
              <img
                src={coverPhoto}
                alt={profile.name || "Profile photo"}
                className="w-full h-full rounded-full object-cover ring-4 ring-coral-light"
              />
              <button
                type="button"
                onClick={openPhotoPicker}
                disabled={!isEditing || isUploadingPhotos}
                className="absolute bottom-0 right-0 w-10 h-10 rounded-full gradient-primary flex items-center justify-center shadow-md disabled:opacity-60"
              >
                <Camera className="w-5 h-5 text-primary-foreground" />
              </button>
            </div>

            {/* Name & Info */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2">
                {isEditing ? (
                  <div className="w-full space-y-3 max-w-md">
                    <Input
                      value={draft.name}
                      onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Ten hien thi"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={draft.birthday || ""}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            birthday: e.target.value || null,
                          }))
                        }
                      />
                      <Input
                        ref={phoneInputRef}
                        value={draft.phone}
                        onChange={(e) => setDraft((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="So dien thoai"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {genderOptions.map((option) => (
                        <Button
                          key={option}
                          type="button"
                          variant={draft.gender === option ? "gradient" : "outline"}
                          onClick={() => setDraft((prev) => ({ ...prev, gender: option }))}
                          className="h-10"
                        >
                          {option}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <h1 className="font-serif text-2xl font-bold text-foreground flex items-center gap-2">
                    
                    <span>
                      {profile.name}
                      {profile.age !== null ? `, ${profile.age}` : ""}
                    </span>
                  </h1>
                )}
                {profile.verified.email && (
                  <Verified className="w-5 h-5 text-blue-500 fill-blue-500" />
                )}
              </div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground mt-1">
                <MapPin className="w-4 h-4" />
                {isEditing ? (
                  <Input
                    value={draft.location}
                    onChange={(e) => setDraft((prev) => ({ ...prev, location: e.target.value }))}
                    placeholder="Thanh pho"
                    className="h-8"
                  />
                ) : (
                  <span>{profile.location || "Chua cap nhat vi tri"}</span>
                )}
              </div>
              {!isEditing && (
                <div className="text-sm text-muted-foreground mt-1 space-y-1">
                  <p>{profile.gender || "Chua cap nhat gioi tinh"}</p>
                  <p>{profile.phone || "Chua cap nhat so dien thoai"}</p>
                </div>
              )}
            </div>

            {/* Profile Completion */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Profile completion</span>
                <span className="font-medium text-foreground">{profile.completionPercent}%</span>
              </div>
              <Progress value={profile.completionPercent} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                Complete your profile to get more matches!
              </p>
            </div>

            {/* Premium Status */}
            <div className="mb-6 rounded-2xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current plan</p>
                  <p className="text-lg font-semibold text-foreground">
                    {isLoadingPlan ? "Loading..." : formatPlanLabel(premiumPlan?.plan || "none")}
                  </p>
                  {!isLoadingPlan && premiumPlan?.isActive && premiumPlan?.expiresAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Expires on {formatDate(premiumPlan.expiresAt)}
                    </p>
                  )}
                </div>
                <Badge className={premiumPlan?.isActive ? "gradient-primary border-0" : "bg-slate-200 text-slate-700 border-0"}>
                  {premiumPlan?.isActive ? "Premium Active" : "Basic"}
                </Badge>
              </div>
            </div>

            {/* Photo Gallery */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoInputChange}
            />
            <div className="grid grid-cols-3 gap-2 mb-6">
              {activeProfile.photos.map((photo, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] rounded-xl overflow-hidden relative group"
                >
                  <img
                    src={photo.url}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {isEditing && (
                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPrimaryPhoto(i)}
                        title="Dat lam anh chinh"
                      >
                        <Star className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removePhoto(i)}
                        title="Xoa anh"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {activeProfile.photos.length < MAX_PROFILE_PHOTOS && (
                <button
                  type="button"
                  onClick={openPhotoPicker}
                  disabled={!isEditing || isUploadingPhotos}
                  className="aspect-[3/4] rounded-xl border-2 border-dashed border-border flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-60"
                >
                  {isUploadingPhotos ? (
                    <span className="text-xs text-muted-foreground">Uploading...</span>
                  ) : (
                    <Plus className="w-6 h-6 text-muted-foreground" />
                  )}
                </button>
              )}
            </div>

            {/* Bio */}
            <div className="mb-6">
              <h3 className="font-medium text-foreground mb-2">About me</h3>
              {isEditing ? (
                <Textarea
                  value={draft.bio}
                  onChange={(e) => setDraft((prev) => ({ ...prev, bio: e.target.value }))}
                  rows={4}
                />
              ) : (
                <p className="text-muted-foreground text-sm">{profile.bio || "Chua them gioi thieu."}</p>
              )}
            </div>

            {/* Interests */}
            <div>
              <h3 className="font-medium text-foreground mb-2">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {(isEditing ? draft.interests : profile.interests).map((interest) => (
                  <Badge
                    key={interest}
                    variant="secondary"
                    className="rounded-full cursor-pointer"
                    onClick={() => isEditing && removeInterest(interest)}
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
              {isEditing && (
                <div className="flex gap-2 mt-3">
                  <Input
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    placeholder="Them so thich"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addInterest();
                      }
                    }}
                  />
                  <Button onClick={addInterest} type="button">Add</Button>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-2 justify-end">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={cancelEdit} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button onClick={saveProfile} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save changes"}
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>
                  Edit profile
                </Button>
              )}
              </div>
          </motion.div>

          {/* Verification Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-3xl shadow-card p-6 mb-6"
          >
            <h2 className="font-serif text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Verification
            </h2>
            <div className="space-y-3">
              {(Object.entries(profile.verified) as Array<[keyof ProfileData["verified"], boolean]>).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="capitalize text-foreground">{key} Verified</span>
                  {value ? (
                    <Badge className="gradient-primary border-0">Verified</Badge>
                  ) : (
                    <Button variant="soft" size="sm" onClick={() => handleVerifyNow(key)}>
                      Verify Now
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Menu */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-3xl shadow-card overflow-hidden mb-6"
          >
            {menuItems.map((item, i) => (
              <div key={item.label}>
                <button className="w-full p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors">
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="flex-1 text-left text-foreground">{item.label}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
                {i < menuItems.length - 1 && <Separator />}
              </div>
            ))}
          </motion.div>

          {/* Logout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              variant="outline"
              className="w-full gap-2 text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
              Log Out
            </Button>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
