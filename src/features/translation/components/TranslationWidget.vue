<template>
  <button class="gemini-translate-btn" @click="handleTranslate" :disabled="isTranslating">
    <span v-if="isTranslating" class="spinner">⏳</span>
    <span v-else>Thinking Process Translate</span>
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { extractTextNodes } from '../../../shared/utils/domUtils'

// ==================== 性能优化配置 ====================
const CACHE_MAX_SIZE = 500 // LRU 缓存最大条目数
const DEBOUNCE_MS = 150 // 防抖延迟

// 全局翻译缓存：原文 -> 译文 的映射（LRU 策略）
const translationCache = new Map<string, string>()

/**
 * LRU 缓存设置（访问时移到末尾，超出限制时删除最旧）
 */
function cacheSet(key: string, value: string): void {
  if (translationCache.has(key)) {
    translationCache.delete(key) // 移除旧位置
  } else if (translationCache.size >= CACHE_MAX_SIZE) {
    // 删除最旧的条目（Map 迭代顺序是插入顺序）
    const oldest = translationCache.keys().next().value
    if (oldest) translationCache.delete(oldest)
  }
  translationCache.set(key, value)
}

/**
 * LRU 缓存获取（访问时移到末尾）
 */
function cacheGet(key: string): string | undefined {
  const value = translationCache.get(key)
  if (value !== undefined) {
    translationCache.delete(key)
    translationCache.set(key, value)
  }
  return value
}

const props = defineProps({
  rootSelector: {
    type: String,
    required: true,
  },
})

const isTranslating = ref(false)
const isTranslated = ref(false)

// 监视面板展开，自动恢复翻译
let panelObserver: MutationObserver | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  setupPanelObserver()
})

onUnmounted(() => {
  if (panelObserver) {
    panelObserver.disconnect()
    panelObserver = null
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
})

/**
 * 设置面板展开状态监听器（带防抖）
 */
function setupPanelObserver() {
  const rootEl = document.querySelector(props.rootSelector) as HTMLElement
  if (!rootEl) return

  panelObserver = new MutationObserver(() => {
    // 只有翻译过才需要恢复
    if (!isTranslated.value) return

    // 防抖：避免频繁触发
    if (debounceTimer) clearTimeout(debounceTimer)

    debounceTimer = setTimeout(() => {
      scheduleRestoreTranslation()
    }, DEBOUNCE_MS)
  })

  panelObserver.observe(rootEl, {
    childList: true,
    subtree: true,
    attributes: true,
  })
}

/**
 * 使用 requestIdleCallback 在空闲时恢复翻译（避免阻塞 UI）
 */
function scheduleRestoreTranslation() {
  if ('requestIdleCallback' in window) {
    ;(
      window as Window & {
        requestIdleCallback: (callback: () => void, options?: { timeout: number }) => number
      }
    ).requestIdleCallback(
      () => restoreTranslation(),
      { timeout: 500 }, // 最多等待 500ms
    )
  } else {
    // 降级:使用 setTimeout
    setTimeout(restoreTranslation, 0)
  }
}

/**
 * 获取内容元素
 */
function getContentElement(): HTMLElement | null {
  const rootEl = document.querySelector(props.rootSelector) as HTMLElement
  if (!rootEl) return null

  let contentEl = rootEl.querySelector('div[data-test-id="thoughts-content"]') as HTMLElement
  if (!contentEl) contentEl = rootEl.querySelector('.mat-expansion-panel-body') as HTMLElement

  if (!contentEl) {
    const headerBtn = rootEl.querySelector('button[data-test-id="thoughts-header-button"]')
    if (headerBtn && headerBtn.nextElementSibling) {
      contentEl = headerBtn.nextElementSibling as HTMLElement
    }
  }

  return contentEl
}

/**
 * 恢复已缓存的翻译
 */
function restoreTranslation() {
  const contentEl = getContentElement()
  if (!contentEl) return

  const textNodes = extractTextNodes(contentEl)
  let restoredCount = 0

  textNodes.forEach((node) => {
    const originalText = node.textContent || ''
    const cachedTranslation = cacheGet(originalText)
    if (cachedTranslation && cachedTranslation !== originalText) {
      node.textContent = cachedTranslation
      restoredCount++
    }
  })

  if (restoredCount > 0) {
    console.log(`Gemini Pro Max: 已从缓存恢复 ${restoredCount} 条翻译`)
  }
}

const handleTranslate = async () => {
  const rootEl = document.querySelector(props.rootSelector) as HTMLElement
  if (!rootEl) {
    console.error('Gemini Pro Max: Root element not found:', props.rootSelector)
    return
  }

  const contentEl = getContentElement()
  if (!contentEl) {
    console.error('Gemini Pro Max: Content element not found inside root')
    return
  }

  isTranslating.value = true

  try {
    const textNodes = extractTextNodes(contentEl)
    const texts = textNodes.map((node) => node.textContent || '')

    // 检查缓存，分离需要翻译的文本
    const toTranslate: { index: number; text: string }[] = []
    const results: string[] = new Array(texts.length)

    texts.forEach((text, index) => {
      const cached = cacheGet(text)
      if (cached) {
        results[index] = cached
      } else {
        toTranslate.push({ index, text })
      }
    })

    // 只翻译未缓存的文本
    if (toTranslate.length > 0) {
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSLATE_BATCH',
        payload: toTranslate.map((item) => item.text),
      })

      if (
        response &&
        response.translatedTexts &&
        response.translatedTexts.length === toTranslate.length
      ) {
        toTranslate.forEach((item, i) => {
          const translated = response.translatedTexts[i]
          results[item.index] = translated
          // 缓存翻译结果（LRU 策略）
          cacheSet(item.text, translated)
        })
      } else {
        console.error('Translation mismatch or error', response)
        return
      }
    }

    // 应用所有翻译结果
    textNodes.forEach((node, index) => {
      if (results[index]) {
        node.textContent = results[index]
      }
    })

    isTranslated.value = true
    console.log(
      `Gemini Pro Max: 翻译完成，新翻译 ${toTranslate.length} 条，从缓存恢复 ${texts.length - toTranslate.length} 条`,
    )
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
