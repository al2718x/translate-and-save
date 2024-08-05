function hashCode(s) {
    return [...s].reduce(
        (hash, c) => (Math.imul(31, hash) + c.charCodeAt(0)) | 0,
        0
    );
}

function refresh() {
    let iTranslateFrom = document.getElementById('i-translate-from');
    let iTranslateTo = document.getElementById('i-translate-to');
    let iSetupSave = document.getElementById('i-setup-save');
    let iPairs = document.getElementById('i-pairs');
    let iExport = document.getElementById('i-export');
    browser.storage.local.get('config').then((data) => {
        let config = data['config'];
        if (!config) {
            config = {};
        }
        if (!config['translate-from'] || !config['translate-to']) {
            config['translate-from'] = 'en';
            config['translate-to'] = 'it';
            browser.storage.local.set({ 'config': config });
        }
        iTranslateFrom.value = config['translate-from'] ?? 'en';
        iTranslateTo.value = config['translate-to'] ?? 'it';
    }, (error) => console.log(error));
    iSetupSave.addEventListener('click', () => {
        browser.storage.local.get('config').then((data) => {
            let config = data['config'];
            if (!config) {
                config = {};
            }
            config['translate-from'] = iTranslateFrom.value;
            config['translate-to'] = iTranslateTo.value;
            browser.storage.local.set({ 'config': config });
        }, (error) => console.log(error));
    });
    let pairs = new Map();
    let gettingAllStorageItems = browser.storage.local.get(null);
    gettingAllStorageItems.then((data) => {
        let keys = Object.keys(data);
        // console.log(keys);
        for (let key of keys) {
            let value = data[key];
            // console.log(key + ' ' + value);
            pairs.set(key, value);
        }
        let pairsSorted = new Map([...pairs.entries()].sort());
        iPairs.innerHTML = '';
        iExport.innerHTML = '';
        pairsSorted.forEach((value, key, map) => {
            let id = 'trans-' + hashCode(key);
            iPairs.innerHTML += `
            <div>
            <span class="trans-delete" data-trans_id="${id}">❌</span>
            <b id="${id}">${key}</b>
            ${value}
            </div>
            `;
            iExport.innerHTML += `${key} = ${value}\r\n`;
        });
        document.querySelectorAll('.trans-delete').forEach(function (item) {
            item.style.fontSize = '10px';
            item.style.cursor = 'pointer';
            item.title = 'Delete';
            item.addEventListener('click', () => {
                let trans = document.getElementById(item.dataset.trans_id).innerText;
                browser.storage.local.remove(trans);
                refresh();
            });
        });
    }, (error) => console.log(error));
}

refresh();
