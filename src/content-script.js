import { createApp } from 'vue'
import Timeline from './features/timeline/components/TimelineWidget.vue'
import TranslationWidget from './features/translation/components/TranslationWidget.vue'
import AutosaveIndicator from './features/autosave/components/AutosaveIndicator.vue'
// @ts-expect-error - Vite 内联 CSS 导入
import cssContent from './shared/styles/shadow.css?inline'
console.log('Gemini Pro Max: Content Script Loaded [v3 Observer Refactor]')
// --- Global State ---
let timelineInstance = null
const activeThoughtObservers = new WeakMap()
// --- Initialization ---
function init() {
  console.log('Gemini Pro Max: Init...')
  // 1. Initialize Timeline
  try {
    initTimeline()
  } catch (e) {
    console.error('Gemini Pro Max: Timeline Init Error', e)
  }
  // 2. Global Observer
  const observer = new MutationObserver((mutations) => {
    try {
      handleChatMutations(mutations)
      handleThoughtMutations(mutations)
    } catch (e) {
      console.error('Gemini Pro Max: Global Mutation Error', e)
    }
  })
  const body = document.body
  if (body) {
    observer.observe(body, { childList: true, subtree: true })
  }
  // Initial Scan
  handleChatMutations([])
  const thoughts = document.querySelectorAll('model-thoughts')
  thoughts.forEach((el) => injectTranslator(el))
  // Setup Autosave (Observer-based instead of timeout)
  setupAutosaveObserver()
}
// --- Helper: Inject Styles ---
function injectStyles(shadowRoot) {
  const style = document.createElement('style')
  style.textContent = cssContent
  shadowRoot.appendChild(style)
}
// --- Timeline Logic ---
function initTimeline() {
  const container = document.createElement('div')
  container.id = 'gemini-promax-timeline-root'
  container.style.position = 'absolute'
  container.style.top = '0'
  container.style.left = '0'
  container.style.zIndex = '9999'
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
// --- Timeline Logic ---
// Selectors configuration
const CANDIDATE_SELECTORS = [
  // Priority 1: Angular specific
  '.user-query-bubble-with-background',
  '.user-query-bubble-container',
  '.user-query-container',
  '.query-text-line', // NEW: Discovered via Probe
  'user-query-content .user-query-bubble-with-background',
  // Priority 2: Attribute based
  'div[aria-label="User message"]',
  'article[data-author="user"]',
  'article[data-turn="user"]',
  '[data-message-author-role="user"]',
  'div[role="listitem"][data-user="true"]',
  // Priority 3: Legacy/Fallback
  '.user-query',
  'div[data-message-id]',
]
let activeUserTurnSelector = ''
function normalizeText(text) {
  return text.normalize().trim()
}
function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}
function filterTopLevel(elements) {
  const descendants = new Set()
  // Simple O(N^2) check is sufficient for chat lists
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
function handleChatMutations() {
  // 1. Determine Container (Broad Search with Priority)
  // We scan multiple potential roots to avoid getting trapped in the Sidebar (often named 'chat-history')
  const potentialContainers = [
    document.querySelector('main'), // Priority 1: Main content area
    document.querySelector('#chat-history-container'), // Priority 2: Standard extension container
    document.querySelector('div[class*="chat-history"]'), // Priority 3: Common class (risky, might be sidebar)
    document.body, // Fallback
  ].filter((c) => c !== null)
  let targetContainer = null
  if (!activeUserTurnSelector) {
    // Phase 1: Discovery
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
    // Phase 2: Steady State - Find WHERE the active selector lives roughly
    for (const container of potentialContainers) {
      if (container.querySelector(activeUserTurnSelector)) {
        targetContainer = container
        break
      }
    }
  }
  // If we still didn't find the container or selector, we can't extract anything.
  if (!targetContainer || !activeUserTurnSelector) {
    return
  }
  // 3. Query Elements
  const rawElements = Array.from(targetContainer.querySelectorAll(activeUserTurnSelector))
  if (rawElements.length === 0) return
  // 4. Filter Top Level (Avoid caching nested duplicates)
  const uniqueElements = filterTopLevel(rawElements)
  // 5. Generate Items with Stable IDs
  const items = uniqueElements.map((el, index) => {
    // Content extraction
    const contentEl = el.querySelector('.user-query-content') || el.querySelector('p') || el // Fallback to self
    const rawText = contentEl.textContent || ''
    const cleanText = normalizeText(rawText)
    const summary = cleanText.slice(0, 20) || `Query ${index + 1}`
    // Stable ID Generation
    // Check for dataset cache
    let id = el.dataset.promaxTurnId
    if (!id) {
      // Check for native ID
      const nativeId = el.closest('[id]')?.id
      if (nativeId && nativeId.length > 5) {
        id = nativeId
      } else {
        // Generate Hash
        // The reference analysis suggests 'text' + 'offset' dedupe.
        // For ID, let's use text hash + index to be safe but stable for *that* render order.
        // Ideally just text hash if we want persistance across reloads for 'stars'.
        // But identical text queries exist.
        // Let's use `u-${hash}`.
        id = `u-${hashString(cleanText)}`
      }
      // Cache it
      el.dataset.promaxTurnId = id
      if (!el.id) el.id = id // Ensure it has an ID for scrolling
    }
    return { id, text: summary }
  })
  if (timelineInstance && timelineInstance.updateItems) {
    timelineInstance.updateItems(items)
  }
}
// --- Translator Logic ---
function handleThoughtMutations(mutations) {
  // Check specifically for content div appearance
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          // Direct thoughts component
          if (node.tagName === 'MODEL-THOUGHTS' || node.querySelector('model-thoughts')) {
            const targets =
              node.tagName === 'MODEL-THOUGHTS' ? [node] : node.querySelectorAll('model-thoughts')
            targets.forEach((el) => injectTranslator(el))
          }
        }
      })
    }
  }
}
function injectTranslator(thoughtsRoot) {
  // Stop if already mounted
  if (thoughtsRoot.dataset.promaxWidgetMounted === 'true') return
  // Search for header button
  const headerBtn =
    thoughtsRoot.querySelector('button[data-test-id="thoughts-header-button"]') ||
    thoughtsRoot.querySelector('button[aria-label*="thoughts"]') ||
    thoughtsRoot.querySelector('button[aria-label*="思路"]') ||
    thoughtsRoot.querySelector('.mat-expansion-panel-header')
  if (!headerBtn) {
    // If we can't even find the header, this might be a very fresh DOM node.
    // Observe it.
    observeForContent(thoughtsRoot)
    return
  }
  // Search for content div
  let contentDiv = thoughtsRoot.querySelector('div[data-test-id="thoughts-content"]')
  if (!contentDiv) contentDiv = thoughtsRoot.querySelector('.mat-expansion-panel-body')
  if (!contentDiv && headerBtn.nextElementSibling) contentDiv = headerBtn.nextElementSibling
  if (contentDiv) {
    mountWidget(headerBtn, contentDiv, thoughtsRoot)
  } else {
    console.debug('Gemini Pro Max: Content div missing, attaching specific observer...')
    observeForContent(thoughtsRoot)
  }
}
function observeForContent(thoughtsRoot) {
  if (activeThoughtObservers.has(thoughtsRoot)) return // Already observing
  const observer = new MutationObserver(() => {
    // Stop if we found it in this batch
    if (thoughtsRoot.dataset.promaxWidgetMounted === 'true') {
      observer.disconnect()
      activeThoughtObservers.delete(thoughtsRoot)
      return
    }
    // Check if content appeared
    let contentDiv = thoughtsRoot.querySelector('div[data-test-id="thoughts-content"]')
    if (!contentDiv) contentDiv = thoughtsRoot.querySelector('.mat-expansion-panel-body')
    let headerBtn =
      thoughtsRoot.querySelector('button[data-test-id="thoughts-header-button"]') ||
      thoughtsRoot.querySelector('button[aria-label*="thoughts"]')
    if (contentDiv && headerBtn) {
      mountWidget(headerBtn, contentDiv, thoughtsRoot)
      observer.disconnect()
      activeThoughtObservers.delete(thoughtsRoot)
    }
  })
  observer.observe(thoughtsRoot, { childList: true, subtree: true, attributes: true })
  activeThoughtObservers.set(thoughtsRoot, observer)
}
function mountWidget(headerBtn, contentDiv, thoughtsRoot) {
  // Inject Button
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
// --- Autosave Logic (Observer Based) ---
function setupAutosaveObserver() {
  const observer = new MutationObserver(() => {
    const inputSelector = 'div.rich-textarea > div[contenteditable="true"]'
    const inputEl = document.querySelector(inputSelector)
    if (inputEl) {
      const parent = inputEl.parentElement
      if (parent && !parent.querySelector('.gemini-promax-autosave-host')) {
        // Found it, inject!
        injectAutosave(inputEl, parent)
      }
    }
  })
  // Watch body for inputs appearing
  observer.observe(document.body, { childList: true, subtree: true })
}
function injectAutosave(inputEl, parent) {
  const host = document.createElement('div')
  host.className = 'gemini-promax-autosave-host'
  host.style.position = 'relative'
  parent.appendChild(host)
  const shadow = host.attachShadow({ mode: 'open' })
  injectStyles(shadow)
  const appRoot = document.createElement('div')
  shadow.appendChild(appRoot)
  const app = createApp(AutosaveIndicator, {
    inputSelector: 'div.rich-textarea > div[contenteditable="true"]',
  })
  app.mount(appRoot)
  inputEl.addEventListener(
    'input',
    debounce((e) => {
      const text = e.target.innerText
      chrome.storage.local.set({ gemini_draft_content: text })
    }, 1000),
  )
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      setTimeout(() => {
        chrome.storage.local.remove('gemini_draft_content')
      }, 100)
    }
  })
}
function debounce(func, wait) {
  let timeout
  return function (...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
