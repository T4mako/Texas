import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import LobbyPage from '@/pages/LobbyPage.vue'
import GamePage from '@/pages/GamePage.vue'

// Define routes
const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/lobby/:roomId',
    name: 'lobby',
    component: LobbyPage,
  },
  {
    path: '/game/:roomId',
    name: 'game',
    component: GamePage,
  }
]

// Create router instance
const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router

