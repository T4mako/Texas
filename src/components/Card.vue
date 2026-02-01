<script setup lang="ts">
import { computed } from 'vue';
import type { Card as CardType } from '@/types/game';

const props = defineProps<{
  card?: CardType;
  hidden?: boolean;
  small?: boolean;
}>();

const suitColor = computed(() => {
  if (!props.card) return 'text-gray-400';
  return ['hearts', 'diamonds'].includes(props.card.suit) ? 'text-red-500' : 'text-black';
});

const suitIcon = computed(() => {
  if (!props.card) return '';
  switch (props.card.suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
  }
  return '';
});
</script>

<template>
  <div 
    class="bg-white rounded-lg shadow-md border-2 border-gray-200 flex flex-col items-center justify-center select-none relative overflow-hidden transition-transform transform hover:-translate-y-1"
    :class="[
      small ? 'w-8 h-12 md:w-10 md:h-14 text-xs md:text-sm' : 'w-10 h-14 md:w-14 md:h-20 text-sm md:text-xl',
      hidden ? 'bg-blue-800 border-blue-900' : 'bg-white'
    ]"
  >
    <div v-if="hidden" class="w-full h-full flex items-center justify-center bg-pattern opacity-50">
      <div class="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]"></div>
    </div>
    
    <div v-else class="flex flex-col items-center justify-between w-full h-full p-1 leading-none" :class="suitColor">
      <span class="self-start font-bold">{{ card?.rank }}</span>
      <span class="text-2xl">{{ suitIcon }}</span>
      <span class="self-end font-bold transform rotate-180">{{ card?.rank }}</span>
    </div>
  </div>
</template>

<style scoped>
.bg-pattern {
  background-image: repeating-linear-gradient(45deg, #1e3a8a 25%, transparent 25%, transparent 75%, #1e3a8a 75%, #1e3a8a), repeating-linear-gradient(45deg, #1e3a8a 25%, #1e40af 25%, #1e40af 75%, #1e3a8a 75%, #1e3a8a);
  background-position: 0 0, 10px 10px;
  background-size: 20px 20px;
}
</style>
