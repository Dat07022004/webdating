import { useState } from "react";
import { motion } from "framer-motion";
import { Search, ArrowLeft, Phone, Video, MoreVertical, Verified } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const mockConversations = [
  {
    id: "1",
    user: {
      name: "Emma",
      age: 26,
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
      isOnline: true,
      verified: true,
    },
    lastMessage: "I'd love to grab coffee sometime! ☕",
    timestamp: "2 min ago",
    unread: 2,
  },
  {
    id: "2",
    user: {
      name: "Sophia",
      age: 24,
      image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&h=100&fit=crop",
      isOnline: false,
      verified: true,
    },
    lastMessage: "That sounds amazing! Let's do it 🎉",
    timestamp: "1 hour ago",
    unread: 0,
  },
  {
    id: "3",
    user: {
      name: "Olivia",
      age: 28,
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
      isOnline: true,
      verified: false,
    },
    lastMessage: "What are you up to this weekend?",
    timestamp: "3 hours ago",
    unread: 0,
  },
];

const mockMessages: { id: string; message: string; timestamp: string; isOwn: boolean; status?: "sent" | "delivered" | "read" }[] = [
  { id: "1", message: "Hey! I saw we matched. I love your travel photos! 🌍", timestamp: "10:30 AM", isOwn: false },
  { id: "2", message: "Thanks! I just got back from Italy. Have you traveled anywhere recently?", timestamp: "10:32 AM", isOwn: true, status: "read" },
  { id: "3", message: "Not recently, but I'm planning a trip to Japan next spring!", timestamp: "10:35 AM", isOwn: false },
  { id: "4", message: "Japan is on my bucket list too! What cities are you thinking?", timestamp: "10:36 AM", isOwn: true, status: "read" },
  { id: "5", message: "Tokyo and Kyoto for sure. Maybe Osaka too! I'd love to grab coffee and chat more about travel sometime ☕", timestamp: "10:40 AM", isOwn: false },
];

export default function Messages() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState(mockMessages);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedChat = mockConversations.find((c) => c.id === selectedConversation);

  const handleSendMessage = (message: string) => {
    const newMessage = {
      id: Date.now().toString(),
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isOwn: true,
      status: "sent" as const,
    };
    setMessages([...messages, newMessage]);
  };

  return (
    <Layout isAuthenticated>
      <div className="h-[calc(100vh-4rem)] flex">
        {/* Conversations List */}
        <div
          className={cn(
            "w-full md:w-80 lg:w-96 border-r border-border bg-card flex flex-col",
            selectedConversation && "hidden md:flex"
          )}
        >
          {/* Header */}
          <div className="p-4 border-b border-border">
            <h1 className="font-serif text-2xl font-bold text-foreground mb-4">Messages</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {mockConversations.map((conversation) => (
              <motion.button
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation.id)}
                className={cn(
                  "w-full p-4 flex items-start gap-3 hover:bg-secondary/50 transition-colors text-left",
                  selectedConversation === conversation.id && "bg-secondary"
                )}
                whileTap={{ scale: 0.98 }}
              >
                <div className="relative">
                  <img
                    src={conversation.user.image}
                    alt={conversation.user.name}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  {conversation.user.isOnline && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-online border-2 border-card" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-foreground">
                        {conversation.user.name}, {conversation.user.age}
                      </span>
                      {conversation.user.verified && (
                        <Verified className="w-4 h-4 text-blue-500 fill-blue-500" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{conversation.timestamp}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-1">
                    {conversation.lastMessage}
                  </p>
                </div>
                {conversation.unread > 0 && (
                  <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center">
                    <span className="text-[10px] text-primary-foreground font-medium">
                      {conversation.unread}
                    </span>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Chat View */}
        <div
          className={cn(
            "flex-1 flex flex-col bg-background",
            !selectedConversation && "hidden md:flex"
          )}
        >
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border flex items-center justify-between bg-card">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="relative">
                    <img
                      src={selectedChat.user.image}
                      alt={selectedChat.user.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    {selectedChat.user.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-online border-2 border-card" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-foreground">
                        {selectedChat.user.name}
                      </span>
                      {selectedChat.user.verified && (
                        <Verified className="w-4 h-4 text-blue-500 fill-blue-500" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {selectedChat.user.isOnline ? "Online" : "Last seen 2h ago"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon">
                    <Phone className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Video className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    message={msg.message}
                    timestamp={msg.timestamp}
                    isOwn={msg.isOwn}
                    status={msg.status}
                  />
                ))}
              </div>

              {/* Input */}
              <ChatInput onSend={handleSendMessage} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
                  Select a conversation
                </h3>
                <p className="text-sm">Choose from your existing conversations or start a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
