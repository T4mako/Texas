<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/store/game';
import { Users, Coins, Play } from 'lucide-vue-next';

const router = useRouter();
const gameStore = useGameStore();
const initialChips = ref(1000);

onMounted(() => {
  if (!gameStore.room) {
    router.push('/');
    return;
  }
});

watch(() => gameStore.room?.isGameRunning, (isRunning) => {
  if (isRunning) {
    router.push(`/game/${gameStore.room?.id}`);
  }
});

const startGame = () => {
  gameStore.startGame(initialChips.value);
};

const addAi = async () => {
  await gameStore.addAi();
};

const copyRoomId = () => {
  navigator.clipboard.writeText(gameStore.room?.id || '');
  // Could add toast here
};
</script>

<template>
  <div class="min-h-screen p-8" v-if="gameStore.room">
    <!-- Header -->
    <div class="max-w-4xl mx-auto mb-8 flex justify-between items-center bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl">
      <div>
        <h2 class="text-2xl font-bold text-yellow-400 flex items-center gap-2">
          <Users class="w-6 h-6" />
          Room: <span class="text-white font-mono cursor-pointer" @click="copyRoomId" title="Click to copy">{{ gameStore.room.id }}</span>
        </h2>
        <p class="text-gray-400 text-sm mt-1">Waiting for players...</p>
      </div>
      <div class="bg-black/30 px-4 py-2 rounded-lg">
        <span class="text-gray-300">Players:</span>
        <span class="text-yellow-400 font-bold ml-2">{{ gameStore.room.players.length }} / {{ gameStore.room.maxPlayers }}</span>
      </div>
    </div>

    <!-- Player Grid -->
    <div class="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
      <div 
        v-for="player in gameStore.room.players" 
        :key="player.id"
        class="bg-white/5 border border-white/10 p-6 rounded-xl flex flex-col items-center justify-center relative group hover:bg-white/10 transition"
      >
        <div class="w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center mb-3 shadow-inner border border-white/5">
          <span class="text-2xl font-bold text-gray-300">{{ player.nickname.charAt(0).toUpperCase() }}</span>
        </div>
        <h3 class="font-bold text-lg truncate w-full text-center">{{ player.nickname }}</h3>
        <span v-if="player.id === gameStore.room.hostId" class="absolute top-2 right-2 text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/30">
          HOST
        </span>
        <span v-if="player.id === gameStore.currentPlayerId" class="absolute top-2 left-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">
          YOU
        </span>
      </div>
      
      <!-- Empty slots placeholders -->
      <div 
        v-for="i in (Math.max(0, gameStore.room.maxPlayers - gameStore.room.players.length))" 
        :key="`empty-${i}`"
        class="bg-black/10 border border-white/5 p-6 rounded-xl flex flex-col items-center justify-center opacity-50 border-dashed"
      >
        <div class="w-16 h-16 rounded-full bg-black/20 mb-3"></div>
        <div class="h-4 w-20 bg-black/20 rounded"></div>
      </div>
    </div>

    <!-- Host Controls -->
    <div v-if="gameStore.isHost" class="max-w-md mx-auto bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl">
      <h3 class="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
        <Coins class="w-5 h-5" />
        Game Settings
      </h3>
      
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-300 mb-2">Initial Chips</label>
        <div class="flex items-center gap-4">
          <input 
            type="range" 
            v-model.number="initialChips" 
            min="1000" 
            max="10000" 
            step="500"
            class="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
          />
          <span class="text-xl font-mono font-bold w-20 text-right">{{ initialChips }}</span>
        </div>
      </div>

      <button 
        @click="addAi"
        :disabled="gameStore.room.players.length >= gameStore.room.maxPlayers"
        class="w-full mb-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg transition transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Users class="w-5 h-5" />
        Add AI Bot
      </button>

      <button 
        @click="startGame"
        :disabled="gameStore.room.players.length < 2"
        class="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg transition transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        <Play class="w-5 h-5" />
        Start Game
      </button>
      <p v-if="gameStore.room.players.length < 2" class="text-center text-sm text-gray-400 mt-2">
        Need at least 2 players to start
      </p>
    </div>

    <div v-else class="max-w-md mx-auto text-center p-6 bg-black/20 rounded-2xl">
      <div class="animate-pulse flex flex-col items-center">
        <div class="h-2 w-2 bg-yellow-400 rounded-full mb-2"></div>
        <p class="text-gray-300">Waiting for host to start the game...</p>
      </div>
    </div>
  </div>
</template>
