<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/store/game';
import Card from '@/components/Card.vue';
import { Trophy, Clock } from 'lucide-vue-next';

const router = useRouter();
const gameStore = useGameStore();
const raiseAmount = ref(0);

onMounted(() => {
  if (!gameStore.room) {
    router.push('/');
    return;
  }
  // Initialize raise amount to min raise
  if (gameStore.room) {
      raiseAmount.value = gameStore.room.gameState.currentBet + (gameStore.room.gameState.minRaise || gameStore.room.bigBlind);
  }
});

// Update raise amount when it's my turn
watch(() => gameStore.isMyTurn, (isTurn) => {
    if (isTurn && gameStore.room) {
         const min = gameStore.room.gameState.currentBet + (gameStore.room.gameState.minRaise || gameStore.room.bigBlind);
         if (raiseAmount.value < min) raiseAmount.value = min;
    }
});

const orderedPlayers = computed(() => {
  if (!gameStore.room) return [];
  const players = [...gameStore.room.players];
  const myIndex = players.findIndex(p => p.id === gameStore.currentPlayerId);
  
  if (myIndex === -1) return players; // Spectator view: Host at top or just default order
  
  // Rotate so I am at index 0
  return [...players.slice(myIndex), ...players.slice(0, myIndex)];
});

// Positions for up to 10 players (0 is bottom center)
// using top/left percentages
const getPositionStyle = (index: number, total: number) => {
  // If just me, center bottom
  if (total === 1) return { bottom: '10%', left: '50%', transform: 'translateX(-50%)' };
  
  // Ellipse distribution
  // x = a * cos(theta), y = b * sin(theta)
  // Shift theta so index 0 is at 90 degrees (bottom) -> actually 270 in standard math, or just map carefully.
  // CSS: top/left. Center is 50%, 50%.
  
  // We want index 0 at Bottom (90deg in CSS terms usually starts right, so 90 is bottom).
  // Let's use angle offset.
  // 0 -> 90deg (Bottom)
  // 1..N distributed clockwise
  
  const angleStep = 360 / total;
  const startAngle = 90; // Bottom
  
  const angle = startAngle + (index * angleStep);
  const radian = (angle * Math.PI) / 180;
  
  // Radius X and Y (horizontal wider)
  const rx = 42; // 42% of container width
  const ry = 35; // 35% of container height
  
  const x = 50 + rx * Math.cos(radian);
  const y = 50 + ry * Math.sin(radian);
  
  return {
    top: `${y}%`,
    left: `${x}%`,
    transform: 'translate(-50%, -50%)'
  };
};

const handleAction = async (action: string) => {
  let amount = undefined;
  if (action === 'raise') {
    amount = raiseAmount.value;
  }
  await gameStore.sendAction(action, amount);
};

const getActionName = (action: string) => {
    // Helper to display nicer name
    return action.toUpperCase();
};
</script>

