import { createApp } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import Timeline from './features/timeline/components/TimelineWidget.vue'
import TranslationWidget from './features/translation/components/TranslationWidget.vue'
import AutosaveIndicator from './features/autosave/components/AutosaveIndicator.vue'
// @ts-ignore
import cssContent from './shared/styles/shadow.css?inline'

console.log('Gemini Pro Max: Content Script Loaded [v3 Observer Refactor]')

// --- Global State ---
let timelineInstance: ComponentPublicInstance | null = null
const activeThoughtObservers = new WeakMap<HTMLElement, MutationObserver>()

// --- Initialization ---
function init() {
  console.log('Gemini Pro Max: Init...')

  try {
    initTimeline()
  } catch (e) {
    console.error('Gemini Pro Max: Timeline Init Error', e)
  }

  // --- GLOBAL EVENT LISTENERS (For Stability) ---
  document.addEventListener(
    'input',
    (e: any) => {
      if (!chrome.runtime?.id) return // 检查上下文

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

  document.addEventListener(
    'keydown',
    (e: any) => {
      if (!chrome.runtime?.id) return // 检查上下文

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

  const observer = new MutationObserver((mutations) => {
    try {
      handleChatMutations(mutations)
      handleThoughtMutations(mutations)
      setupAutosaveObserver()
    } catch (e) {
      console.error('Gemini Pro Max: Global Mutation Error', e)
    }
  })

  const body = document.body
  if (body) {
    observer.observe(body, { childList: true, subtree: true })
  }

  handleChatMutations([])
  setupAutosaveObserver()
  const thoughts = document.querySelectorAll('model-thoughts')
  thoughts.forEach((el) => injectTranslator(el as HTMLElement))
}

// --- Helper: Inject Styles ---
function injectStyles(shadowRoot: ShadowRoot) {
  const style = document.createElement('style')
  style.textContent = cssContent
  shadowRoot.appendChild(style)
}

// --- Timeline Logic ---
function initTimeline() {
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

  const app = createApp(Timeline)
  timelineInstance = app.mount(appRoot)
}

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

let activeUserTurnSelector = ''

function normalizeText(text: string): string {
  return text.normalize().trim()
}

function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

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

const potentialContainers = [
  document.querySelector('main'),
  document.querySelector('#chat-history-container'),
  document.querySelector('div[class*="chat-history"]'),
  document.body,
].filter((c) => c !== null) as HTMLElement[]

function handleChatMutations(mutations: MutationRecord[]) {
  let targetContainer: HTMLElement | null = null

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

function handleThoughtMutations(mutations: MutationRecord[]) {
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          if (node.tagName === 'MODEL-THOUGHTS' || node.querySelector('model-thoughts')) {
            const targets =
              node.tagName === 'MODEL-THOUGHTS' ? [node] : node.querySelectorAll('model-thoughts')
            targets.forEach((el) => injectTranslator(el as HTMLElement))
          }
        }
      })
    }
  }
}

function injectTranslator(thoughtsRoot: HTMLElement) {
  if (thoughtsRoot.dataset.promaxWidgetMounted === 'true') return
  const headerBtn =
    thoughtsRoot.querySelector('button[data-test-id="thoughts-header-button"]') ||
    thoughtsRoot.querySelector('button[aria-label*="thoughts"]') ||
    thoughtsRoot.querySelector('button[aria-label*="思路"]') ||
    thoughtsRoot.querySelector('.mat-expansion-panel-header')

  if (!headerBtn) {
    observeForContent(thoughtsRoot)
    return
  }
  let contentDiv = thoughtsRoot.querySelector('div[data-test-id="thoughts-content"]')
  if (!contentDiv) contentDiv = thoughtsRoot.querySelector('.mat-expansion-panel-body')
  if (!contentDiv && headerBtn.nextElementSibling)
    contentDiv = headerBtn.nextElementSibling as HTMLElement

  if (contentDiv) {
    mountWidget(headerBtn as HTMLElement, contentDiv as HTMLElement, thoughtsRoot)
  } else {
    observeForContent(thoughtsRoot)
  }
}

function observeForContent(thoughtsRoot: HTMLElement) {
  if (activeThoughtObservers.has(thoughtsRoot)) return
  const observer = new MutationObserver(() => {
    if (thoughtsRoot.dataset.promaxWidgetMounted === 'true') {
      observer.disconnect()
      activeThoughtObservers.delete(thoughtsRoot)
      return
    }
    let contentDiv = thoughtsRoot.querySelector('div[data-test-id="thoughts-content"]')
    if (!contentDiv) contentDiv = thoughtsRoot.querySelector('.mat-expansion-panel-body')
    let headerBtn =
      thoughtsRoot.querySelector('button[data-test-id="thoughts-header-button"]') ||
      thoughtsRoot.querySelector('button[aria-label*="thoughts"]')
    if (contentDiv && headerBtn) {
      mountWidget(headerBtn as HTMLElement, contentDiv as HTMLElement, thoughtsRoot)
      observer.disconnect()
      activeThoughtObservers.delete(thoughtsRoot)
    }
  })
  observer.observe(thoughtsRoot, { childList: true, subtree: true, attributes: true })
  activeThoughtObservers.set(thoughtsRoot, observer)
}

function mountWidget(headerBtn: HTMLElement, contentDiv: HTMLElement, thoughtsRoot: HTMLElement) {
  const container = document.createElement('div')
  container.style.display = 'inline-block'
  container.style.marginLeft = '12px'
  container.style.verticalAlign = 'middle'
  container.onclick = (e) => e.stopPropagation()
  if (headerBtn.parentElement) {
    headerBtn.parentElement.insertBefore(container, headerBtn.nextSibling)
  } else {
    headerBtn.appendChild(container)
  }
  const shadow = container.attachShadow({ mode: 'open' })
  injectStyles(shadow)
  const appRoot = document.createElement('div')
  shadow.appendChild(appRoot)
  if (!thoughtsRoot.id) {
    thoughtsRoot.id = 'gemini-thoughts-' + Math.random().toString(36).substr(2, 9)
  }
  const app = createApp(TranslationWidget, {
    rootSelector: '#' + thoughtsRoot.id,
  })
  app.mount(appRoot)
  thoughtsRoot.dataset.promaxWidgetMounted = 'true'
}

// --- Autosave Logic ---
function setupAutosaveObserver() {
  if (document.querySelector('.gemini-promax-autosave-host')) return
  const selectors = [
    'div.rich-textarea > div[contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]',
    '.ql-editor',
  ]
  for (const sel of selectors) {
    if (document.querySelector(sel)) {
      injectAutosave()
      break
    }
  }
}

function injectAutosave() {
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

function debounce(func: Function, wait: number) {
  let timeout: any
  return function (...args: any[]) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
