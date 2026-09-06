import { Server } from 'socket.io';

let io;
const userSockets = new Map(); // Maps userId -> Set of socketIds
const orgSockets = new Map(); // Maps orgId -> Set of socketIds

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // allow all in dev
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    
    // Client should emit 'register' with their userId and orgId
    socket.on('register', ({ userId, organizationId }) => {
      if (userId) {
        if (!userSockets.has(userId)) userSockets.set(userId, new Set());
        userSockets.get(userId).add(socket.id);
        socket.join(`user_${userId}`);
      }
      
      if (organizationId) {
        if (!orgSockets.has(organizationId)) orgSockets.set(organizationId, new Set());
        orgSockets.get(organizationId).add(socket.id);
        socket.join(`org_${organizationId}`);
      }
      
      console.log(`Socket ${socket.id} registered for user ${userId}, org ${organizationId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      // Clean up maps (Socket.io automatically handles leaving rooms)
      for (const [userId, sockets] of userSockets.entries()) {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          if (sockets.size === 0) userSockets.delete(userId);
        }
      }
      for (const [orgId, sockets] of orgSockets.entries()) {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          if (sockets.size === 0) orgSockets.delete(orgId);
        }
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

// Notification sender helper
export const emitNotification = (notification) => {
  if (!io) return;
  
  if (notification.user_id) {
    // Send specifically to this user
    io.to(`user_${notification.user_id}`).emit('notification', notification);
  } else if (notification.organization_id) {
    // Send to everyone in the organization
    io.to(`org_${notification.organization_id}`).emit('notification', notification);
  }
};
