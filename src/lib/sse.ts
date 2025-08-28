import { prisma } from '@/lib/prisma';

type Client = {
  id: string;
  enqueue: (chunk: Uint8Array) => void;
  close: () => void;
  heartbeat: NodeJS.Timeout;
};

const encoder = new TextEncoder();

// 用户ID -> 客户端集合
const userIdToClients = new Map<string, Map<string, Client>>();

function send(controllerEnqueue: (chunk: Uint8Array) => void, event: string, data: any) {
  const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
  controllerEnqueue(encoder.encode(payload));
}

export const SSE = {
  // 为指定用户创建一个可写入的SSE流，并注册到管理器
  createUserStream(userId: string) {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const clientId = Math.random().toString(36).slice(2);
        const enqueue = (chunk: Uint8Array) => controller.enqueue(chunk);
        const close = () => {
          try { controller.close(); } catch {}
        };
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: keep-alive\n\n`));
          } catch {
            // 若发送失败，移除客户端
            SSE.removeClient(userId, clientId);
          }
        }, 25000);

        const client: Client = { id: clientId, enqueue, close, heartbeat };

        if (!userIdToClients.has(userId)) {
          userIdToClients.set(userId, new Map());
        }
        userIdToClients.get(userId)!.set(clientId, client);

        // 初始欢迎事件
        send(enqueue, 'connected', { userId, clientId, time: Date.now() });
      },
      cancel() {
        // 由 Response 的信号触发取消时，遍历移除（无法获知clientId，只能全清理该进程下的孤儿由GC处理）
      }
    });
    return stream;
  },

  removeClient(userId: string, clientId: string) {
    const clients = userIdToClients.get(userId);
    if (!clients) return;
    const client = clients.get(clientId);
    if (client) {
      clearInterval(client.heartbeat);
      clients.delete(clientId);
    }
    if (clients.size === 0) {
      userIdToClients.delete(userId);
    }
  },

  // 向某个用户广播事件
  sendToUser(userId: string, event: string, data: any) {
    const clients = userIdToClients.get(userId);
    if (!clients) return;
    for (const [, client] of clients) {
      try {
        send(client.enqueue, event, data);
      } catch {
        clearInterval(client.heartbeat);
      }
    }
  },

  // 向多个用户广播事件
  sendToUsers(userIds: string[], event: string, data: any) {
    const uniqueIds = Array.from(new Set(userIds));
    uniqueIds.forEach(userId => SSE.sendToUser(userId, event, data));
  },

  // 向聊天室内所有参与者广播事件
  async sendToChatRoom(roomId: string, event: string, data: any) {
    const participants = await prisma.chatRoomParticipant.findMany({
      where: { chatRoomId: roomId, isActive: true },
      select: { userId: true }
    });
    const userIds = participants.map(p => p.userId);
    SSE.sendToUsers(userIds, event, data);
  }
};


