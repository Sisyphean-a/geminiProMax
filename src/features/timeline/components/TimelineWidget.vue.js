import { ref } from 'vue';
const items = ref([]);
const isCollapsed = ref(false);
const activeItemId = ref('');
const toggleCollapse = () => {
    isCollapsed.value = !isCollapsed.value;
};
const scrollToItem = (id) => {
    activeItemId.value = id;
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight effect on the element itself could be dispatched here
    }
};
// Exposed API for parent content-script
const updateItems = (newItems) => {
    items.value = newItems;
};
const __VLS_exposed = { updateItems };
defineExpose(__VLS_exposed);
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['gemini-timeline-root']} */ ;
/** @type {__VLS_StyleScopedClasses['gemini-timeline-root']} */ ;
/** @type {__VLS_StyleScopedClasses['collapsed']} */ ;
/** @type {__VLS_StyleScopedClasses['gemini-timeline-root']} */ ;
/** @type {__VLS_StyleScopedClasses['collapsed']} */ ;
/** @type {__VLS_StyleScopedClasses['gemini-timeline-root']} */ ;
/** @type {__VLS_StyleScopedClasses['collapsed']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-header']} */ ;
/** @type {__VLS_StyleScopedClasses['title']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-header']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-body']} */ ;
/** @type {__VLS_StyleScopedClasses['scroll-container']} */ ;
/** @type {__VLS_StyleScopedClasses['scroll-container']} */ ;
/** @type {__VLS_StyleScopedClasses['scroll-container']} */ ;
/** @type {__VLS_StyleScopedClasses['scroll-container']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-entry']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-entry']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-entry']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['entry-index']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-entry']} */ ;
/** @type {__VLS_StyleScopedClasses['entry-text']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-entry']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['entry-text']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "gemini-timeline-root" },
    ...{ class: ({ collapsed: __VLS_ctx.isCollapsed }) },
});
/** @type {__VLS_StyleScopedClasses['gemini-timeline-root']} */ ;
/** @type {__VLS_StyleScopedClasses['collapsed']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.toggleCollapse) },
    ...{ class: "timeline-header" },
});
/** @type {__VLS_StyleScopedClasses['timeline-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "header-content" },
});
/** @type {__VLS_StyleScopedClasses['header-content']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "status-dot" },
});
/** @type {__VLS_StyleScopedClasses['status-dot']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "title" },
});
/** @type {__VLS_StyleScopedClasses['title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "toggle-btn" },
});
/** @type {__VLS_StyleScopedClasses['toggle-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "icon" },
});
/** @type {__VLS_StyleScopedClasses['icon']} */ ;
(__VLS_ctx.isCollapsed ? '»' : '«');
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "timeline-body" },
});
/** @type {__VLS_StyleScopedClasses['timeline-body']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "scroll-container" },
});
/** @type {__VLS_StyleScopedClasses['scroll-container']} */ ;
for (const [item, index] of __VLS_vFor((__VLS_ctx.items))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.scrollToItem(item.id);
                // @ts-ignore
                [isCollapsed, isCollapsed, toggleCollapse, items, scrollToItem,];
            } },
        key: (item.id),
        ...{ class: "timeline-entry" },
        ...{ class: ({ active: __VLS_ctx.activeItemId === item.id }) },
    });
    /** @type {__VLS_StyleScopedClasses['timeline-entry']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "entry-index" },
    });
    /** @type {__VLS_StyleScopedClasses['entry-index']} */ ;
    (String(index + 1).padStart(2, '0'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "entry-content" },
    });
    /** @type {__VLS_StyleScopedClasses['entry-content']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "entry-text" },
    });
    /** @type {__VLS_StyleScopedClasses['entry-text']} */ ;
    (item.text);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "entry-line" },
    });
    /** @type {__VLS_StyleScopedClasses['entry-line']} */ ;
    // @ts-ignore
    [activeItemId,];
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    setup: () => (__VLS_exposed),
});
export default {};
