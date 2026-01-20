import { ref, onMounted } from 'vue';
const props = defineProps({
    inputSelector: {
        type: String,
        required: true
    }
});
const hasDraft = ref(false);
const STORAGE_KEY = 'gemini_draft_content';
onMounted(async () => {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
        // Check if input is empty
        const inputEl = document.querySelector(props.inputSelector);
        if (inputEl && !inputEl.innerText.trim()) {
            hasDraft.value = true;
        }
    }
});
const restoreDraft = async () => {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const text = result[STORAGE_KEY];
    const inputEl = document.querySelector(props.inputSelector);
    if (inputEl && text) {
        // 1. Set text
        inputEl.innerText = text;
        // 2. Dispatch input event to wake up Angular
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        // 3. Focus
        inputEl.focus();
        hasDraft.value = false;
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
/** @type {__VLS_StyleScopedClasses['autosave-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['autosave-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['autosave-indicator']} */ ;
if (__VLS_ctx.hasDraft) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (__VLS_ctx.restoreDraft) },
        ...{ class: "autosave-indicator" },
        title: "Recover Draft",
    });
    /** @type {__VLS_StyleScopedClasses['autosave-indicator']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "icon" },
    });
    /** @type {__VLS_StyleScopedClasses['icon']} */ ;
}
// @ts-ignore
[hasDraft, restoreDraft,];
const __VLS_export = (await import('vue')).defineComponent({
    props: {
        inputSelector: {
            type: String,
            required: true
        }
    },
});
export default {};
