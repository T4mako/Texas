import type { Room, Player, GameState } from './types.js';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private playerRoomMap: Map<string, string> = new Map(); // socketId -> roomId

  createRoom(roomId: string, hostPlayer: Player, initialChips: number): Room {
    if (this.rooms.has(roomId)) {
      throw new Error('Room already exists');
    }

    const room: Room = {
      id: roomId,
      hostId: hostPlayer.id,
      players: [hostPlayer],
      maxPlayers: 10,
      gameState: {
        status: 'waiting',
        currentPlayerIndex: -1,
        dealerIndex: 0,
        smallBlindIndex: -1,
        bigBlindIndex: -1,
        pot: 0,
        currentBet: 0,
        minRaise: 0,
        communityCards: [],
        deck: [],
        bettingRound: 0,
        winners: []
      },
      smallBlind: 10, // Default, can be configurable
      bigBlind: 20,
      initialChips: initialChips,
      isGameRunning: false
    };

    this.rooms.set(roomId, room);
    this.playerRoomMap.set(hostPlayer.id, roomId);
    return room;
  }

  joinRoom(roomId: string, player: Player): Room {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    if (room.players.length >= room.maxPlayers) {
      throw new Error('Room is full');
    }
    if (room.isGameRunning) {
        // Can join as spectator or waiting for next hand? 
        // For MVP, allow join but set as inactive until next game.
        player.isActive = false;
        player.chips = room.initialChips; // Or 0? Usually buy-in.
    } else {
        player.chips = room.initialChips;
    }

    // Assign position
    player.position = room.players.length;
    room.players.push(player);
    this.playerRoomMap.set(player.id, roomId);
    return room;
  }

  leaveRoom(playerId: string): Room | null {
    const roomId = this.playerRoomMap.get(playerId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.players = room.players.filter(p => p.id !== playerId);
    this.playerRoomMap.delete(playerId);

    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      return null;
    }

    // If host leaves, assign new host
    if (room.hostId === playerId) {
      room.hostId = room.players[0].id;
    }

    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByPlayerId(playerId: string): Room | undefined {
    const roomId = this.playerRoomMap.get(playerId);
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }
}

export const roomManager = new RoomManager();
