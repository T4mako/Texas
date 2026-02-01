import type { Room, Player, GameState, PlayerAction, Card, GameStatus } from './types.js';
import { createDeck, shuffleDeck, evaluateHand } from './Card.js';

export class GameEngine {
  // We don't store state here, we operate on the Room object passed in
  // This allows the RoomManager to hold the state

  static initializeGame(room: Room) {
    // Reset game state
    room.gameState = {
      status: 'preflop',
      currentPlayerIndex: -1,
      dealerIndex: (room.gameState.dealerIndex + 1) % room.players.length,
      smallBlindIndex: -1,
      bigBlindIndex: -1,
      pot: 0,
      currentBet: 0,
      minRaise: room.bigBlind,
      communityCards: [],
      deck: shuffleDeck(createDeck()),
      bettingRound: 0,
      winners: []
    };

    room.isGameRunning = true;

    // Reset players
    room.players.forEach(p => {
      p.cards = [];
      p.currentBet = 0;
      p.totalBetInHand = 0;
      p.isActive = p.chips > 0;
      p.isFolded = !p.isActive;
      p.isAllIn = false;
      p.hasActed = false;
    });

    const activePlayers = room.players.filter(p => p.isActive);
    if (activePlayers.length < 2) {
      room.isGameRunning = false;
      room.gameState.status = 'finished';
      return; // Not enough players
    }

    // Deal cards
    for (let i = 0; i < 2; i++) {
      room.players.forEach(p => {
        if (p.isActive) {
          p.cards.push(room.gameState.deck.pop()!);
        }
      });
    }

    // Blinds
    const dealerIdx = room.gameState.dealerIndex;
    const playerCount = room.players.length;
    
    // Logic for SB and BB positions relative to Dealer
    // Heads up (2 players): Dealer is SB, other is BB
    // 3+ players: Dealer, SB, BB
    let sbPos = (dealerIdx + 1) % playerCount;
    let bbPos = (dealerIdx + 2) % playerCount;

    if (activePlayers.length === 2) {
      sbPos = dealerIdx;
      bbPos = (dealerIdx + 1) % playerCount;
    }

    // Find the actual active players at these positions (skipping inactive if any logic needed, 
    // but here we assume room.players includes everyone, so we just use indices. 
    // Wait, if a player sits out with 0 chips, they are inactive. 
    // We need to find the next active player index.
    
    const getNextActiveIndex = (startIdx: number): number => {
      let idx = (startIdx) % playerCount;
      for (let i = 0; i < playerCount; i++) {
        if (room.players[idx].isActive) return idx;
        idx = (idx + 1) % playerCount;
      }
      return -1;
    };

    if (activePlayers.length === 2) {
        // Heads up special rule: Button is Small Blind
        // But our logic above: sbPos = dealerIdx
        // We need to ensure we pick the correct ACTIVE indices
        const active1 = activePlayers[0];
        const active2 = activePlayers[1];
        // Identify their indices in the main array
        const idx1 = room.players.findIndex(p => p.id === active1.id);
        const idx2 = room.players.findIndex(p => p.id === active2.id);
        
        // If dealer is idx1
        if (room.gameState.dealerIndex === idx1) {
             room.gameState.smallBlindIndex = idx1;
             room.gameState.bigBlindIndex = idx2;
        } else {
             room.gameState.smallBlindIndex = idx2;
             room.gameState.bigBlindIndex = idx1;
        }
    } else {
        // Normal
        room.gameState.smallBlindIndex = getNextActiveIndex(dealerIdx + 1);
        room.gameState.bigBlindIndex = getNextActiveIndex(room.gameState.smallBlindIndex + 1);
    }
    
    // Post Blinds
    this.postBlind(room, room.gameState.smallBlindIndex, room.smallBlind);
    this.postBlind(room, room.gameState.bigBlindIndex, room.bigBlind);

    // Set first player to act (UTG)
    room.gameState.currentPlayerIndex = getNextActiveIndex(room.gameState.bigBlindIndex + 1);
    
    // Initial State Set
  }

  static postBlind(room: Room, playerIdx: number, amount: number) {
    const player = room.players[playerIdx];
    const bet = Math.min(player.chips, amount);
    player.chips -= bet;
    player.currentBet = bet;
    player.totalBetInHand += bet;
    room.gameState.pot += bet;
    if (bet > room.gameState.currentBet) {
      room.gameState.currentBet = bet;
    }
    if (player.chips === 0) {
      player.isAllIn = true;
    }
  }

