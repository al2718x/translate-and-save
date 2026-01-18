// document.addEventListener('mouseup', async (e) => {
//     if (e.ctrlKey) {
//         console.log(getSelectedText());
//     }
// });

browser.runtime.onMessage.addListener((request) => {
    if ('getSelectedText' == request.message) {
        return new Promise(resolve => {
            setTimeout(() => resolve(getSelectedText().toLowerCase()), 100);
        });
    }
    return new Promise(resolve => {
        setTimeout(() => resolve(''), 100);
    });
});

function getSelectedText() {
    let selection = window.getSelection();
    if (selection && selection.rangeCount) {
        return selection.getRangeAt(0).toString();
    }
    let element = document.activeElement;
    if (element && ('INPUT' === element.tagName || 'TEXTAREA' === element.tagName)) {
        return element.value.substring(element.selectionStart, element.selectionEnd);
    }
}
