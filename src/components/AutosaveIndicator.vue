<template>
  <div v-if="hasDraft" class="autosave-indicator" @click="restoreDraft" title="Recover Draft">
    Draft detected
    <span class="icon">💾</span>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const props = defineProps({
  inputSelector: {
    type: String,
    required: true
  }
});

const hasDraft = ref(false);
const STORAGE_KEY = 'gemini_draft_content';

onMounted(async () => {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  if (result[STORAGE_KEY]) {
    // Check if input is empty
    const inputEl = document.querySelector(props.inputSelector) as HTMLElement;
    if (inputEl && !inputEl.innerText.trim()) {
      hasDraft.value = true;
    }
  }
});

const restoreDraft = async () => {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const text = result[STORAGE_KEY];
  
  const inputEl = document.querySelector(props.inputSelector) as HTMLElement;
  if (inputEl && text) {
    // 1. Set text
    inputEl.innerText = text;
    
    // 2. Dispatch input event to wake up Angular
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    
    // 3. Focus
    inputEl.focus();
    
    hasDraft.value = false;
  }
};
</script>

<style scoped>
.autosave-indicator {
  position: absolute;
  bottom: 10px;
  right: 60px; /* Adjust based on Send button position */
  font-size: 12px;
  background: #e6f4ea;
  color: #137333;
  padding: 4px 8px;
  border-radius: 12px;
  cursor: pointer;
  z-index: 1000;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  display: flex;
  align-items: center;
  gap: 4px;
}

.autosave-indicator:hover {
  background: #ceead6;
}

@media (prefers-color-scheme: dark) {
  .autosave-indicator {
    background: #185abc;
    color: #e8f0fe;
  }
  .autosave-indicator:hover {
    background: #174ea6;
  }
}
</style>
