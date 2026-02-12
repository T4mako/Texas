<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/store/game';
import Card from '@/components/Card.vue';
import { Trophy, Clock } from 'lucide-vue-next';

const router = useRouter();
const gameStore = useGameStore();
const raiseAmount = ref(0);

const isMobile = ref(false);

const updateMobileStatus = () => {
  isMobile.value = window.innerWidth < 768;
};

onMounted(() => {
  updateMobileStatus();
  window.addEventListener('resize', updateMobileStatus);
  
  if (!gameStore.room) {
    router.push('/');
    return;
  }
  // Initialize raise amount to min raise
  if (gameStore.room) {
      raiseAmount.value = gameStore.room.gameState.currentBet + (gameStore.room.gameState.minRaise || gameStore.room.bigBlind);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', updateMobileStatus);
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
  // On mobile, reduce rx to prevent cutoff
  const rx = isMobile.value ? 32 : 42; // 32% vs 42%
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
    <div class="flex-1 relative flex items-center justify-center p-2 md:p-4 overflow-hidden">
      <!-- The Table -->
      <div class="w-full max-w-7xl aspect-[3/4] md:aspect-[2/1] bg-[#1b4d2e] rounded-[3rem] md:rounded-[15rem] border-[8px] md:border-[12px] border-[#2e1a0f] shadow-2xl relative transition-all duration-300">
        
        <!-- Table Branding -->
        <div class="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <span class="text-4xl md:text-8xl font-serif text-yellow-400 font-bold transform -rotate-90 md:rotate-0 whitespace-nowrap">Texas Hold'em</span>
        </div>

        <!-- Community Cards & Pot -->
        <div class="absolute top-[40%] md:top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 md:gap-6 w-full px-2">
          <!-- Pot -->
          <div class="bg-black/40 px-4 md:px-8 py-2 md:py-3 rounded-full border-2 border-yellow-500/30 text-yellow-400 font-mono font-bold text-lg md:text-2xl flex items-center gap-2 md:gap-3">
            <span class="text-yellow-500">POT:</span> {{ gameStore.room.gameState.pot }}
          </div>
          
          <!-- Cards -->
          <div class="flex gap-1 md:gap-3">
            <Card 
              v-for="(card, i) in gameStore.room.gameState.communityCards" 
              :key="i" 
              :card="card" 
            />
            <!-- Placeholders if not 5 cards yet? Optional -->
          </div>
          
          <!-- Game Status/Message -->
          <div v-if="gameStore.room.gameState.winners.length > 0" class="mt-2 animate-bounce text-yellow-300 font-bold text-lg md:text-2xl drop-shadow-md text-center">
            {{ gameStore.room.gameState.winners.map(w => w.handDescription).join(', ') }} Wins!
          </div>
        </div>

        <!-- Players -->
        <div 
          v-for="(player, index) in orderedPlayers" 
          :key="player.id"
          class="absolute w-28 md:w-52 flex flex-col items-center transition-all duration-500"
          :style="getPositionStyle(index, orderedPlayers.length)"
        >
          <!-- Player Avatar/Badge -->
          <div 
            class="relative flex flex-col items-center bg-gray-900/90 p-1.5 md:p-3 rounded-xl md:rounded-2xl border-2 md:border-4 shadow-xl w-full"
            :class="{
              'border-yellow-400 ring-2 md:ring-4 ring-yellow-400/50': gameStore.room.gameState.currentPlayerIndex !== -1 && gameStore.room.players[gameStore.room.gameState.currentPlayerIndex]?.id === player.id,
              'border-gray-600': gameStore.room.gameState.currentPlayerIndex === -1 || gameStore.room.players[gameStore.room.gameState.currentPlayerIndex]?.id !== player.id,
              'opacity-50': player.isFolded
            }"
          >
            <!-- Dealer Button -->
             <div v-if="gameStore.room.gameState.dealerIndex !== -1 && gameStore.room.players[gameStore.room.gameState.dealerIndex]?.id === player.id" 
                  class="absolute -top-2 -right-2 md:-top-4 md:-right-4 w-6 h-6 md:w-8 md:h-8 bg-white text-black font-bold rounded-full flex items-center justify-center border-2 border-gray-400 shadow z-20 text-xs md:text-sm">
               D
             </div>

            <!-- Avatar/Name -->
            <div class="font-bold text-white truncate w-full text-center text-xs md:text-lg mb-0.5 md:mb-1">{{ player.nickname }}</div>
            
            <!-- Chips -->
            <div class="text-yellow-400 font-mono text-xs md:text-base flex items-center gap-1 bg-black/50 px-2 md:px-3 py-0.5 md:py-1 rounded">
              <span>$</span>{{ player.chips }}
            </div>

            <!-- Cards -->
            <div class="flex -space-x-4 md:-space-x-6 mt-1 md:mt-3 h-10 md:h-16 relative z-10 scale-90 md:scale-100 origin-top">
               <!-- Show cards if it's ME or Showdown or Open -->
               <!-- For opponents, show Back unless showdown -->
               <template v-if="player.id === gameStore.currentPlayerId || (gameStore.room.gameState.status === 'showdown' || gameStore.room.gameState.status === 'finished')">
                  <Card v-for="(card, i) in player.cards" :key="i" :card="card" :class="{'transform hover:-translate-y-2': player.id === gameStore.currentPlayerId}" />
               </template>
               <template v-else-if="!player.isFolded">
                  <Card hidden />
                  <Card hidden />
               </template>
            </div>
            
            <!-- Action Label (Last action) -->
            <!-- We assume currentBet represents action strength roughly, but 'check' is 0. -->
            <!-- Ideally we store lastAction in player state. For now, use chips/bet info -->
            <div v-if="player.currentBet > 0" class="absolute -bottom-6 md:-bottom-8 bg-blue-600 text-white text-[10px] md:text-sm px-2 md:px-3 py-0.5 md:py-1 rounded-full shadow border border-blue-400 font-bold whitespace-nowrap z-30">
               Bet: {{ player.currentBet }}
            </div>
             <div v-if="player.isFolded" class="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl z-20 text-red-500 font-bold transform rotate-12 border-2 border-red-500 text-lg md:text-xl">
               FOLD
            </div>
            
             <!-- Ready Status -->
            <div v-if="gameStore.room.gameState.status === 'finished' && player.isReady" class="absolute -top-8 md:-top-10 bg-green-500 text-white px-2 py-1 rounded text-[10px] md:text-xs font-bold animate-bounce">
                READY
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Controls (Bottom Bar) -->
    <div class="bg-black/90 backdrop-blur-md border-t border-white/10 p-2 md:p-6 pb-4 md:pb-10 shrink-0 z-50" v-if="gameStore.room.gameState.status !== 'finished'">
      <div class="max-w-6xl mx-auto flex flex-col gap-2 md:gap-6">
        
        <div class="text-white font-bold text-sm md:text-2xl flex items-center justify-center gap-2 md:gap-3 animate-pulse" v-if="gameStore.isMyTurn">
           <Clock class="w-4 h-4 md:w-8 md:h-8 text-yellow-400" /> YOUR TURN
        </div>
        <div class="text-gray-400 font-bold text-sm md:text-xl flex items-center justify-center gap-2 md:gap-3" v-else>
           Waiting for {{ gameStore.room.players[gameStore.room.gameState.currentPlayerIndex]?.nickname }}...
        </div>

        <div class="grid grid-cols-4 md:flex md:items-center gap-2 md:gap-4 w-full">
          <button 
            @click="handleAction('fold')"
            :disabled="!gameStore.isMyTurn"
            class="col-span-1 px-2 md:px-8 py-2 md:py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs md:text-xl rounded-lg md:rounded-xl transition border-b-4 md:border-b-8 border-red-800 active:border-b-0 active:translate-y-1 md:active:translate-y-2 flex items-center justify-center"
          >
            Fold
          </button>
          
          <button 
            v-if="gameStore.room.gameState.currentBet <= gameStore.myPlayer!.currentBet"
            @click="handleAction('check')"
            :disabled="!gameStore.isMyTurn"
            class="col-span-1 px-2 md:px-8 py-2 md:py-4 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs md:text-xl rounded-lg md:rounded-xl transition border-b-4 md:border-b-8 border-gray-800 active:border-b-0 active:translate-y-1 md:active:translate-y-2 flex items-center justify-center"
          >
            Check
          </button>
          
          <button 
             v-else
            @click="handleAction('call')"
            :disabled="!gameStore.isMyTurn"
            class="col-span-1 px-2 md:px-8 py-2 md:py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs md:text-xl rounded-lg md:rounded-xl transition border-b-4 md:border-b-8 border-blue-800 active:border-b-0 active:translate-y-1 md:active:translate-y-2 flex items-center justify-center"
          >
            Call
          </button>

          <!-- Raise Controls -->
          <div class="col-span-2 md:col-span-auto flex flex-col md:flex-row items-center gap-2 bg-gray-800 p-1 md:p-2 rounded-lg md:rounded-xl">
             <div class="flex items-center gap-2 w-full justify-between px-1">
                <input 
                    type="range" 
                    v-model.number="raiseAmount"
                    :disabled="!gameStore.isMyTurn"
                    :min="gameStore.room.gameState.currentBet + (gameStore.room.gameState.minRaise || gameStore.room.bigBlind)"
                    :max="gameStore.myPlayer!.chips + gameStore.myPlayer!.currentBet"
                    step="10"
                    class="w-full md:w-48 h-4 md:h-6"
                />
                <input type="number" v-model.number="raiseAmount" :disabled="!gameStore.isMyTurn" class="w-16 md:w-24 bg-black text-white px-1 md:px-2 py-0.5 md:py-1 text-xs md:text-lg rounded border border-gray-600" />
             </div>
             <button 
                @click="handleAction('raise')"
                :disabled="!gameStore.isMyTurn"
                class="w-full md:w-auto px-2 md:px-6 py-1.5 md:py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs md:text-lg rounded md:rounded-lg transition border-b-2 md:border-b-4 border-green-800 active:border-b-0 active:translate-y-1"
              >
                Raise
              </button>
          </div>
          
           <button 
            @click="handleAction('all-in')"
            :disabled="!gameStore.isMyTurn"
            class="col-span-4 md:col-span-auto px-2 md:px-8 py-2 md:py-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs md:text-xl rounded-lg md:rounded-xl transition border-b-4 md:border-b-8 border-orange-800 active:border-b-0 active:translate-y-1 md:active:translate-y-2 flex items-center justify-center"
          >
            ALL IN
          </button>

        </div>
      </div>
    </div>
    
    <!-- Game Over / Ready -->
    <div class="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" v-if="gameStore.room.gameState.status === 'finished'">
        <div class="bg-white/10 p-10 rounded-3xl text-center border border-white/20 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h2 class="text-5xl font-bold text-yellow-400 mb-8 flex flex-col items-center gap-4">
                <Trophy class="w-20 h-20" />
                Hand Finished!
            </h2>

             <!-- Community Cards -->
             <div class="mb-8">
                <h3 class="text-white text-xl font-bold mb-4">Community Cards</h3>
                <div class="flex justify-center gap-3">
                   <Card 
                     v-for="(card, i) in gameStore.room.gameState.communityCards" 
                     :key="i" 
                     :card="card" 
                   />
                 </div>
             </div>

             <!-- Winners -->
             <div class="mb-8 text-white text-2xl space-y-4">
                 <div v-for="winner in gameStore.room.gameState.winners" :key="winner.playerId" class="p-4 bg-yellow-500/20 rounded-xl border border-yellow-500/50">
                     <div class="font-bold text-white">
                         <span class="text-yellow-400">{{ gameStore.room.players.find(p => p.id === winner.playerId)?.nickname }}</span>
                         wins {{ winner.amount }}!
                     </div>
                     <span class="text-lg text-gray-400 block mt-1">{{ winner.handDescription }}</span>
                 </div>
             </div>

             <!-- All Players Cards -->
             <div class="mb-10">
                 <h3 class="text-white text-xl font-bold mb-4">All Players</h3>
                 <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                     <div v-for="player in gameStore.room.players" :key="player.id" class="bg-black/40 p-3 rounded-lg border border-white/10 flex flex-col items-center">
                         <div class="text-white font-bold mb-2 flex items-center gap-2">
                             {{ player.nickname }}
                             <span v-if="gameStore.room.gameState.winners.some(w => w.playerId === player.id)" class="text-yellow-400 text-xs border border-yellow-400 px-1 rounded">WINNER</span>
                             <span v-if="player.isFolded" class="text-red-500 text-xs border border-red-500 px-1 rounded">FOLD</span>
                         </div>
                         <div class="flex -space-x-4 h-12">
                             <Card v-for="(card, i) in player.cards" :key="i" :card="card" small />
                             <div v-if="player.cards.length === 0" class="text-gray-500 text-xs">No Cards</div>
                         </div>
                     </div>
                 </div>
             </div>
            
            <div class="flex flex-col items-center gap-4">
                <button 
                    v-if="!gameStore.myPlayer?.isReady"
                    @click="gameStore.sendReady()" 
                    class="px-10 py-5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-2xl text-2xl shadow-lg transition transform hover:scale-105 border-b-8 border-green-800 active:border-b-0 active:translate-y-2"
                >
                    Ready for Next Hand
                </button>
                <div v-else class="text-2xl text-green-400 font-bold animate-pulse flex items-center gap-2">
                    Waiting for other players...
                </div>
                
                <div class="text-gray-400 mt-4 text-sm">
                    {{ gameStore.room.players.filter(p => p.isReady).length }} / {{ gameStore.room.players.length }} Players Ready
                </div>
            </div>
        </div>
    </div>

  </div>
</template>
