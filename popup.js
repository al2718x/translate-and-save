function hashCode(s) {
    return [...s].reduce(
        (hash, c) => (Math.imul(31, hash) + c.charCodeAt(0)) | 0,
        0
    );
}

async function configInit() {
    let storage_data = await browser.storage.local.get(null);
    let config = storage_data['config'] ?? {};
    if (!config['api']) {
        config['api'] = '0';
    }
    if (!config['translate-from']) {
        config['translate-from'] = 'en';
    }
    if (!config['translate-to']) {
        config['translate-to'] = 'ja';
    }
    if (!config['export-pattern']) {
        config['export-pattern'] = '{from}|{to}';
    }
    await browser.storage.local.set({ 'config': config });
}

async function configSave() {
    let storage_data = await browser.storage.local.get(null);
    let config = storage_data['config'] ?? {};
    config['api'] = document.getElementById('sel-api').value;
    config['translate-from'] = document.getElementById('i-translate-from').value;
    config['translate-to'] = document.getElementById('i-translate-to').value;
    config['export-pattern'] = document.getElementById('i-export-pattern').value;
    await browser.storage.local.set({ 'config': config });
}

function transSave(item, append = false) {
    item.title = (append) ? 'Save append' : 'Save new';
    item.addEventListener('click', async function () {
        let storage_data = await browser.storage.local.get(null);
        let translation = storage_data['translation'] ?? {};
        let trans_src = document.getElementById('i-translate-src').value.trim().toLowerCase();
        let trans_res = document.getElementById(item.dataset.trans_id).innerText;
        if (append) {
            if (!translation[trans_src]) {
                translation[trans_src] = trans_res;
            } else {
                let tmp = translation[trans_src].split('; ');
                if (!tmp.includes(trans_res)) {
                    translation[trans_src] = translation[trans_src] + '; ' + trans_res;
                }
            }
        } else {
            translation[trans_src] = trans_res;
        }
        await browser.storage.local.set({
            'translation': translation,
            'latest': trans_src
        });
        refresh();
    });
}

function transDelete(item) {
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

function transEdit(item) {
    item.title = 'Edit';
    item.addEventListener('blur', transUpdate);
    item.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            transUpdate(event);
        }
    })
}

async function transUpdate(event) {
    let storage_data = await browser.storage.local.get(null);
    let translation = storage_data['translation'] ?? {};
    let trans = document.getElementById(event.target.dataset.trans_id).innerText;
    let new_trans = event.target.innerText.trim().replace(/\r\n\t/g, ' ').replace(/\s+/g, ' ');
    if (new_trans) {
        translation[trans] = new_trans;
    }
    await browser.storage.local.set({ 'translation': translation });
    refresh();
}

function transPick(item) {
    item.title = 'Pick';
    item.addEventListener('click', function () {
        document.getElementById('i-translate-src').value = item.innerText;
        translate();
    });
}

function drawTranslateResult(result) {
    document.getElementById('i-translate-res').innerHTML = result
        .map((item) => {
            let id = 'trans-save' + hashCode(item);
            return `
            <span class="trans-save trans-new" data-trans_id="${id}">💾</span>
            <span class="trans-save trans-append" data-trans_id="${id}">+💾</span>
            <span id="${id}" contenteditable="true" title="Edit">${item}</span>
            `;
        })
        .join('<span style="display:block;height:5px;"></span>');
    document.querySelectorAll('.trans-new').forEach((item) => transSave(item));
    document.querySelectorAll('.trans-append').forEach((item) => transSave(item, true));
}

function runApiTranslated(lanf_from, lang_to, query) {
    console.log('TRANSLATE BY: translated.net');
    let request = `https://api.mymemory.translated.net/get?langpair=${lanf_from}|${lang_to}&q=${encodeURIComponent(query)}`;
    fetch(request).then(function (response) {
        return response.json();
    }).then(function (data) {
        let trans_res = data?.responseData?.translatedText?.toLowerCase();
        let trans_res_all = [trans_res];
        if (data['matches']) {
            for (m of data['matches']) {
                let tmp = m.translation.trim().toLowerCase();
                if ('' === tmp) continue;
                if (trans_res_all.includes(tmp)) continue;
                trans_res_all.push(tmp);
            }
        }
        console.log('TRANSLATE RESULT: ' + trans_res_all);
        drawTranslateResult(trans_res_all);
    }).catch(function (err) {
        console.log('TRANSLATE ERROR: ', err);
    });
}