  static processAction(room: Room, action: PlayerAction): { success: boolean; message?: string } {
    const { playerId, action: type, amount } = action;
    const playerIdx = room.players.findIndex(p => p.id === playerId);
    
    if (playerIdx === -1) return { success: false, message: 'Player not found' };
    if (playerIdx !== room.gameState.currentPlayerIndex) return { success: false, message: 'Not your turn' };
    
    const player = room.players[playerIdx];
    const currentBet = room.gameState.currentBet;

    switch (type) {
      case 'fold':
        player.isFolded = true;
        player.isActive = false;
        break;
      
      case 'check':
        if (player.currentBet < currentBet) return { success: false, message: 'Cannot check, must call' };
        break;
      
      case 'call':
        const callAmount = currentBet - player.currentBet;
        if (callAmount > player.chips) return { success: false, message: 'Not enough chips to call' }; // Client should send all-in
        player.chips -= callAmount;
        player.currentBet += callAmount;
        player.totalBetInHand += callAmount;
        room.gameState.pot += callAmount;
        if (player.chips === 0) player.isAllIn = true;
        break;
        
      case 'raise':
        if (!amount || amount < room.gameState.minRaise) return { success: false, message: `Raise must be at least ${room.gameState.minRaise}` };
        const totalRaise = amount; // The user input is usually "raise TO" or "raise BY". Assuming "raise TO" total bet.
        // Let's assume input 'amount' is the TOTAL bet they want to put in for this round.
        // So it must be >= currentBet + minRaise (unless all-in, handled separately)
        // Wait, standard UI usually is "Raise to X".
        // Let's enforce: amount is the target currentBet.
        
        // Actually, let's simplify: amount is the TOTAL amount the player puts in front of them for this round.
        if (amount < currentBet + (room.gameState.minRaise || room.bigBlind)) {
             // Exception: if amount == player.chips + player.currentBet (All in)
             // But 'all-in' action covers that.
             // We'll treat this as strict raise logic.
             // return { success: false, message: 'Raise too small' };
        }
        
        const addedChips = amount - player.currentBet;
        if (addedChips > player.chips) return { success: false, message: 'Not enough chips' };
        
        player.chips -= addedChips;
        player.currentBet = amount;
        player.totalBetInHand += addedChips;
        room.gameState.pot += addedChips;
        
        const raiseDiff = amount - currentBet;
        room.gameState.currentBet = amount;
        room.gameState.minRaise = raiseDiff; // Valid raise resets min raise
        break;
        
      case 'all-in':
        const allInAmount = player.chips;
        player.chips = 0;
        player.currentBet += allInAmount;
        player.totalBetInHand += allInAmount;
        room.gameState.pot += allInAmount;
        player.isAllIn = true;
        
        if (player.currentBet > room.gameState.currentBet) {
             const diff = player.currentBet - room.gameState.currentBet;
             room.gameState.currentBet = player.currentBet;
             if (diff >= room.gameState.minRaise) {
                 room.gameState.minRaise = diff;
             }
        }
        break;
    }

    player.hasActed = true;
    
    // Check if round is over
    if (this.isBettingRoundOver(room)) {
      this.nextRound(room);
    } else {
      this.nextPlayer(room);
    }

    return { success: true };
  }

  static getNextActiveIndex(room: Room, startIdx: number): number {
    let idx = (startIdx) % room.players.length;
    for (let i = 0; i < room.players.length; i++) {
      if (room.players[idx].isActive && !room.players[idx].isAllIn) return idx;
      idx = (idx + 1) % room.players.length;
    }
    return -1;
  }

  static nextPlayer(room: Room) {
    let nextIdx = (room.gameState.currentPlayerIndex + 1) % room.players.length;
    while (!room.players[nextIdx].isActive || room.players[nextIdx].isAllIn) {
      nextIdx = (nextIdx + 1) % room.players.length;
      // Safety break if everyone is all-in or folded
      if (nextIdx === room.gameState.currentPlayerIndex) break; 
    }
    room.gameState.currentPlayerIndex = nextIdx;
  }

  static isBettingRoundOver(room: Room): boolean {
    const activePlayers = room.players.filter(p => p.isActive);
    // If only one player left, round (and game) is over
    if (activePlayers.length === 1) return true;

    // Check if all active players have acted and bets are equal (or all-in)
    // Players who are All-In are considered "matched" effectively, but they don't act again.
    // We need to check players who are NOT All-In.
    
    const activeNonAllIn = activePlayers.filter(p => !p.isAllIn);
    
    // If everyone is All-In (or all but one), round is over
    if (activeNonAllIn.length === 0) return true;
    if (activeNonAllIn.length === 1 && activePlayers.length > 1) {
        // One player with chips, others all-in. 
        // If the one player has matched the highest bet, round over.
        // If they haven't acted yet (e.g. BB when SB went all-in), it's not over.
        if (activeNonAllIn[0].currentBet === room.gameState.currentBet && activeNonAllIn[0].hasActed) return true;
        return false;
    }

    // Normal case: Check if everyone has acted and matched the bet
    return activeNonAllIn.every(p => p.hasActed && p.currentBet === room.gameState.currentBet);
  }

