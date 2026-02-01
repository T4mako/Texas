import { defineStore } from 'pinia';
import type { Room, Player } from '../types/game.js';
import { socketService } from '../services/socket.js';

export const useGameStore = defineStore('game', {
  state: () => ({
    room: null as Room | null,
    currentPlayerId: '' as string,
    isConnected: false,
    error: null as string | null,
  }),
  
  getters: {
    isHost: (state) => state.room?.hostId === state.currentPlayerId,
    myPlayer: (state) => state.room?.players.find(p => p.id === state.currentPlayerId),
    activePlayers: (state) => state.room?.players.filter(p => p.isActive) || [],
    isMyTurn: (state) => {
        if (!state.room || !state.room.isGameRunning) return false;
        const currentIdx = state.room.gameState.currentPlayerIndex;
        if (currentIdx === -1) return false;
        const currentPlayer = state.room.players[currentIdx];
        return currentPlayer && currentPlayer.id === state.currentPlayerId;
    }
  },

  actions: {
    initSocket() {
      socketService.connect();
      
      socketService.on('connect', () => {
        this.isConnected = true;
        this.currentPlayerId = socketService.getId() || '';
      });

      socketService.on('disconnect', () => {
        this.isConnected = false;
      });

      socketService.on('gameStateUpdate', (room: Room) => {
        this.room = room;
      });
      
      socketService.on('playerJoined', (players: Player[]) => {
         if (this.room) {
             this.room.players = players;
         }
      });
    },

    joinRoom(nickname: string, roomId: string) {
      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        socketService.emit('joinRoom', { nickname, roomId }, (response) => {
          if (response.success) {
            this.room = response.room;
            this.currentPlayerId = socketService.getId() || ''; // Ensure ID is set
            resolve({ success: true });
          } else {
            this.error = response.error;
            resolve({ success: false, error: response.error });
          }
        });
      });
    },

    startGame(initialChips: number, resetChips: boolean = true) {
      if (!this.room) return;
      socketService.emit('startGame', { roomId: this.room.id, initialChips, resetChips });
    },

    sendReady() {
        if (!this.room) return;
        socketService.emit('playerReady', { roomId: this.room.id });
    },

    sendAction(action: string, amount?: number) {
      if (!this.room) return;
      return new Promise<{ success: boolean; message?: string }>((resolve) => {
        socketService.emit('playerAction', { roomId: this.room.id, action, amount }, (response) => {
           resolve(response);
        });
      });
    }
  }
});