function runApiGoogle(lanf_from, lang_to, query) {
    console.log('TRANSLATE BY: googleapis.com');
    let request = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${lanf_from}&tl=${lang_to}&dt=t&dt=bd&dj=1&q=${encodeURIComponent(query)}`;
    fetch(request).then(function (response) {
        return response.json();
    }).then(function (data) {
        let trans_res_all = [];
        if (data['sentences']) {
            for (m of data['sentences']) {
                let tmp = m.trans.trim().toLowerCase();
                if ('' === tmp) continue;
                if (trans_res_all.includes(tmp)) continue;
                trans_res_all.push(tmp);
            }
        }
        if (data['dict']) {
            for (m of data['dict']) {
                let tmp = m.terms[0].trim().toLowerCase();
                if ('' === tmp) continue;
                if (trans_res_all.includes(tmp)) continue;
                trans_res_all.push(tmp);
            }
            for (m of data['dict']) {
                let tmp = m.terms.join('; ');
                if ('' === tmp) continue;
                if (trans_res_all.includes(tmp)) continue;
                trans_res_all.push(tmp);
            }
        }
        console.log('TRANSLATE RESULT: ' + trans_res_all);
        drawTranslateResult(trans_res_all);
    }).catch(function (err) {
        console.log('TRANSLATE ERROR: ', err);
    });
}

async function translate() {
    let query = document.getElementById('i-translate-src').value.trim().toLowerCase();
    console.log('TRANSLATE TEXT: ' + query);
    if ('' === query) return;
    let storage_data = await browser.storage.local.get(null);
    let api = storage_data['config']['api'];
    let lang_from = storage_data['config']['translate-from'];
    let lang_to = storage_data['config']['translate-to'];
    switch (api) {
        case '1':
            runApiTranslated(lang_from, lang_to, query);
            break;
        default:
            runApiGoogle(lang_from, lang_to, query);
    }
}

function exportShow() {
    document.getElementById('i-export').style.display = null;
}

function exportCopy() {
    let iExport = document.getElementById('i-export');
    navigator.clipboard.writeText(iExport.value);
}

async function getSelectedText() {
    try {
        let tabs = await browser.tabs.query({ currentWindow: true, active: true });
        let tab = tabs[0];
        let selectedText = await browser.tabs.sendMessage(tab.id, { message: 'getSelectedText' });
        let iTranslateSrc = document.getElementById('i-translate-src');
        iTranslateSrc.value = selectedText;
    } catch (e) {
        console.log('GET SELECTED TEXT ERROR: ', e);
    }
}

async function refresh() {
    let selApi = document.getElementById('sel-api');
    let iTranslateFrom = document.getElementById('i-translate-from');
    let iTranslateTo = document.getElementById('i-translate-to');
    let iExportPattern = document.getElementById('i-export-pattern');
    let iPairs = document.getElementById('i-pairs');
    let btnSiteTranslate = document.getElementById('btn-site-translate');
    let btnSwitchFromTo = document.getElementById('btn-switch-from-to');
    let btnExportShow = document.getElementById('btn-export-show');
    let btnExportCopy = document.getElementById('btn-export-copy');
    let iExport = document.getElementById('i-export');

    let storage_data = await browser.storage.local.get(null);
    let config = storage_data['config'] ?? {};
    selApi.value = config['api'];
    iTranslateFrom.value = config['translate-from'];
    iTranslateTo.value = config['translate-to'];
    iExportPattern.value = config['export-pattern'];

    selApi.addEventListener('change', () => configSave().then(() => translate()));
    iTranslateFrom.addEventListener('blur', () => configSave().then(() => translate()));
    iTranslateTo.addEventListener('blur', () => configSave().then(() => translate()));
    iTranslateFrom.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            configSave().then(() => translate());
        }
    });
    iTranslateTo.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            configSave().then(() => translate());
        }
    });
    iExportPattern.addEventListener('blur', () => configSave().then(() => refresh()));
    iExportPattern.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            configSave().then(() => refresh());
        }
    })
    btnSiteTranslate.addEventListener('click', () => {
        let api = config['api'];
        let lang_from = config['translate-from'];
        let lang_to = config['translate-to'];
        let query = document.getElementById('i-translate-src').value.trim();
        let url = ('1' === api) ?
            `https://laratranslate.com/translate?source=${lang_from}&target=${lang_to}&text=${encodeURIComponent(query)}` :
            `https://translate.google.com/?sl=${lang_from}&tl=${lang_to}&text=${encodeURIComponent(query)}`;
        window.open(url, '_blank');
    });
    btnSwitchFromTo.addEventListener('click', () => {
        let tmp = iTranslateFrom.value;
        iTranslateFrom.value = iTranslateTo.value;
        iTranslateTo.value = tmp;
        configSave();
    });
    btnExportShow.addEventListener('click', () => exportShow());
    btnExportCopy.addEventListener('click', () => exportCopy());

    let translation = storage_data['translation'] ?? {};
    let latest = storage_data['latest'] ?? '';
    let keys = Object.keys(translation);
    let pairs = new Map();
    for (let key of keys) {
        let value = translation[key];
        pairs.set(key, value);
    }
    let pairsSorted = new Map([...pairs.entries()].sort());
    iPairs.innerHTML = '';
    let export_text = '';
    pairsSorted.forEach((value, key, map) => {
        let id = 'trans-delete' + hashCode(key);
        let latest_str = key === latest ? ' class="latest"' : '';
        iPairs.innerHTML += `
            <div${latest_str}>
            <span class="trans-delete" data-trans_id="${id}">☒</span>
            <b class="trans-pick" id="${id}">${key}</b>
            <span class="trans-edit" contenteditable="true" data-trans_id="${id}">${value}</span>
            </div>
            `;
        export_text += config['export-pattern'].replace(/{from}/g, key).replace(/{to}/g, value) + '\r\n';
    });
    iExport.innerHTML = export_text;

    document.querySelectorAll('.trans-delete').forEach((item) => transDelete(item));
    document.querySelectorAll('.trans-pick').forEach((item) => transPick(item));
    document.querySelectorAll('.trans-edit').forEach((item) => transEdit(item));
}

function textareaEvents() {
    let iTranslateSrc = document.getElementById('i-translate-src');
    setTimeout(() => iTranslateSrc.focus(), 0);
    let t = null;
    iTranslateSrc.addEventListener('input', () => {
        if (t) clearTimeout(t);
        t = setTimeout(() => translate(), 500);
    });
}

async function awaitWithTimeout(promise, timeoutMs = 500) {
    const timeout = new Promise(
        (_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    );
    try {
        return await Promise.race([promise, timeout]);
    } catch (error) {
        if (error.message === 'Timeout') {
            console.log('Operation timed out after 1 second');
            return null;
        }
        console.log(error.message);
        throw error;
    }
}

(async function run() {
    await awaitWithTimeout(getSelectedText());
    await configInit();
    await translate();
    await refresh();
    textareaEvents();
})();
