function hashCode(s) {
    return [...s].reduce(
        (hash, c) => (Math.imul(31, hash) + c.charCodeAt(0)) | 0,
        0
    );
}

async function refresh() {
    let iTranslate = document.getElementById('i-translate');
    let iTranslateSrc = document.getElementById('i-translate-src');
    let iTranslateFrom = document.getElementById('i-translate-from');
    let iTranslateTo = document.getElementById('i-translate-to');
    let iSetupSave = document.getElementById('i-setup-save');
    let iPairs = document.getElementById('i-pairs');
    let iExport = document.getElementById('i-export');

    iTranslate.addEventListener('click', async function () {
        try {
            let tab = (await browser.tabs.query({ currentWindow: true, active: true }))[0];
            await browser.tabs.sendMessage(tab.id, { message: 'translateText', text: iTranslateSrc.value });
        } catch (e) {
            console.log('POPUP ERROR: ', e);
        }
    });

    try {
        let tab = (await browser.tabs.query({ currentWindow: true, active: true }))[0];
        let selectedText = await browser.tabs.sendMessage(tab.id, { message: 'getSelectedText' });
        iTranslateSrc.value = selectedText;
    } catch (e) {
        console.log('POPUP ERROR: ', e);
    }

    let data = await browser.storage.local.get(null);
    let config = data['config'] ?? {};
    if (!config['translate-from'] || !config['translate-to']) {
        config['translate-from'] = 'en';
        config['translate-to'] = 'it';
        await browser.storage.local.set({ 'config': config });
    }
    iTranslateFrom.value = config['translate-from'] ?? 'en';
    iTranslateTo.value = config['translate-to'] ?? 'it';
    iSetupSave.addEventListener('click', async function () {
        let data = await browser.storage.local.get(null);
        let config = data['config'] ?? {};
        config['translate-from'] = iTranslateFrom.value;
        config['translate-to'] = iTranslateTo.value;
        await browser.storage.local.set({ 'config': config });
    });

    let translation = data['translation'] ?? {};
    let keys = Object.keys(translation);
    let pairs = new Map();
    for (let key of keys) {
        let value = translation[key];
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
        item.addEventListener('click', async function () {
            let trans = document.getElementById(item.dataset.trans_id).innerText;
            delete translation[trans];
            await browser.storage.local.set({ 'translation': translation });
            refresh();
        });
    });
}

refresh();
