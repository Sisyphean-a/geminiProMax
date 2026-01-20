<template>
  <button class="gemini-translate-btn" @click="handleTranslate" :disabled="isTranslating">
    <span v-if="isTranslating" class="spinner">⏳</span>
    <span v-else>Thinking Process Translate</span>
  </button>
</template>

<script setup lang="ts">
import { ref, PropType } from 'vue'
import { extractTextNodes } from '../utils/domUtils'

const props = defineProps({
  rootSelector: {
    type: String,
    required: true,
  },
})

const isTranslating = ref(false)

const handleTranslate = async () => {
  const rootEl = document.querySelector(props.rootSelector) as HTMLElement
  if (!rootEl) {
    console.error('Gemini Pro Max: Root element not found:', props.rootSelector)
    return
  }

  // Find content dynamically at click time
  let contentEl = rootEl.querySelector('div[data-test-id="thoughts-content"]') as HTMLElement
  if (!contentEl) contentEl = rootEl.querySelector('.mat-expansion-panel-body') as HTMLElement

  if (!contentEl) {
    // Fallback: Try to find sibling of header
    const headerBtn = rootEl.querySelector('button[data-test-id="thoughts-header-button"]')
    if (headerBtn && headerBtn.nextElementSibling) {
      contentEl = headerBtn.nextElementSibling as HTMLElement
    }
  }

  if (!contentEl) {
    console.error('Gemini Pro Max: Content element not found inside root')
    return
  }

  isTranslating.value = true

  try {
    const textNodes = extractTextNodes(contentEl)
    const texts = textNodes.map((node) => node.textContent || '')

    const response = await chrome.runtime.sendMessage({
      type: 'TRANSLATE_BATCH',
      payload: texts,
    })

    if (response && response.translatedTexts && response.translatedTexts.length === texts.length) {
      // Replace text nodes
      textNodes.forEach((node, index) => {
        node.textContent = response.translatedTexts[index]
      })
    } else {
      console.error('Translation mismatch or error', response)
    }
  } catch (e) {
    console.error('Translation failed', e)
  } finally {
    isTranslating.value = false
  }
}
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
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
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
