browser.runtime.onMessage.addListener((request) => {
    if ('getSelectedText' == request.message) {
        return new Promise(resolve => {
            setTimeout(() => resolve(document.getSelection().toString().toLowerCase()), 100);
        });
    }
    
    return new Promise(resolve => {
        setTimeout(() => resolve(''), 100);
    });
});
