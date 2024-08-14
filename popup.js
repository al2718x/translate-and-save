function hashCode(s) {
    return [...s].reduce(
        (hash, c) => (Math.imul(31, hash) + c.charCodeAt(0)) | 0,
        0
    );
}

async function setupSave() {
    let storage_data = await browser.storage.local.get(null);
    let config = storage_data['config'] ?? {};
    config['translate-from'] = document.getElementById('i-translate-from').value;
    config['translate-to'] = document.getElementById('i-translate-to').value;
    await browser.storage.local.set({ 'config': config });
}

function transSave(item) {
    item.style.cursor = 'pointer';
    item.title = 'Save';
    item.addEventListener('click', async function () {
        let storage_data = await browser.storage.local.get(null);
        let translation = storage_data['translation'] ?? {};
        let trans_src = document.getElementById('i-translate-src').value.trim().toLowerCase();
        let trans_res = document.getElementById(item.dataset.trans_id).innerText;
        translation[trans_src] = trans_res;
        await browser.storage.local.set({ 'translation': translation });
        refresh();
    });
}

function transDelete(item) {
    item.style.fontSize = '10px';
    item.style.cursor = 'pointer';
    item.title = 'Delete';
    item.addEventListener('click', async function () {
        let storage_data = await browser.storage.local.get(null);
        let translation = storage_data['translation'] ?? {};
        let trans = document.getElementById(item.dataset.trans_id).innerText;
        delete translation[trans];
        await browser.storage.local.set({ 'translation': translation });
        refresh();
    });
}

async function translate() {
    let iTranslateSrc = document.getElementById('i-translate-src');
    let iTranslateRes = document.getElementById('i-translate-res');
    let trans_src = iTranslateSrc.value.trim().toLowerCase();
    console.log('TRANSLATE SOURCE: ' + trans_src);
    if ('' === trans_src) return;

    let storage_data = await browser.storage.local.get(null);
    let trans_from = storage_data['config']['translate-from'] ?? 'en';
    let trans_to = storage_data['config']['translate-to'] ?? 'it';
    let request = `https://api.mymemory.translated.net/get?langpair=${trans_from}|${trans_to}&q=${trans_src}`;

    fetch(request).then(function (response) {
        return response.json();
    }).then(function (data) {
        let trans_res = data.responseData.translatedText.toLowerCase();
        let trans_res_all = [trans_res];
        for (m of data.matches) {
            let tmp = m.translation.trim().toLowerCase();
            if ('' === tmp) continue;
            if (trans_res_all.includes(tmp)) continue;
            trans_res_all.push(tmp);
        }
        console.log('TRANSLATE RESULT: ' + trans_res_all);
        iTranslateRes.innerHTML = trans_res_all
            .map((item) => {
                let id = 'trans-save' + hashCode(item);
                return `
                <span class="trans-save" data-trans_id="${id}">💾</span>
                <span id="${id}">${item}</span>
                `;
            })
            .join('<span style="display:block;height:5px;"></span>');

        document.querySelectorAll('.trans-save').forEach((item) => transSave(item));
    }).catch(function (err) {
        console.log('TRANSLATE FETCH ERROR: ', err);
    });
}

async function getSelectedText() {
    let iTranslateSrc = document.getElementById('i-translate-src');
    try {
        let tab = (await browser.tabs.query({ currentWindow: true, active: true }))[0];
        let selectedText = await browser.tabs.sendMessage(tab.id, { message: 'getSelectedText' });
        iTranslateSrc.value = selectedText;
    } catch (e) {
        console.log('GET SELECTED TEXT ERROR: ', e);
    }
}

async function refresh() {
    let btnTranslate = document.getElementById('btn-translate');
    let iTranslateFrom = document.getElementById('i-translate-from');
    let iTranslateTo = document.getElementById('i-translate-to');
    let btnSetupSave = document.getElementById('btn-setup-save');
    let iPairs = document.getElementById('i-pairs');
    let iExport = document.getElementById('i-export');

    btnTranslate.addEventListener('click', () => translate());

    let storage_data = await browser.storage.local.get(null);
    let config = storage_data['config'] ?? {};
    if (!config['translate-from'] || !config['translate-to']) {
        config['translate-from'] = 'en';
        config['translate-to'] = 'it';
        await browser.storage.local.set({ 'config': config });
    }
    iTranslateFrom.value = config['translate-from'] ?? 'en';
    iTranslateTo.value = config['translate-to'] ?? 'it';
    btnSetupSave.addEventListener('click', () => setupSave());

    let translation = storage_data['translation'] ?? {};
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
        let id = 'trans-delete' + hashCode(key);
        iPairs.innerHTML += `
            <div>
            <span class="trans-delete" data-trans_id="${id}">❌</span>
            <b id="${id}">${key}</b>
            ${value}
            </div>
            `;
        iExport.innerHTML += `${key} = ${value}\r\n`;
    });

    document.querySelectorAll('.trans-delete').forEach((item) => transDelete(item));
}

(async function run() {
    await getSelectedText();
    await translate();
    await refresh();
})();
