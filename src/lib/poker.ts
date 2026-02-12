import type { Card, Rank, Suit } from '@/types/game';

const RANK_VALUE: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

interface HandResult {
  score: number;
  name: string;
  cards: Card[];
}

export function evaluateHand(holeCards: Card[], communityCards: Card[]): HandResult {
  const allCards = [...holeCards, ...communityCards];
  if (allCards.length < 5) return { score: 0, name: '', cards: [] };
  
  const combinations = getCombinations(allCards, 5);
  
  let bestHand: HandResult = { score: -1, name: 'Unknown', cards: [] };

  for (const hand of combinations) {
    const result = evaluate5CardHand(hand);
    if (result.score > bestHand.score) {
      bestHand = result;
    }
  }

  return bestHand;
}

function getCombinations(cards: Card[], k: number): Card[][] {
  const result: Card[][] = [];
  function backtrack(start: number, current: Card[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < cards.length; i++) {
      current.push(cards[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  backtrack(0, []);
  return result;
}

function evaluate5CardHand(hand: Card[]): HandResult {
  const sortedHand = [...hand].sort((a, b) => RANK_VALUE[b.rank] - RANK_VALUE[a.rank]);
  const ranks = sortedHand.map(c => RANK_VALUE[c.rank]);
  const suits = sortedHand.map(c => c.suit);
  
  const isFlush = suits.every(s => s === suits[0]);
  
  let isStraight = true;
  for (let i = 0; i < ranks.length - 1; i++) {
    if (ranks[i] - ranks[i+1] !== 1) {
      isStraight = false;
      break;
    }
  }
  if (!isStraight && ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) {
    isStraight = true;
  }

  const rankCounts: Record<number, number> = {};
  for (const r of ranks) {
    rankCounts[r] = (rankCounts[r] || 0) + 1;
  }
  
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  
  let score = 0;
  let name = '';
  
  const getKickerScore = (sortedRanks: number[]) => {
      let kScore = 0;
      for(let i=0; i<sortedRanks.length; i++) {
          kScore += sortedRanks[i] * Math.pow(15, 4-i);
      }
      return kScore;
  };

  if (isFlush && isStraight) {
    name = 'Straight Flush';
    const highCard = (ranks[0] === 14 && ranks[1] === 5) ? 5 : ranks[0];
    score = 80000000 + highCard; 
  } else if (counts[0] === 4) {
    name = 'Four of a Kind';
    const quadRank = Number(Object.keys(rankCounts).find(key => rankCounts[Number(key)] === 4));
    const kicker = Number(Object.keys(rankCounts).find(key => rankCounts[Number(key)] === 1));
    score = 70000000 + quadRank * 100 + kicker;
  } else if (counts[0] === 3 && counts[1] === 2) {
    name = 'Full House';
    const tripRank = Number(Object.keys(rankCounts).find(key => rankCounts[Number(key)] === 3));
    const pairRank = Number(Object.keys(rankCounts).find(key => rankCounts[Number(key)] === 2));
    score = 60000000 + tripRank * 100 + pairRank;
  } else if (isFlush) {
    name = 'Flush';
    score = 50000000 + getKickerScore(ranks);
  } else if (isStraight) {
    name = 'Straight';
    const highCard = (ranks[0] === 14 && ranks[1] === 5) ? 5 : ranks[0];
    score = 40000000 + highCard;
  } else if (counts[0] === 3) {
    name = 'Three of a Kind';
    const tripRank = Number(Object.keys(rankCounts).find(key => rankCounts[Number(key)] === 3));
    const kickers = Object.keys(rankCounts).map(Number).filter(r => r !== tripRank).sort((a, b) => b - a);
    score = 30000000 + tripRank * 1000 + kickers[0] * 15 + kickers[1];
  } else if (counts[0] === 2 && counts[1] === 2) {
    name = 'Two Pair';
    const pairs = Object.keys(rankCounts).map(Number).filter(r => rankCounts[r] === 2).sort((a, b) => b - a);
    const kicker = Object.keys(rankCounts).map(Number).find(r => rankCounts[r] === 1) || 0;
    score = 20000000 + pairs[0] * 1000 + pairs[1] * 15 + kicker;
  } else if (counts[0] === 2) {
    name = 'Pair';
    const pairRank = Number(Object.keys(rankCounts).find(key => rankCounts[Number(key)] === 2));
    const kickers = Object.keys(rankCounts).map(Number).filter(r => r !== pairRank).sort((a, b) => b - a);
    score = 10000000 + pairRank * 10000 + kickers[0] * 225 + kickers[1] * 15 + kickers[2];
  } else {
    name = 'High Card';
    score = getKickerScore(ranks);
  }

  return { score, name, cards: sortedHand };
}
