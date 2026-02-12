import { Server, Socket } from 'socket.io';
import { roomManager } from '../game/RoomManager.js';
import { GameEngine } from '../game/GameEngine.js';
import { AiService } from '../services/AiService.js';
import type { Player, PlayerAction } from '../game/types.js';

async function handleAiTurn(io: Server, roomId: string) {
  const room = roomManager.getRoom(roomId);
  if (!room || !room.isGameRunning || room.gameState.status === 'finished') return;

  const currentPlayer = room.players[room.gameState.currentPlayerIndex];
  if (currentPlayer && currentPlayer.isAi && currentPlayer.isActive && !currentPlayer.isAllIn) {
    // Delay for realism
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Re-check state after delay
    if (room.gameState.status === 'finished') return;
    const currentP = room.players[room.gameState.currentPlayerIndex];
    if (currentP.id !== currentPlayer.id) return; // Turn changed somehow

    try {
      const { action, amount } = await AiService.getAction(room, currentPlayer);
      
      const playerAction: PlayerAction = {
        playerId: currentPlayer.id,
        action: action as any,
        amount: amount
      };

      const result = GameEngine.processAction(room, playerAction);
      if (result.success) {
        io.to(roomId).emit('gameStateUpdate', room);
        // Recursively check next player
        handleAiTurn(io, roomId);
      } else {
        console.error("AI Action failed:", result.message);
        // Fallback to check/fold to avoid stuck loop
        const fallbackAction: PlayerAction = {
             playerId: currentPlayer.id,
             action: 'fold'
        };
        GameEngine.processAction(room, fallbackAction);
        io.to(roomId).emit('gameStateUpdate', room);
        handleAiTurn(io, roomId);
      }
    } catch (e) {
      console.error("AI Error", e);
    }
  }
}

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
          isReady: false,
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

    // Add AI
    socket.on('addAi', ({ roomId }, callback) => {
        const room = roomManager.getRoom(roomId);
        if (!room) return callback({ success: false, message: 'Room not found' });
        if (room.hostId !== socket.id) return callback({ success: false, message: 'Only host can add AI' });
        
        try {
            roomManager.addAiPlayer(roomId);
            io.to(roomId).emit('gameStateUpdate', room);
            callback({ success: true });
        } catch (e: any) {
            callback({ success: false, message: e.message });
        }
    });

    // Start Game
    socket.on('startGame', ({ roomId, initialChips, resetChips }: { roomId: string; initialChips: number, resetChips?: boolean }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;
      if (room.hostId !== socket.id) return; // Only host

      room.initialChips = initialChips;
      // Reset chips for all players if requested (default true)
      if (resetChips !== false) {
          room.players.forEach(p => p.chips = initialChips);
      }
      
      GameEngine.initializeGame(room);
      io.to(roomId).emit('gameStateUpdate', room);
      handleAiTurn(io, roomId);
    });

    // Player Ready (Next Round)
    socket.on('playerReady', ({ roomId }: { roomId: string }) => {
        const room = roomManager.getRoom(roomId);
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        player.isReady = true;

        // Ensure all AI players are ready
        room.players.forEach(p => {
            if (p.isAi) {
                p.isReady = true;
            }
        });

        // Check if all players are ready
        const allReady = room.players.every(p => p.isReady);
        if (allReady && room.players.length >= 2) {
            // Start next hand without resetting chips
            room.players.forEach(p => p.isReady = false);
            GameEngine.initializeGame(room);
            // Reset ready status is done inside initializeGame or here?
            // Better here or GameEngine. Let's do it in GameEngine to be safe, 
            // but for now we can rely on GameEngine not using isReady logic except for start.
            // Actually, we should reset isReady to false after start.
            // room.players.forEach(p => p.isReady = false);
        }
        
        io.to(roomId).emit('gameStateUpdate', room);
        if (allReady && room.players.length >= 2) {
             handleAiTurn(io, roomId);
        }
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
        handleAiTurn(io, action.roomId);
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
