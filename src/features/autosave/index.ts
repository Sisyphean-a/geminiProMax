import { createApp } from 'vue'
import AutosaveIndicator from './components/AutosaveIndicator.vue'
import { injectStyles } from '@/shared/utils/shadow'

// --- 输入框选择器 ---
const INPUT_SELECTORS = [
  'div.rich-textarea > div[contenteditable="true"]',
  'div[contenteditable="true"][role="textbox"]',
  '.ql-editor',
]

/**
 * 初始化 Autosave 功能（注册全局事件监听器）
 */
export function enableAutosave(): void {
  // 全局 input 事件监听器 —— 持续保存草稿
  document.addEventListener(
    'input',
    (e: Event) => {
      if (!chrome.runtime?.id) return // 检查上下文有效性

      const target = e.target as HTMLElement
      if (
        target.getAttribute('contenteditable') === 'true' ||
        target.classList.contains('ql-editor')
      ) {
        const text = target.innerText
        if (text.trim()) {
          chrome.storage.local.set({ gemini_last_draft_backup: text })
        }
      }
    },
    true,
  )

  // 全局 keydown 事件监听器 —— 发送后清除草稿
  document.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      if (!chrome.runtime?.id) return

      if (e.key === 'Enter' && !e.shiftKey) {
        const target = e.target as HTMLElement
        if (
          target.getAttribute('contenteditable') === 'true' ||
          target.classList.contains('ql-editor')
        ) {
          setTimeout(() => {
            if (!chrome.runtime?.id) return
            chrome.storage.local.remove('gemini_last_draft_backup')
          }, 500)
        }
      }
    },
    true,
  )
}

/**
 * 检测输入框出现后注入 Autosave 指示器
 */
export function setupAutosaveObserver(): void {
  if (document.querySelector('.gemini-promax-autosave-host')) return

  for (const sel of INPUT_SELECTORS) {
    if (document.querySelector(sel)) {
      injectAutosave()
      break
    }
  }
}

/**
 * 注入 Autosave 指示器 Vue 组件
 */
function injectAutosave(): void {
  if (document.querySelector('.gemini-promax-autosave-host')) return

  const host = document.createElement('div')
  host.className = 'gemini-promax-autosave-host'
  host.style.position = 'fixed'
  host.style.bottom = '24px'
  host.style.right = '24px'
  host.style.zIndex = '2147483647'
  document.body.appendChild(host)

  const shadow = host.attachShadow({ mode: 'open' })
  injectStyles(shadow)

  const appRoot = document.createElement('div')
  shadow.appendChild(appRoot)

  const app = createApp(AutosaveIndicator, {
    inputSelector: '.ql-editor, div[contenteditable="true"]',
  })
  app.mount(appRoot)
}
