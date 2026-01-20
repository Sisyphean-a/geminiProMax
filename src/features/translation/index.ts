import { createApp } from 'vue'
import TranslationWidget from './components/TranslationWidget.vue'
import { injectStyles } from '@/shared/utils/shadow'

// --- 模块状态 ---
const activeThoughtObservers = new WeakMap<HTMLElement, MutationObserver>()

/**
 * 初始化翻译功能（扫描现有 model-thoughts 节点）
 */
export function enableTranslation(): void {
  const thoughts = document.querySelectorAll('model-thoughts')
  thoughts.forEach((el) => injectTranslator(el as HTMLElement))
}

/**
 * 处理思考区域的 DOM 变化
 */
export function handleThoughtMutations(mutations: MutationRecord[]): void {
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

/**
 * 向 model-thoughts 节点注入翻译按钮
 */
function injectTranslator(thoughtsRoot: HTMLElement): void {
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

/**
 * 观察 thoughts 节点，等待内容出现
 */
function observeForContent(thoughtsRoot: HTMLElement): void {
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

/**
 * 挂载翻译按钮 Vue 组件
 */
function mountWidget(
  headerBtn: HTMLElement,
  contentDiv: HTMLElement,
  thoughtsRoot: HTMLElement,
): void {
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
