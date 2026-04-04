import { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  ArrowLeft,
  Video,
  MoreVertical,
  Verified,
  Trash2,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useChat, ChatUser, Conversation } from "@/hooks/useChat";
import { useWebRTC } from "@/hooks/useWebRTC";
import { VideoCallModal } from "@/components/chat/VideoCallModal";
import { format } from "date-fns";

export default function Messages() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initConvId = searchParams.get("conversationId");

  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(initConvId);

  // If we change the selected conversation manually, we should ideally drop the URL param or just leave it,
  // but let's keep it simple. If initConvId changes from URL, we could sync it:
  useEffect(() => {
    if (initConvId) {
      setSelectedConversation(initConvId);
    }
  }, [initConvId]);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    messages,
    sendMessage,
    deleteConversation,
    currentClerkId,
  } = useChat(selectedConversation);

  const selectedChat = conversations.find(
    (c) => c._id === selectedConversation,
  );

  const getOtherUser = (conv: Conversation): ChatUser | undefined => {
    return conv.participants.find((p) => p.clerkId !== currentClerkId);
  };

  const currentUserId = selectedChat?.participants.find(
    (p) => p.clerkId === currentClerkId,
  )?._id;

  const {
    callState,
    incomingCallerId,
    localVideoRef,
    remoteVideoRef,
    startCall,
    answerCall,
    rejectCall,
    endCall,
  } = useWebRTC();

  const handleVideoCall = () => {
    if (!selectedChat) return;
    const otherUser = getOtherUser(selectedChat);
    if (!otherUser) return;
    startCall(otherUser._id);
  };

  const handleDeleteConversation = async () => {
    if (!selectedChat) return;

    const ok = window.confirm(
      "Xóa cuộc trò chuyện này vĩnh viễn? Hành động này sẽ xóa toàn bộ tin nhắn và không thể hoàn tác.",
    );
    if (!ok) return;

    const success = await deleteConversation(selectedChat._id);
    if (!success) {
      window.alert("Xóa cuộc trò chuyện thất bại. Vui lòng thử lại.");
      return;
    }

    setSelectedConversation(null);
    navigate("/messages");
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = (
    message: string,
    type: "text" | "image" = "text",
  ) => {
    if (!selectedChat) return;
    const otherUser = getOtherUser(selectedChat);
    if (!otherUser) return;

    sendMessage(otherUser._id, message, type);
  };

  const filteredConversations = conversations.filter((conv) => {
    const other = getOtherUser(conv);
    if (!other) return false;
    return other.profile.personalInfo.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
  });

  const incomingCallerProfile = conversations
    .flatMap((conv) => conv.participants)
    .find((participant) => participant._id === incomingCallerId);

  const modalCallerName =
    callState === "receiving"
      ? incomingCallerProfile?.profile.personalInfo.name || "Incoming call"
      : selectedChat
        ? getOtherUser(selectedChat)?.profile.personalInfo.name
        : "User";

  const modalCallerImage =
    callState === "receiving"
      ? incomingCallerProfile?.profile.avatarUrl
      : selectedChat
        ? getOtherUser(selectedChat)?.profile.avatarUrl
        : undefined;

  return (
    <Layout isAuthenticated>
      <div className="h-[calc(100vh-4rem)] flex">
        {/* Conversations List */}
        <div
          className={cn(
            "w-full md:w-80 lg:w-96 border-r border-border bg-card flex flex-col",
            selectedConversation && "hidden md:flex",
          )}
        >
          {/* Header */}
          <div className="p-4 border-b border-border">
            <h1 className="font-serif text-2xl font-bold text-foreground mb-4">
              Messages
            </h1>
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
            {filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No conversations found.
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const otherUser = getOtherUser(conversation);
                if (!otherUser) return null;
                const lastMsgTime = conversation.updatedAt
                  ? new Date(conversation.updatedAt)
                  : new Date();

                return (
                  <motion.button
                    key={conversation._id}
                    onClick={() => {
                      setSelectedConversation(conversation._id);
                      navigate(`/messages?conversationId=${conversation._id}`);
                    }}
                    className={cn(
                      "w-full p-4 flex items-start gap-3 hover:bg-secondary/50 transition-colors text-left",
                      selectedConversation === conversation._id &&
                        "bg-secondary",
                    )}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="relative">
                      <img
                        src={
                          otherUser.profile.avatarUrl ||
                          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
                        }
                        alt={otherUser.profile.personalInfo.name}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                      {otherUser.status?.online && (
                        <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-online border-2 border-card" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-foreground">
                            {otherUser.profile.personalInfo.name}
                          </span>
                          {/* Fake verified tag for now */}
                          <Verified className="w-4 h-4 text-blue-500 fill-blue-500" />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(lastMsgTime, "HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {conversation.lastMessage
                          ? conversation.lastMessage.type === "text"
                            ? conversation.lastMessage.content
                            : "Sent an image"
                          : "No messages yet"}
                      </p>
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat View */}
        <div
          className={cn(
            "flex-1 flex flex-col bg-background",
            !selectedConversation && "hidden md:flex",
          )}
        >
          {selectedChat ? (
            <>
              {/* Chat Header */}
              {(() => {
                const otherUser = getOtherUser(selectedChat);
                if (!otherUser) return null;
                return (
                  <div className="p-4 border-b border-border flex items-center justify-between bg-card">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => {
                          setSelectedConversation(null);
                          navigate("/messages");
                        }}
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </Button>
                      <div className="relative">
                        <img
                          src={
                            otherUser.profile.avatarUrl ||
                            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
                          }
                          alt={otherUser.profile.personalInfo.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        {otherUser.status?.online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-online border-2 border-card" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-foreground">
                            {otherUser.profile.personalInfo.name}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {otherUser.status?.online ? "Online" : "Offline"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleVideoCall}
                      >
                        <Video className="w-5 h-5" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-5 h-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => {
                              void handleDeleteConversation();
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Conversation
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })()}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <ChatBubble
                    key={msg._id}
                    message={msg.type === "text" ? msg.content : ""}
                    timestamp={format(new Date(msg.createdAt), "HH:mm")}
                    isOwn={msg.senderId === currentUserId}
                    status={msg.seen ? "read" : "sent"}
                    image={msg.type === "image" ? msg.content : undefined}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <ChatInput
                onSend={handleSendMessage}
                onVideoCall={handleVideoCall}
              />
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
                <p className="text-sm">
                  Choose from your existing conversations or start a new one
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <VideoCallModal
        callState={callState}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        onEndCall={endCall}
        onRejectCall={rejectCall}
        onAnswerCall={answerCall}
        callerName={modalCallerName}
        callerImage={modalCallerImage}
      />
    </Layout>
  );
}
