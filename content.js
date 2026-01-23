// document.addEventListener('mouseup', async (e) => {
//     if (e.ctrlKey) {
//         console.log(getSelectedText());
//     }
// });

browser.runtime.onMessage.addListener((request) => {
    if ('getSelectedText' == request.message) {
        return new Promise(resolve => {
            setTimeout(() => resolve(getSelectedText().trim().toLowerCase()), 10);
        });
    }
    return new Promise(resolve => {
        setTimeout(() => resolve(''), 10);
    });
});

function getSelectedText() {
    // if (document.readyState !== 'complete') {
    //     return '';
    // }
    let selection = null;
    for (let i = 0; i < 100; i++) {
        selection = window.getSelection();
        if (selection && selection.rangeCount) {
            return selection.getRangeAt(0).toString();
        }
        setTimeout(() => { }, 1);
    }
    let element = document.activeElement;
    if (element && ('INPUT' === element.tagName || 'TEXTAREA' === element.tagName)) {
        return element.value.substring(element.selectionStart, element.selectionEnd);
    }
    throw new Error('No selection');
}
