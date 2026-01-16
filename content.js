// document.addEventListener('mouseup', async (e) => {
//     if (e.ctrlKey) {
//         console.log(getSelectedText());
//     }
// });

browser.runtime.onMessage.addListener((request) => {
    if ('getSelectedText' == request.message) {
        return new Promise(resolve => {
            setTimeout(() => resolve(getSelectedText().toLowerCase()), 200);
        });
    }

    return new Promise(resolve => {
        setTimeout(() => resolve(''), 100);
    });
});

function getSelectedText() {
    let element = document.activeElement;
    return window.getSelection()?.toString() ?? element?.value.substring(element.selectionStart, element.selectionEnd) ?? '';
    // return 'INPUT' === element.tagName || 'TEXTAREA' === element.tagName
        // ? element.value.substring(element.selectionStart, element.selectionEnd)
        // : window.getSelection()?.toString() ?? '';
}
