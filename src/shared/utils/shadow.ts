// @ts-ignore
import cssContent from '../styles/shadow.css?inline'

/**
 * 将共享样式注入到 Shadow DOM 中
 * @param shadowRoot 目标 Shadow Root
 */
export function injectStyles(shadowRoot: ShadowRoot): void {
  const style = document.createElement('style')
  style.textContent = cssContent
  shadowRoot.appendChild(style)
}
