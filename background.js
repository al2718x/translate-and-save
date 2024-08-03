browser.contextMenus.create({
    id: 'translate-and-save',
    title: 'Translate and Save',
});

browser.contextMenus.onClicked.addListener((info, tab) => {
    if ('translate-and-save' === info.menuItemId) {
        console.log('TRANSLATE AND SAVE');
        browser.tabs.executeScript({
            file: "translate.js",
        });
    }
});
