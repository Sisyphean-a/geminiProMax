<template>
  <button class="gemini-translate-btn" @click="handleTranslate" :disabled="isTranslating">
    <span v-if="isTranslating" class="spinner">⏳</span>
    <span v-else>Thinking Process Translate</span>
  </button>
</template>

<script setup lang="ts">
import { ref, PropType } from 'vue';
import { extractTextNodes } from '../utils/domUtils';

const props = defineProps({
  contentSelector: {
    type: String,
    required: true
  }
});

const isTranslating = ref(false);

const handleTranslate = async () => {
  const contentEl = document.querySelector(props.contentSelector) as HTMLElement;
  if (!contentEl) {
    console.warn('Content element not found:', props.contentSelector);
    return;
  }

  isTranslating.value = true;

  try {
    const textNodes = extractTextNodes(contentEl);
    const texts = textNodes.map(node => node.textContent || '');
    
    // Chunking might be needed for large content, keeping it simple for now
    const response = await chrome.runtime.sendMessage({
      type: 'TRANSLATE_BATCH',
      payload: texts
    });

    if (response && response.translatedTexts && response.translatedTexts.length === texts.length) {
      // Replace text nodes
      textNodes.forEach((node, index) => {
        node.textContent = response.translatedTexts[index];
      });
    } else {
      console.error('Translation mismatch or error', response);
    }
  } catch (e) {
    console.error('Translation failed', e);
  } finally {
    isTranslating.value = false;
  }
};
</script>

<style scoped>
.gemini-translate-btn {
  margin-left: 10px;
  background: transparent;
  border: 1px solid #dadce0;
  border-radius: 4px;
  padding: 4px 8px;
  font-family: 'Google Sans', sans-serif;
  font-size: 12px;
  color: #1a73e8;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}

.gemini-translate-btn:hover {
  background: #f1f3f4;
}

.gemini-translate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (prefers-color-scheme: dark) {
  .gemini-translate-btn {
    color: #8ab4f8;
    border-color: #5f6368;
  }
  .gemini-translate-btn:hover {
    background: #303134;
  }
}
</style>
