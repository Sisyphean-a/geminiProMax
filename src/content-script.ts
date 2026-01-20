import { createApp } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import Timeline from './components/Timeline.vue';
import TranslationWidget from './components/TranslationWidget.vue';
import AutosaveIndicator from './components/AutosaveIndicator.vue';

console.log('Gemini Pro Max Content Script Loaded');

// --- Global State ---
let timelineInstance: ComponentPublicInstance | null = null;
const processedThoughtIds = new Set<string>();

// --- Initialization ---
function init() {
  // 1. Initialize Timeline
  initTimeline();

  // 2. Start Observers
  const observer = new MutationObserver((mutations) => {
    handleChatMutations(mutations);
    handleThoughtMutations(mutations);
  });

  const chatContainer = document.querySelector('body'); 
  // We identify changes effectively by watching body or a stable high level container
  // because chat history container might be re-rendered.
  if (chatContainer) {
    observer.observe(chatContainer, { childList: true, subtree: true });
  }

  // 3. Init Autosave (Input might already be there)
  // We can try to finding it periodically or via observer
  setupAutosave();
}

// --- Timeline Logic ---
function initTimeline() {
  const container = document.createElement('div');
  container.id = 'gemini-promax-timeline-root';
  container.style.position = 'absolute';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '0';
  container.style.height = '0';
  container.style.zIndex = '9999';
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: 'open' });
  const appRoot = document.createElement('div');
  shadow.appendChild(appRoot);

  // Inject styles manually or via Vite? 
  // Vite with CRXJS usually manages styles by injecting them into document head, 
  // but for Shadow DOM we need to adopt them.
  // For now, components use <style scoped> which Vite/Vue injects into the component's render function.
  // However, we might need a reset or font style inheritance. 
  // Google Sans is already on the page, so we inherit it if we don't isolate *too* much or re-declare it.
  
  const app = createApp(Timeline);
  timelineInstance = app.mount(appRoot);
}

function handleChatMutations(mutations: MutationRecord[]) {
  // Check for new user queries
  // Strategy: Scan the known container for items. 
  // More robust: Re-scan the list whenever #chat-history-container changes.
  
  const historyContainer = document.querySelector('#chat-history-container');
  if (!historyContainer) return;

  // We optimize by debouncing or checking specific mutations, but for now let's just re-scan
  // to ensure order and correctness.
  
  const queries = historyContainer.querySelectorAll('.user-query');
  const items = Array.from(queries).map(query => {
    // The ID is usually on a parent wrapper div of .user-query
    // Structure: <div id="...?"> <div class="user-query"> ... </div> </div>
    // Let's look for the closest parent with an ID
    const parent = query.closest('div[id]');
    const id = parent ? parent.id : '';
    const contentEl = query.querySelector('.user-query-content');
    const text = contentEl ? contentEl.textContent?.trim().slice(0, 15) || 'Query' : 'Query';
    
    return { id, text };
  }).filter(item => item.id); // Filter out empty IDs

  if (timelineInstance && (timelineInstance as any).updateItems) {
    (timelineInstance as any).updateItems(items);
  }
}

// --- Translator Logic ---
function handleThoughtMutations(mutations: MutationRecord[]) {
  // Look for model-thoughts tags
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof HTMLElement) {
        // Check if node is model-thoughts or contains it
        if (node.tagName?.toLowerCase() === 'model-thoughts') {
          injectTranslator(node);
        } else if (node.querySelectorAll) {
          const thoughts = node.querySelectorAll('model-thoughts');
          thoughts.forEach(injectTranslator);
        }
      }
    }
  }
}

function injectTranslator(el: Element) {
  const thoughtsRoot = el as HTMLElement;
  // Use a unique ID or flag to prevent double injection
  if (thoughtsRoot.dataset.promaxTranslated) return;
  thoughtsRoot.dataset.promaxTranslated = 'true';

  // Find the header to inject the button
  // Selectors: header is usually the first child or class looking like header
  // User said: "In the header area... display thoughts button"
  // Let's assume there is a header. We can append to it.
  
  // We need to wait for the header to exist? MutationObserver found it, so it should be there.
  // Let's try to find a button-like area.
  // The structure is often: <model-thoughts> <div> <button data-test-id="thoughts-header-button">
  
  const headerBtn = thoughtsRoot.querySelector('button[data-test-id="thoughts-header-button"]');
  if (headerBtn && headerBtn.parentElement) {
    const container = document.createElement('div');
    container.style.display = 'inline-block';
    container.style.marginLeft = '8px';
    headerBtn.parentElement.appendChild(container); // Append NEXT to the header button's parent (or inside it?)
    // If headerBtn is inside a flex container, appending to parent works.
    
    const shadow = container.attachShadow({ mode: 'open' });
    const appRoot = document.createElement('div');
    shadow.appendChild(appRoot);

    // We pass the selector for the content.
    // The content ID is usually linked or we can just find it relative to `thoughtsRoot`.
    // Actually, passing the element PROPS is tricky across creating App, but we can pass a unique class/ID 
    // or just rely on the component finding it relative to document (since we pass a selector string).
    // The Component logic I wrote expects a QuerySelector string.
    // So let's assign a unique ID to the content div if it doesn't have one, or use a data-attribute.
    
    const contentDiv = thoughtsRoot.querySelector('div[data-test-id="thoughts-content"]');
    if (contentDiv) {
      if (!contentDiv.id) {
         contentDiv.id = 'thoughts-content-' + Math.random().toString(36).substr(2, 9);
      }
      
      const app = createApp(TranslationWidget, {
        contentSelector: '#' + contentDiv.id
      });
      app.mount(appRoot);
    }
  }
}

// --- Autosave Logic ---
function setupAutosave() {
  const inputSelector = 'div.rich-textarea > div[contenteditable="true"]';
  
  // Since input might be re-rendered, we need to re-attach if lost.
  // Simple polling or Observer. Observer is better.
  // But we already have a body observer.
  
  // Let's check if we have the indicator already.
  const inputEl = document.querySelector(inputSelector);
  if (inputEl) {
    const parent = inputEl.parentElement; // .rich-textarea
    if (parent && !parent.querySelector('.gemini-promax-autosave-host')) {
       // Inject host
       const host = document.createElement('div');
       host.className = 'gemini-promax-autosave-host';
       host.style.position = 'relative'; // Anchor for absolute positioning of indicator
       // We want the indicator to be near the input. `parent` is usually relative.
       // Let's append host to parent.
       parent.appendChild(host);
       
       const shadow = host.attachShadow({ mode: 'open' });
       const appRoot = document.createElement('div');
       shadow.appendChild(appRoot);
       
       const app = createApp(AutosaveIndicator, {
         inputSelector: inputSelector
       });
       app.mount(appRoot);
       
       // Autosave listeners
       inputEl.addEventListener('input', debounce((e: any) => {
         const text = (e.target as HTMLElement).innerText;
         chrome.storage.local.set({ 'gemini_draft_content': text });
       }, 1000));
       
       inputEl.addEventListener('keydown', (e: any) => {
          if (e.key === 'Enter' && !e.shiftKey) {
             // Clear draft on send
             setTimeout(() => {
                chrome.storage.local.remove('gemini_draft_content');
             }, 100);
          }
       });
    }
  }
}

function debounce(func: Function, wait: number) {
  let timeout: any;
  return function(...args: any[]) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Run init
// Wait for body?
if (document.body) {
  init();
} else {
  window.addEventListener('DOMContentLoaded', init);
}
