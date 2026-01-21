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
          :title="item.text"
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
import { ref, onMounted } from 'vue'

interface TimelineItem {
  id: string
  text: string
}

const items = ref<TimelineItem[]>([])
const isCollapsed = ref(true) // 默认折叠
const activeItemId = ref<string>('')

const STORAGE_KEY = 'gemini_timeline_collapsed'

onMounted(() => {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      if (result[STORAGE_KEY] !== undefined) {
        isCollapsed.value = result[STORAGE_KEY] as boolean
      }
    })
  }
})

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ [STORAGE_KEY]: isCollapsed.value })
  }
}

const scrollToItem = (id: string) => {
  activeItemId.value = id
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // Highlight effect on the element itself could be dispatched here
  }
}

// Exposed API for parent content-script
const updateItems = (newItems: TimelineItem[]) => {
  items.value = newItems

  // 1. 如果变为空列表，自动折叠
  if (newItems.length === 0) {
    isCollapsed.value = true
  }
}

defineExpose({ updateItems })
</script>

<style scoped>
/* Font Import */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');

/* Styles injected via shadow.css */
</style>
