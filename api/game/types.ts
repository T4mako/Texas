export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface Player {
  id: string; // Socket ID
  nickname: string;
  chips: number;
  currentBet: number; // Bet in the current round (street)
  totalBetInHand: number; // Total bet in this hand
  cards: Card[];
  isActive: boolean; // True if in the hand (not folded)
  isFolded: boolean;
  isAllIn: boolean;
  isReady: boolean; // True if ready for next hand
  position: number; // 0 to maxPlayers-1
  hasActed: boolean; // True if player has acted in the current betting round
  isAi?: boolean; // True if player is an AI bot
}

export type GameStatus = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'finished';

export interface GameState {
  status: GameStatus;
  currentPlayerIndex: number; // Index in the players array (or by position logic)
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  pot: number;
  currentBet: number; // The amount needed to call
  minRaise: number; // Minimum raise amount
  communityCards: Card[];
  deck: Card[];
  bettingRound: number; // 0: Preflop, 1: Flop, 2: Turn, 3: River
  winners: { playerId: string; amount: number; handDescription?: string; winningHand?: Card[] }[];
}

export interface Room {
  id: string;
  hostId: string;
  players: Player[];
  maxPlayers: number;
  gameState: GameState;
  smallBlind: number;
  bigBlind: number;
  initialChips: number;
  isGameRunning: boolean;
}

export type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

export interface PlayerAction {
  playerId: string;
  action: ActionType;
  amount?: number; // Required for raise
}
