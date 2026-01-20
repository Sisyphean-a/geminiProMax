import { ref } from 'vue';
import { extractTextNodes } from '../../../shared/utils/domUtils';
const props = defineProps({
    rootSelector: {
        type: String,
        required: true,
    },
});
const isTranslating = ref(false);
const handleTranslate = async () => {
    const rootEl = document.querySelector(props.rootSelector);
    if (!rootEl) {
        console.error('Gemini Pro Max: Root element not found:', props.rootSelector);
        return;
    }
    // Find content dynamically at click time
    let contentEl = rootEl.querySelector('div[data-test-id="thoughts-content"]');
    if (!contentEl)
        contentEl = rootEl.querySelector('.mat-expansion-panel-body');
    if (!contentEl) {
        // Fallback: Try to find sibling of header
        const headerBtn = rootEl.querySelector('button[data-test-id="thoughts-header-button"]');
        if (headerBtn && headerBtn.nextElementSibling) {
            contentEl = headerBtn.nextElementSibling;
        }
    }
    if (!contentEl) {
        console.error('Gemini Pro Max: Content element not found inside root');
        return;
    }
    isTranslating.value = true;
    try {
        const textNodes = extractTextNodes(contentEl);
        const texts = textNodes.map((node) => node.textContent || '');
        const response = await chrome.runtime.sendMessage({
            type: 'TRANSLATE_BATCH',
            payload: texts,
        });
        if (response && response.translatedTexts && response.translatedTexts.length === texts.length) {
            // Replace text nodes
            textNodes.forEach((node, index) => {
                node.textContent = response.translatedTexts[index];
            });
        }
        else {
            console.error('Translation mismatch or error', response);
        }
    }
    catch (e) {
        console.error('Translation failed', e);
    }
    finally {
        isTranslating.value = false;
    }
};
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['gemini-translate-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['gemini-translate-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['gemini-translate-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['gemini-translate-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.handleTranslate) },
    ...{ class: "gemini-translate-btn" },
    disabled: (__VLS_ctx.isTranslating),
});
/** @type {__VLS_StyleScopedClasses['gemini-translate-btn']} */ ;
if (__VLS_ctx.isTranslating) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "spinner" },
    });
    /** @type {__VLS_StyleScopedClasses['spinner']} */ ;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
}
// @ts-ignore
[handleTranslate, isTranslating, isTranslating,];
const __VLS_export = (await import('vue')).defineComponent({
    props: {
        rootSelector: {
            type: String,
            required: true,
        },
    },
});
export default {};
