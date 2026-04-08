import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useSocket } from "./useSocket";
import { useQueryClient } from "@tanstack/react-query";

export interface ChatUser {
  _id: string;
  clerkId: string;
  profile: {
    personalInfo: { name: string };
    avatarUrl: string;
  };
  status: { online: boolean; lastSeen: string };
}

export interface Conversation {
  _id: string;
  participants: ChatUser[];
  lastMessage?: Message;
  updatedAt: string;
  unreadCount?: Record<string, number>;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  type: "text" | "image";
  content: string;
  seen: boolean;
  createdAt: string;
}

export const useChat = (activeConversationId?: string | null) => {
  const { getToken, userId: currentClerkId } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const getTokenRef = useRef(getToken);
  const lastLoadedConversationRef = useRef<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const fetchConversations = useCallback(async () => {
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/chat/conversations`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (data.success) {
        setConversations(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchMessages = useCallback(async (conversationId: string) => {
    setIsLoading(true);
    try {
      const token = await getTokenRef.current();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/chat/conversations/${conversationId}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const markAsSeen = useCallback(
    async (conversationId: string) => {
      try {
        const token = await getTokenRef.current();
        if (!token) return;
        await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/chat/conversations/${conversationId}/seen`,
          {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        // Invalidate the unread counts after marking as seen
        queryClient.invalidateQueries({ queryKey: ["unread-counts"] });
      } catch (e) {
        console.error("markAsSeen error:", e);
      }
    },
    [queryClient],
  );

  useEffect(() => {
    if (activeConversationId) {
      if (lastLoadedConversationRef.current !== activeConversationId) {
        lastLoadedConversationRef.current = activeConversationId;
        fetchMessages(activeConversationId);
        markAsSeen(activeConversationId);
      }
      if (socket) {
        socket.emit("join_conversation", activeConversationId);
      }
      return () => {
        if (socket) {
          socket.emit("leave_conversation", activeConversationId);
        }
      };
    } else {
      lastLoadedConversationRef.current = null;
      setMessages([]);
    }
  }, [activeConversationId, fetchMessages, markAsSeen, socket]);

  useEffect(() => {
    if (!socket) return;

    const rejoinActiveConversation = () => {
      if (activeConversationId) {
        socket.emit("join_conversation", activeConversationId);
      }
    };

    socket.on("connect", rejoinActiveConversation);
    if (socket.connected) {
      rejoinActiveConversation();
    }

    const handleReceiveMessage = (message: Message) => {
      // Add message if it belongs to the current conversation
      if (message.conversationId === activeConversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
        // Also emit seen event immediately if we are viewing it
        socket.emit("mark_as_seen", {
          messageIds: [message._id],
          conversationId: activeConversationId,
        });
        // Since we are viewing it, also trigger the backend seen API to be sure
        markAsSeen(activeConversationId);
      } else {
        // If it's for another conversation, invalidate the counts only
        queryClient.invalidateQueries({ queryKey: ["unread-counts"] });
      }

      // Update last message in the conversations list
      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv._id === message.conversationId) {
            return {
              ...conv,
              lastMessage: message,
              updatedAt: message.createdAt,
            };
          }
          return conv;
        });
        return updated.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
      });
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("new_message_alert", handleReceiveMessage);

    const handleMessagesSeen = ({
      messageIds,
    }: {
      messageIds: string[];
      conversationId: string;
    }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          messageIds.includes(msg._id) ? { ...msg, seen: true } : msg,
        ),
      );
    };

    socket.on("messages_seen", handleMessagesSeen);

    return () => {
      socket.off("connect", rejoinActiveConversation);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("new_message_alert", handleReceiveMessage);
      socket.off("messages_seen", handleMessagesSeen);
    };
  }, [socket, activeConversationId, markAsSeen, queryClient]);

  const sendMessage = useCallback(
    (receiverId: string, content: string, type: "text" | "image" = "text") => {
      if (!socket || !activeConversationId) return;

      socket.emit(
        "send_message",
        {
          conversationId: activeConversationId,
          receiverId,
          content,
          type,
        },
        (res: any) => {
          if (res.status === "success") {
            const message = res.message as Message;
            setMessages((prev) => {
              if (prev.some((m) => m._id === message._id)) return prev;
              return [...prev, message];
            });
            setConversations((prev) => {
              const updated = prev.map((conv) => {
                if (conv._id === message.conversationId) {
                  return {
                    ...conv,
                    lastMessage: message,
                    updatedAt: message.createdAt,
                  };
                }
                return conv;
              });
              return updated.sort(
                (a, b) =>
                  new Date(b.updatedAt).getTime() -
                  new Date(a.updatedAt).getTime(),
              );
            });
          } else {
            console.error("Failed to send message:", res.error);
          }
        },
      );
    },
    [socket, activeConversationId],
  );

  return {
    conversations,
    messages,
    isLoading,
    sendMessage,
    fetchConversations,
    currentClerkId,
  };
};
