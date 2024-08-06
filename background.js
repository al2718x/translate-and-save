browser.contextMenus.create({
    id: 'translate-and-save',
    title: 'Translate and Save',
});

browser.contextMenus.onClicked.addListener((info, tab) => {
    if ('translate-and-save' === info.menuItemId) {
        browser.tabs.executeScript({
            file: "translate.js",
        });
    }
});
