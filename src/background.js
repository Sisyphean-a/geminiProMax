"use strict";
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'TRANSLATE_BATCH') {
        handleTranslateBatch(request.payload).then(sendResponse);
        return true; // Keep channel open for async response
    }
});
async function handleTranslateBatch(texts) {
    try {
        // Parallelize requests (gtx is free but rate limited, be careful. For now serial or small parallel)
        // Actually, gtx handles one string well. Batching might require multiple requests.
        // Let's do Promise.all for simplicity.
        const results = await Promise.all(texts.map((text) => translateText(text)));
        return { translatedTexts: results };
    }
    catch (error) {
        console.error('Translation error:', error);
        return { error: error.message };
    }
}
async function translateText(text) {
    if (!text.trim())
        return text;
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    const data = await response.json();
    // Data structure: [[["Translated Text", "Source Text", ...], ...], ...]
    // We need to join the parts if it was split
    if (data && data[0]) {
        return data[0].map((item) => item[0]).join('');
    }
    return text;
}
