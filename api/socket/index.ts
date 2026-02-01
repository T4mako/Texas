import { Server, Socket } from 'socket.io';
import { roomManager } from '../game/RoomManager.js';
import { GameEngine } from '../game/GameEngine.js';
import type { Player, PlayerAction } from '../game/types.js';

export function setupSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    // Join Room
    socket.on('joinRoom', ({ nickname, roomId }: { nickname: string; roomId: string }, callback) => {
      try {
        let room = roomManager.getRoom(roomId);
        const player: Player = {
          id: socket.id,
          nickname,
          chips: 0, // Will be set in create/join
          currentBet: 0,
          totalBetInHand: 0,
          cards: [],
          isActive: true,
          isFolded: false,
          isAllIn: false,
          position: 0,
          hasActed: false
        };

        if (!room) {
          // Create room
          // Default initial chips 1000 if not specified (will be set by host later potentially, 
          // but for MVP let's say creation implies default or we ask for it.
          // PRD says host sets it. So maybe creation sets a default and host can update?
          // Or we just use 1000 default.
          room = roomManager.createRoom(roomId, player, 1000);
        } else {
          room = roomManager.joinRoom(roomId, player);
        }

        socket.join(roomId);
        
        // Notify others
        socket.to(roomId).emit('playerJoined', room.players); // Send full list or just new player?
        
        // Callback success
        callback({ 
          success: true, 
          isHost: room.hostId === socket.id,
          room: room 
        });

        // Broadcast full room state update
        io.to(roomId).emit('gameStateUpdate', room);
      } catch (error: any) {
        callback({ success: false, error: error.message });
      }
    });

    // Start Game
    socket.on('startGame', ({ roomId, initialChips }: { roomId: string; initialChips: number }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;
      if (room.hostId !== socket.id) return; // Only host

      room.initialChips = initialChips;
      // Reset chips for all players
      room.players.forEach(p => p.chips = initialChips);
      
      GameEngine.initializeGame(room);
      io.to(roomId).emit('gameStateUpdate', room);
    });

    // Player Action
    socket.on('playerAction', (action: { roomId: string; action: string; amount?: number }, callback) => {
      const room = roomManager.getRoom(action.roomId);
      if (!room) return;

      const playerAction: PlayerAction = {
        playerId: socket.id,
        action: action.action as any,
        amount: action.amount
      };

      const result = GameEngine.processAction(room, playerAction);
      
      if (result.success) {
        io.to(action.roomId).emit('gameStateUpdate', room);
        callback({ success: true });
      } else {
        callback({ success: false, message: result.message });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      const room = roomManager.getRoomByPlayerId(socket.id);
      if (room) {
        roomManager.leaveRoom(socket.id);
        io.to(room.id).emit('gameStateUpdate', room); // Update player list
      }
    });
  });
}
