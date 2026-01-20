<template>
  <div class="gemini-timeline-root" :class="{ collapsed: isCollapsed }">
    <!-- Header / Toggle -->
    <div class="timeline-header" @click="toggleCollapse">
      <div class="header-content">
        <span class="status-dot"></span>
        <span class="title">TIMELINE_v3</span>
      </div>
      <div class="toggle-btn">
        <span class="icon">{{ isCollapsed ? '»' : '«' }}</span>
      </div>
    </div>

    <!-- Content -->
    <div class="timeline-body">
      <div class="scroll-container">
        <div
          v-for="(item, index) in items"
          :key="item.id"
          class="timeline-entry"
          :class="{ active: activeItemId === item.id }"
          @click="scrollToItem(item.id)"
        >
          <div class="entry-index">{{ String(index + 1).padStart(2, '0') }}</div>
          <div class="entry-content">
            <span class="entry-text">{{ item.text }}</span>
          </div>
          <div class="entry-line"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface TimelineItem {
  id: string
  text: string
}

const items = ref<TimelineItem[]>([])
const isCollapsed = ref(false)
const activeItemId = ref<string>('')

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const scrollToItem = (id: string) => {
  activeItemId.value = id
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Highlight effect on the element itself could be dispatched here
  }
}

// Exposed API for parent content-script
const updateItems = (newItems: TimelineItem[]) => {
  items.value = newItems
}

defineExpose({ updateItems })
</script>

<style scoped>
/* Font Import */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');

/* Styles injected via shadow.css */
</style>
