/**
 * 规范化文本：Unicode 标准化 + 去除首尾空白
 */
export function normalizeText(text: string): string {
  return text.normalize().trim()
}

/**
 * 生成字符串的简单哈希值（用于 DOM 元素标识）
 */
export function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return function (this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(this, args), wait)
  }
}