<template>
  <div class="min-h-screen bg-green-900 overflow-hidden flex flex-col relative" v-if="gameStore.room">
    <!-- Top Info -->
    <div class="absolute top-4 left-4 z-10 text-white/70 text-sm font-mono">
      Room: {{ gameStore.room.id }}<br>
      Blinds: {{ gameStore.room.smallBlind }}/{{ gameStore.room.bigBlind }}
    </div>

    <!-- Table Container -->
    <div class="flex-1 relative flex items-center justify-center p-4">
      <!-- The Table -->
      <div class="w-full max-w-5xl aspect-[2/1] bg-[#1b4d2e] rounded-[10rem] border-8 border-[#2e1a0f] shadow-2xl relative">
        
        <!-- Table Branding -->
        <div class="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <span class="text-6xl font-serif text-yellow-400 font-bold">Texas Hold'em</span>
        </div>

        <!-- Community Cards & Pot -->
        <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
          <!-- Pot -->
          <div class="bg-black/40 px-6 py-2 rounded-full border border-yellow-500/30 text-yellow-400 font-mono font-bold text-xl flex items-center gap-2">
            <span class="text-yellow-500">POT:</span> {{ gameStore.room.gameState.pot }}
          </div>
          
          <!-- Cards -->
          <div class="flex gap-2">
            <Card 
              v-for="(card, i) in gameStore.room.gameState.communityCards" 
              :key="i" 
              :card="card" 
            />
            <!-- Placeholders if not 5 cards yet? Optional -->
          </div>
          
          <!-- Game Status/Message -->
          <div v-if="gameStore.room.gameState.winners.length > 0" class="mt-2 animate-bounce text-yellow-300 font-bold text-lg drop-shadow-md">
            {{ gameStore.room.gameState.winners.map(w => w.handDescription).join(', ') }} Wins!
          </div>
        </div>

        <!-- Players -->
        <div 
          v-for="(player, index) in orderedPlayers" 
          :key="player.id"
          class="absolute w-32 md:w-40 flex flex-col items-center transition-all duration-500"
          :style="getPositionStyle(index, orderedPlayers.length)"
        >
          <!-- Player Avatar/Badge -->
          <div 
            class="relative flex flex-col items-center bg-gray-900/90 p-2 rounded-xl border-2 shadow-lg w-full"
            :class="{
              'border-yellow-400 ring-2 ring-yellow-400/50': gameStore.room.gameState.currentPlayerIndex !== -1 && gameStore.room.players[gameStore.room.gameState.currentPlayerIndex]?.id === player.id,
              'border-gray-600': gameStore.room.gameState.currentPlayerIndex === -1 || gameStore.room.players[gameStore.room.gameState.currentPlayerIndex]?.id !== player.id,
              'opacity-50': player.isFolded
            }"
          >
            <!-- Dealer Button -->
             <div v-if="gameStore.room.gameState.dealerIndex !== -1 && gameStore.room.players[gameStore.room.gameState.dealerIndex]?.id === player.id" 
                  class="absolute -top-3 -right-3 w-6 h-6 bg-white text-black font-bold rounded-full flex items-center justify-center border border-gray-400 shadow z-20 text-xs">
               D
             </div>

            <!-- Avatar/Name -->
            <div class="font-bold text-white truncate w-full text-center text-sm mb-1">{{ player.nickname }}</div>
            
            <!-- Chips -->
            <div class="text-yellow-400 font-mono text-xs flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded">
              <span>$</span>{{ player.chips }}
            </div>

            <!-- Cards -->
            <div class="flex -space-x-4 mt-2 h-12 relative z-10">
               <!-- Show cards if it's ME or Showdown or Open -->
               <!-- For opponents, show Back unless showdown -->
               <template v-if="player.id === gameStore.currentPlayerId || (gameStore.room.gameState.status === 'showdown' || gameStore.room.gameState.status === 'finished')">
                  <Card v-for="(card, i) in player.cards" :key="i" :card="card" small :class="{'transform hover:-translate-y-2': player.id === gameStore.currentPlayerId}" />
               </template>
               <template v-else-if="!player.isFolded">
                  <Card hidden small />
                  <Card hidden small />
               </template>
            </div>
            
            <!-- Action Label (Last action) -->
            <!-- We assume currentBet represents action strength roughly, but 'check' is 0. -->
            <!-- Ideally we store lastAction in player state. For now, use chips/bet info -->
            <div v-if="player.currentBet > 0" class="absolute -bottom-6 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full shadow border border-blue-400">
               Bet: {{ player.currentBet }}
            </div>
             <div v-if="player.isFolded" class="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl z-20 text-red-500 font-bold transform rotate-12 border-2 border-red-500">
               FOLD
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Controls (Bottom Bar) -->
    <div class="bg-black/80 backdrop-blur-md border-t border-white/10 p-4 pb-8" v-if="gameStore.isMyTurn">
      <div class="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div class="text-white font-bold text-lg flex items-center gap-2 animate-pulse">
           <Clock class="w-5 h-5 text-yellow-400" /> YOUR TURN
        </div>

        <div class="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <button 
            @click="handleAction('fold')"
            class="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition border-b-4 border-red-800 active:border-b-0 active:translate-y-1"
          >
            Fold
          </button>
          
          <button 
            v-if="gameStore.room.gameState.currentBet <= gameStore.myPlayer!.currentBet"
            @click="handleAction('check')"
            class="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-lg transition border-b-4 border-gray-800 active:border-b-0 active:translate-y-1"
          >
            Check
          </button>
          
          <button 
             v-if="gameStore.room.gameState.currentBet > gameStore.myPlayer!.currentBet"
            @click="handleAction('call')"
            class="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition border-b-4 border-blue-800 active:border-b-0 active:translate-y-1"
          >
            Call {{ gameStore.room.gameState.currentBet - gameStore.myPlayer!.currentBet }}
          </button>

          <!-- Raise Controls -->
          <div class="flex items-center gap-2 bg-gray-800 p-1 rounded-lg ml-2">
             <input 
                type="range" 
                v-model.number="raiseAmount"
                :min="gameStore.room.gameState.currentBet + (gameStore.room.gameState.minRaise || gameStore.room.bigBlind)"
                :max="gameStore.myPlayer!.chips + gameStore.myPlayer!.currentBet"
                step="10"
                class="w-24 md:w-32"
             />
             <div class="flex flex-col">
                <input type="number" v-model.number="raiseAmount" class="w-20 bg-black text-white px-1 text-sm rounded border border-gray-600" />
             </div>
             <button 
                @click="handleAction('raise')"
                class="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded transition border-b-4 border-green-800 active:border-b-0 active:translate-y-1 text-sm"
              >
                Raise
              </button>
          </div>
          
           <button 
            @click="handleAction('all-in')"
            class="px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold rounded-lg transition border-b-4 border-orange-800 active:border-b-0 active:translate-y-1 ml-2"
          >
            ALL IN
          </button>

        </div>
      </div>
    </div>
    
    <!-- Spectator / Waiting Message -->
    <div class="bg-black/80 backdrop-blur-md border-t border-white/10 p-4 pb-8 text-center text-gray-400" v-else-if="!gameStore.isMyTurn && gameStore.room.gameState.status !== 'finished'">
        Waiting for {{ gameStore.room.players[gameStore.room.gameState.currentPlayerIndex]?.nickname }} to act...
    </div>
    
    <!-- Game Over / New Game -->
    <div class="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" v-if="gameStore.room.gameState.status === 'finished' && gameStore.isHost">
        <div class="bg-white/10 p-8 rounded-2xl text-center border border-white/20 shadow-2xl">
            <h2 class="text-4xl font-bold text-yellow-400 mb-4 flex flex-col items-center gap-2">
                <Trophy class="w-16 h-16" />
                Hand Finished!
            </h2>
             <div class="mb-8 text-white text-xl">
                 <div v-for="winner in gameStore.room.gameState.winners" :key="winner.playerId">
                     {{ gameStore.room.players.find(p => p.id === winner.playerId)?.nickname }} wins {{ winner.amount }}!
                     <span class="text-sm text-gray-400 block">{{ winner.handDescription }}</span>
                 </div>
             </div>
            <button 
                @click="gameStore.startGame(gameStore.room.initialChips)" 
                class="px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-xl shadow-lg transition transform hover:scale-105"
            >
                Start Next Hand
            </button>
        </div>
    </div>
    <div class="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" v-if="gameStore.room.gameState.status === 'finished' && !gameStore.isHost">
         <div class="text-white text-2xl font-bold animate-pulse">Waiting for host to start next hand...</div>
    </div>

  </div>
</template>
