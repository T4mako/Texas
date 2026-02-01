<script setup lang="ts">
import { onMounted } from 'vue';
import { useGameStore } from './store/game.js';

const gameStore = useGameStore();

onMounted(() => {
  gameStore.initSocket();
});
</script>

<template>
  <div class="min-h-screen bg-green-900 text-gray-100 font-sans">
    <router-view />
  </div>
</template>
