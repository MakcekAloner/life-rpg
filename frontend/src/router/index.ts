import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import HomeView from '../views/HomeView.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
  },
  {
    path: '/character/:id',
    name: 'character',
    component: () => import('../views/CharacterView.vue'),
  },
  {
    path: '/campaign/:id',
    name: 'campaign',
    component: () => import('../views/CampaignView.vue'),
  },
  {
    path: '/campaign/:id/play',
    name: 'campaign-map',
    component: () => import('../views/CampaignMapView.vue'),
  },
  {
    path: '/mission/:id',
    name: 'mission',
    component: () => import('../views/MissionView.vue'),
  },
  {
    path: '/wave/:id',
    name: 'wave',
    component: () => import('../views/WaveView.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
