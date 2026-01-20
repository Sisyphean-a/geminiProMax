import { enableTimeline, handleChatMutations } from './features/timeline'
import { enableTranslation, handleThoughtMutations } from './features/translation'
import { enableAutosave, setupAutosaveObserver } from './features/autosave'

console.log('Gemini Pro Max: Content Script Loaded')

/**
 * 入口初始化函数
 */
function init() {
  console.log('Gemini Pro Max: Initializing...')

  // 1. 初始化各功能模块
  try {
    enableTimeline()
  } catch (e) {
    console.error('Gemini Pro Max: Timeline Init Error', e)
  }

  enableTranslation()
  enableAutosave()

  // 2. 设置全局 MutationObserver
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

  // 3. 初始扫描（处理页面已有内容）
  handleChatMutations([])
  setupAutosaveObserver()
}

// 启动入口
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