  static nextRound(room: Room) {
    // Reset player bets for next round
    room.players.forEach(p => {
      p.currentBet = 0;
      p.hasActed = false;
    });
    room.gameState.currentBet = 0;
    room.gameState.minRaise = room.bigBlind;

    // Advance status
    const statusMap: Record<string, GameStatus> = {
      'preflop': 'flop',
      'flop': 'turn',
      'turn': 'river',
      'river': 'showdown'
    };
    
    const nextStatus = statusMap[room.gameState.status];
    
    if (this.checkGameEnd(room)) return; // If only 1 player left

    if (nextStatus === 'showdown') {
      this.showdown(room);
      return;
    }

    room.gameState.status = nextStatus;
    room.gameState.bettingRound++;

    // Deal community cards
    if (nextStatus === 'flop') {
      room.gameState.deck.pop(); // Burn
      room.gameState.communityCards.push(room.gameState.deck.pop()!);
      room.gameState.communityCards.push(room.gameState.deck.pop()!);
      room.gameState.communityCards.push(room.gameState.deck.pop()!);
    } else if (nextStatus === 'turn' || nextStatus === 'river') {
      room.gameState.deck.pop(); // Burn
      room.gameState.communityCards.push(room.gameState.deck.pop()!);
    }

    // Set first player to act (SB or next active)
    // Post-flop, action starts from SB (idx after dealer)
    const sbPos = (room.gameState.dealerIndex + 1) % room.players.length;
    let nextIdx = sbPos;
    // Find first active non-all-in player
    if (!room.players[nextIdx].isActive || room.players[nextIdx].isAllIn) {
        nextIdx = this.getNextActiveIndex(room, nextIdx);
    }
    room.gameState.currentPlayerIndex = nextIdx;

    // Auto-progress if no one can act (all-in scenarios)
    if (nextIdx === -1) {
       // Everyone is all-in or folded. Run remaining cards and showdown.
       this.runToShowdown(room);
    }
  }

  static runToShowdown(room: Room) {
      while (room.gameState.status !== 'showdown' && room.gameState.status !== 'finished') {
           const statusMap: Record<string, GameStatus> = {
              'preflop': 'flop',
              'flop': 'turn',
              'turn': 'river',
              'river': 'showdown'
            };
            const nextStatus = statusMap[room.gameState.status];
            if (nextStatus === 'showdown') {
                this.showdown(room);
                break;
            }
            room.gameState.status = nextStatus;
            
            if (nextStatus === 'flop') {
                room.gameState.deck.pop();
                room.gameState.communityCards.push(room.gameState.deck.pop()!);
                room.gameState.communityCards.push(room.gameState.deck.pop()!);
                room.gameState.communityCards.push(room.gameState.deck.pop()!);
            } else {
                room.gameState.deck.pop();
                room.gameState.communityCards.push(room.gameState.deck.pop()!);
            }
      }
  }

  static checkGameEnd(room: Room): boolean {
    const activePlayers = room.players.filter(p => p.isActive);
    if (activePlayers.length === 1) {
      // Winner by default
      this.distributePot(room, [activePlayers[0]]);
      room.gameState.status = 'finished';
      return true;
    }
    return false;
  }

  static showdown(room: Room) {
    room.gameState.status = 'showdown';
    const activePlayers = room.players.filter(p => p.isActive);
    
    // Evaluate hands
    const playerHands = activePlayers.map(p => ({
      player: p,
      hand: evaluateHand(p.cards, room.gameState.communityCards)
    }));

    // Sort by score descending
    playerHands.sort((a, b) => b.hand.score - a.hand.score);

    // Find winners (could be split pot)
    const bestScore = playerHands[0].hand.score;
    const winners = playerHands.filter(ph => ph.hand.score === bestScore).map(ph => ph.player);
    
    // TODO: Handle side pots (Complex, skipping for MVP unless required)
    // MVP: Assuming one main pot for now. Side pots are tricky.
    
    this.distributePot(room, winners, playerHands[0].hand.name);
    room.gameState.status = 'finished';
  }

  static distributePot(room: Room, winners: Player[], handDescription: string = 'Win') {
    const share = Math.floor(room.gameState.pot / winners.length);
    const remainder = room.gameState.pot % winners.length;
    
    winners.forEach((w, idx) => {
        const amount = share + (idx < remainder ? 1 : 0);
        w.chips += amount;
        room.gameState.winners.push({
            playerId: w.id,
            amount: amount,
            handDescription
        });
    });
    room.gameState.pot = 0;
  }
}
