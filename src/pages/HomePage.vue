<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/store/game';
import { Store, Loader2 } from 'lucide-vue-next'; // Just a placeholder icon or similar

const nickname = ref('');
const roomId = ref('');
const error = ref('');
const isJoining = ref(false);
const router = useRouter();
const gameStore = useGameStore();

const handleJoin = async () => {
  if (isJoining.value) return;

  if (!nickname.value || !roomId.value) {
    error.value = 'Please enter both nickname and room ID';
    return;
  }
  
  if (nickname.value.length < 2 || nickname.value.length > 10) {
      error.value = 'Nickname must be between 2 and 10 characters';
      return;
  }

  isJoining.value = true;
  error.value = '';

  try {
    const res = await gameStore.joinRoom(nickname.value, roomId.value);
    if (res.success) {
      router.push(`/lobby/${roomId.value}`);
    } else {
      error.value = res.error || 'Failed to join room';
      isJoining.value = false;
    }
  } catch (e) {
    error.value = 'An error occurred while joining';
    isJoining.value = false;
  }
};
</script>

<template>
  <div class="flex items-center justify-center min-h-screen p-4">
    <div class="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-yellow-400 mb-2 drop-shadow-md">Texas Hold'em</h1>
        <p class="text-gray-300">Enter a room to start playing</p>
      </div>

      <div class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Nickname</label>
          <input 
            v-model="nickname"
            type="text" 
            placeholder="Your Name"
            class="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none text-white placeholder-gray-500 transition"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Room ID</label>
          <input 
            v-model="roomId"
            type="text" 
            placeholder="Room Number (e.g. 123456)"
            class="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none text-white placeholder-gray-500 transition"
          />
        </div>

        <div v-if="error" class="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded">
          {{ error }}
        </div>

        <button 
          @click="handleJoin"
          :disabled="isJoining"
          class="w-full py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-yellow-500 transform hover:scale-[1.02] transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
        >
          <Loader2 v-if="isJoining" class="w-5 h-5 animate-spin" />
          {{ isJoining ? 'Joining...' : 'Join / Create Room' }}
        </button>
      </div>
    </div>
  </div>
</template>
