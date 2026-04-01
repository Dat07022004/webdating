import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useSocket } from '../hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';

export const SocketNotificationListener = () => {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    // Lắng nghe sự kiện match mới
    socket.on('new_match', (data: { matchWith: string, userId: string, connectionId: string }) => {
      toast.success(`Bạn đã tương hợp với ${data.matchWith}!`, {
        description: 'Nhấn để xem danh sách tương hợp ngay.',
        action: {
          label: 'Xem ngay',
          onClick: () => navigate('/matches')
        },
        duration: 5000,
      });
    });

    // Lắng nghe sự kiện tin nhắn mới (khi không ở trong phòng chat đó)
    socket.on('new_message_alert', (data: { senderName: string, conversationId: string }) => {
      // Chỉ hiển thị thông báo nếu không đang ở trang chat của chính conversation đó
      // (Hoặc đơn giản là hiện thông báo "Bạn có tin nhắn mới")
      const currentPath = window.location.pathname;
      const isSystemMessage = data.senderName === 'System';

      if (!currentPath.includes(`/messages`)) {
        toast.info(`Bạn có tin nhắn mới từ ${data.senderName}`, {
          description: isSystemMessage ? '' : 'Nhấn để trả lời ngay.',
          action: {
            label: 'Xem',
            onClick: () => navigate('/messages')
          },
          duration: 4000,
        });
      }
      // Khởi động lại query đếm thông báo
      queryClient.invalidateQueries({ queryKey: ["unread-counts"] });
    });

    // Lắng nghe thông báo chung (Like, v.v.)
    socket.on('new_notification', (data: { type: string, title?: string, message?: string }) => {
      // Invalidate counts immediately
      queryClient.invalidateQueries({ queryKey: ["unread-counts"] });

      // Nếu là thông báo Like (Ẩn danh)
      if (data.type === 'like') {
        toast.message(data.title || 'Thông báo mới', {
          description: data.message || 'Có người vừa quan tâm tới bạn.',
          action: {
            label: 'Xem',
            onClick: () => navigate('/notifications')
          },
          duration: 4000
        });
      }
    });

    return () => {
      socket.off('new_match');
      socket.off('new_message_alert');
      socket.off('new_notification');
    };
  }, [socket, navigate]);

  return null; // Component này không render gì ra UI ngoài logic xử lý toast
};
