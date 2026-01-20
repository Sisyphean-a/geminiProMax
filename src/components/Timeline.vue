<template>
  <div class="gemini-timeline" :class="{ 'collapsed': isCollapsed }">
    <div class="timeline-header" @click="toggleCollapse">
      <span>Timeline</span>
      <span class="toggle-icon">{{ isCollapsed ? '◀' : '▶' }}</span>
    </div>
    <div v-if="!isCollapsed" class="timeline-content">
      <div 
        v-for="item in items" 
        :key="item.id" 
        class="timeline-item"
        @click="scrollToItem(item.id)"
      >
        <div class="item-text">{{ item.text }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface TimelineItem {
  id: string;
  text: string;
}

const items = ref<TimelineItem[]>([]);
const isCollapsed = ref(false);

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

const scrollToItem = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

// Observer logic will be passed or handled here. 
// For now, we expose a method to add items or we use a global store/event bus.
// Simpler: The parent (content-script) updates a reactive state passed as props, 
// or we use a custom event listener on window/document if needed.
// But since this is a root component of its own Shadow DOM, we can export a function or use a window global.
// Let's rely on an internal method exposed via defineExpose for the content-script to call.

const updateItems = (newItems: TimelineItem[]) => {
  items.value = newItems;
};

defineExpose({ updateItems });
</script>

<style scoped>
.gemini-timeline {
  position: fixed;
  top: 100px;
  right: 20px;
  width: 200px;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  font-family: 'Google Sans', sans-serif;
  z-index: 9999;
  overflow: hidden;
  transition: width 0.3s ease;
  color: #374151;
}

.gemini-timeline.collapsed {
  width: 40px;
}

.timeline-header {
  padding: 12px;
  background: #eef0f2;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.timeline-content {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px 0;
}

.timeline-item {
  padding: 8px 12px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: background 0.2s;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.timeline-item:hover {
  background: #e8eaed;
  border-left-color: #1a73e8;
}

/* Dark mode support - naive check, can be improved with :host-context or passing prop */
@media (prefers-color-scheme: dark) {
  .gemini-timeline {
    background: #1e1f20;
    border-color: #444746;
    color: #e3e3e3;
  }
  .timeline-header {
    background: #2b2c2d;
  }
  .timeline-item:hover {
    background: #3c4043;
  }
}
</style>
