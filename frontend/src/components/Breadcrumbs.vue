<template>
  <nav class="breadcrumbs" v-if="items.length > 0">
    <div class="breadcrumbs-list">
      <template v-for="(item, index) in items" :key="item.route || item.label">
        <span v-if="index > 0" class="breadcrumb-separator">/</span>
        <router-link 
          v-if="item.route && !item.current" 
          :to="item.route" 
          class="breadcrumb-link"
        >
          {{ item.label }}
        </router-link>
        <span v-else class="breadcrumb-current">
          {{ item.label }}
        </span>
      </template>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface BreadcrumbItem {
  label: string;
  route?: string;
  current?: boolean;
}

interface Props {
  custom?: BreadcrumbItem[];
}

const props = defineProps<Props>();

const items = computed<BreadcrumbItem[]>(() => {
  if (props.custom && props.custom.length > 0) {
    return props.custom;
  }
  return [];
});
</script>

<style scoped>
.breadcrumbs {
  padding: 15px 20px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 2px solid #8b7355;
}

.breadcrumbs-list {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  max-width: 1200px;
  margin: 0 auto;
}

.breadcrumb-link {
  color: #c9a227;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.breadcrumb-link:hover {
  color: #f4e4a4;
  text-decoration: underline;
}

.breadcrumb-current {
  color: #f4e4a4;
  font-weight: bold;
}

.breadcrumb-separator {
  color: #8b7355;
  font-weight: bold;
}
</style>