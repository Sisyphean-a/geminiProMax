import { createApp } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import TimelineWidget from './components/TimelineWidget.vue'
import { injectStyles } from '@/shared/utils/shadow'
import { normalizeText, hashString } from '@/shared/utils/text'

// --- 模块状态 ---
let timelineInstance: ComponentPublicInstance | null = null
let activeUserTurnSelector = ''

// --- 用户消息选择器候选列表 ---
const CANDIDATE_SELECTORS = [
  '.user-query-bubble-with-background',
  '.user-query-bubble-container',
  '.user-query-container',
  '.query-text-line',
  'user-query-content .user-query-bubble-with-background',
  'div[aria-label="User message"]',
  'article[data-author="user"]',
  'article[data-turn="user"]',
  '[data-message-author-role="user"]',
  'div[role="listitem"][data-user="true"]',
  '.user-query',
  'div[data-message-id]',
]

// --- 潜在的聊天容器 ---
const potentialContainers = [
  document.querySelector('main'),
  document.querySelector('#chat-history-container'),
  document.querySelector('div[class*="chat-history"]'),
  document.body,
].filter((c) => c !== null) as HTMLElement[]

/**
 * 过滤掉嵌套的元素，只保留顶层
 */
function filterTopLevel(elements: HTMLElement[]): HTMLElement[] {
  const descendants = new Set<HTMLElement>()
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i]
    for (let j = 0; j < elements.length; j++) {
      if (i !== j && elements[j].contains(el)) {
        descendants.add(el)
        break
      }
    }
  }
  return elements.filter((el) => !descendants.has(el))
}

/**
 * 初始化 Timeline 小部件
 */
export function enableTimeline(): void {
  const container = document.createElement('div')
  container.id = 'gemini-promax-timeline-root'
  container.style.position = 'fixed'
  container.style.top = '0'
  container.style.left = '0'
  container.style.width = '0'
  container.style.height = '0'
  container.style.overflow = 'visible'
  container.style.zIndex = '2147483647'
  container.style.pointerEvents = 'none'
  document.body.appendChild(container)

  const shadow = container.attachShadow({ mode: 'open' })
  injectStyles(shadow)

  const appRoot = document.createElement('div')
  appRoot.style.pointerEvents = 'auto'
  shadow.appendChild(appRoot)

  const app = createApp(TimelineWidget)
  timelineInstance = app.mount(appRoot)
}

/**
 * 处理聊天区域的 DOM 变化，更新 Timeline
 */
export function handleChatMutations(mutations: MutationRecord[]): void {
  let targetContainer: HTMLElement | null = null

  // 发现阶段：找到合适的选择器
  if (!activeUserTurnSelector) {
    for (const container of potentialContainers) {
      for (const sel of CANDIDATE_SELECTORS) {
        if (container.querySelector(sel)) {
          activeUserTurnSelector = sel
          targetContainer = container
          break
        }
      }
      if (targetContainer) break
    }
  } else {
    for (const container of potentialContainers) {
      if (container.querySelector(activeUserTurnSelector)) {
        targetContainer = container
        break
      }
    }
    if (!targetContainer && potentialContainers.length > 0) {
      targetContainer = potentialContainers[0]
    }
  }

  if (!targetContainer || !activeUserTurnSelector) {
    return
  }

  const rawElements = Array.from(
    targetContainer.querySelectorAll(activeUserTurnSelector),
  ) as HTMLElement[]
  const uniqueElements = filterTopLevel(rawElements)

  const items = uniqueElements.map((el, index) => {
    const contentEl = el.querySelector('.user-query-content') || el.querySelector('p') || el
    const rawText = contentEl.textContent || ''
    const cleanText = normalizeText(rawText)
    const summary = cleanText.slice(0, 20) || `Query ${index + 1}`

    let id = el.dataset.promaxTurnId
    if (!id) {
      const nativeId = el.closest('[id]')?.id
      if (nativeId && nativeId.length > 5) {
        id = nativeId
      } else {
        id = `u-${hashString(cleanText)}`
      }
      el.dataset.promaxTurnId = id
      if (!el.id) el.id = id
    }
    return { id, text: summary }
  })

  if (timelineInstance && (timelineInstance as any).updateItems) {
    ;(timelineInstance as any).updateItems(items)
  }
}
