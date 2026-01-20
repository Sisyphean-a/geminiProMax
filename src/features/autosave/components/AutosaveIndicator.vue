<template>
  <div v-if="hasDraft" class="gemini-autosave-pill" @click="restoreDraft">
    <svg class="pill-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"
      />
    </svg>
    <span class="pill-text">恢复未发送草稿</span>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps({
  inputSelector: {
    type: String,
    required: true,
  },
})

const hasDraft = ref(false)
const STORAGE_KEY = 'gemini_last_draft_backup'

onMounted(async () => {
  const checkDraft = async () => {
    if (!chrome.runtime?.id) return
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY)
      const draft = result[STORAGE_KEY]
      if (draft) {
        const inputEl = document.querySelector(props.inputSelector) as HTMLElement
        const currentText = inputEl ? inputEl.innerText.trim() : 'NOT_FOUND'
        hasDraft.value = inputEl && !currentText
      } else {
        hasDraft.value = false
      }
    } catch (e) {}
  }
  checkDraft()
  setInterval(checkDraft, 1000)
})

const restoreDraft = async () => {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  const text = result[STORAGE_KEY]
  const inputEl = document.querySelector(props.inputSelector) as HTMLElement
  if (inputEl && text) {
    inputEl.innerText = text as string
    inputEl.dispatchEvent(new Event('input', { bubbles: true }))
    inputEl.focus()
    try {
      await navigator.clipboard.writeText(text as string)
    } catch (err) {}
    hasDraft.value = false
  }
}
</script>

<style>
/* 样式现在完全由 content-script.ts 中的 AUTOSAVE_CSS 常量提供 */
</style>
