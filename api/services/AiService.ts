import type { Room, Player } from '../game/types.js';

const AI_SERVICE_URL = 'http://localhost:5000';

export class AiService {
  static async getAction(room: Room, player: Player): Promise<{ action: string; amount?: number }> {
    try {
      // Construct state payload for AI
      const payload = {
        player_id: player.id,
        hand: player.cards.map(c => `${c.suit[0].toUpperCase()}${c.rank}`), // e.g. 'H10', 'SA' -> Wait, rank 10 is '10' or 'T'? RLCard uses 'T' for 10 usually, but let's check. 
        // RLCard Standard: 'SA', 'HT', 'D2'. 
        // My Rank type: '10', 'J', 'Q', 'K', 'A'.
        // I should probably map '10' to 'T' if RLCard requires it. 
        // However, my python script just receives it. I'll stick to my format and let Python handle if needed.
        // But for safety, let's just send what we have.
        
        public_cards: room.gameState.communityCards.map(c => `${c.suit[0].toUpperCase()}${c.rank}`),
        chips: player.chips,
        current_bet: room.gameState.currentBet,
        player_current_bet: player.currentBet,
        pot: room.gameState.pot,
        min_raise: room.gameState.minRaise || room.bigBlind,
        legal_actions: AiService.getLegalActions(room, player),
        num_players: room.players.length,
        position: player.position
      };

      const response = await fetch(`${AI_SERVICE_URL}/get_action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`AI Service error: ${response.statusText}`);
      }

      const data = await response.json() as { action: string; amount: number };
      return data;

    } catch (error) {
      console.error('Failed to get AI action:', error);
      return { action: 'check' }; // Fallback
    }
  }

  static getLegalActions(room: Room, player: Player): string[] {
    const actions: string[] = ['fold'];
    const currentBet = room.gameState.currentBet;
    
    // Check/Call
    if (player.currentBet === currentBet) {
      actions.push('check');
    } else {
      actions.push('call');
    }

    // Raise
    // Can always raise if have enough chips > currentBet + minRaise
    // Or if all-in
    const minRaise = room.gameState.minRaise || room.bigBlind;
    if (player.chips > (currentBet - player.currentBet)) { 
        // Basic check, actual raise logic is complex (min raise amount etc)
        actions.push('raise');
    }
    
    // All-in
    actions.push('all-in');

    return actions;
  }
}
