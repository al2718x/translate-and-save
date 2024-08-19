function hashCode(s) {
    return [...s].reduce(
        (hash, c) => (Math.imul(31, hash) + c.charCodeAt(0)) | 0,
        0
    );
}

async function setupSave() {
    let storage_data = await browser.storage.local.get(null);
    let config = storage_data['config'] ?? {};
    config['api'] = document.getElementById('sel-api').value;
    config['translate-from'] = document.getElementById('i-translate-from').value;
    config['translate-to'] = document.getElementById('i-translate-to').value;
    await browser.storage.local.set({ 'config': config });
}

function transSave(item) {
    item.title = 'Save';
    item.addEventListener('click', async function () {
        let storage_data = await browser.storage.local.get(null);
        let translation = storage_data['translation'] ?? {};
        let trans_src = document.getElementById('i-translate-src').value.trim().toLowerCase();
        let trans_res = document.getElementById(item.dataset.trans_id).innerText;
        translation[trans_src] = trans_res;
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
            <span class="trans-save" data-trans_id="${id}">💾</span>
            <span id="${id}">${item}</span>
            `;
        })
        .join('<span style="display:block;height:5px;"></span>');
    document.querySelectorAll('.trans-save').forEach((item) => transSave(item));
}

function runApiTranslated(lanf_from, lang_to, query) {
    console.log('TRANSLATE BY translated.net');
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
    console.log('TRANSLATE BY googleapis.com');
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

async function translate(setup_save = true) {
    if (setup_save) await setupSave();
    let query = document.getElementById('i-translate-src').value.trim().toLowerCase();
    console.log('TRANSLATE TEXT: ' + query);
    if ('' === query) return;
    let storage_data = await browser.storage.local.get(null);
    let api = storage_data['config']['api'] ?? '0';
    let lang_from = storage_data['config']['translate-from'] ?? 'en';
    let lang_to = storage_data['config']['translate-to'] ?? 'it';
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
    let selApi = document.getElementById('sel-api');
    let iTranslateFrom = document.getElementById('i-translate-from');
    let iTranslateTo = document.getElementById('i-translate-to');
    let btnSetupSave = document.getElementById('btn-setup-save');
    let iPairs = document.getElementById('i-pairs');
    let btnExportShow = document.getElementById('btn-export-show');
    let iExport = document.getElementById('i-export');

    btnTranslate.addEventListener('click', () => translate());

    let storage_data = await browser.storage.local.get(null);
    let config = storage_data['config'] ?? {};
    if (!config['api'] || !config['translate-from'] || !config['translate-to']) {
        config['api'] = '0';
        config['translate-from'] = 'en';
        config['translate-to'] = 'it';
        await browser.storage.local.set({ 'config': config });
    }
    selApi.value = config['api'] ?? '0';
    iTranslateFrom.value = config['translate-from'] ?? 'en';
    iTranslateTo.value = config['translate-to'] ?? 'it';
    btnSetupSave.addEventListener('click', () => setupSave());

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
    iExport.innerHTML = '';
    pairsSorted.forEach((value, key, map) => {
        let id = 'trans-delete' + hashCode(key);
        let latest_str = key === latest ? ' class="latest"' : '';
        iPairs.innerHTML += `
            <div${latest_str}>
            <span class="trans-delete" data-trans_id="${id}">❌</span>
            <b class="trans-pick" id="${id}">${key}</b>
            ${value}
            </div>
            `;
        iExport.innerHTML += `${key} = ${value}\r\n`;
    });
    btnExportShow.addEventListener('click', () => exportShow());

    document.querySelectorAll('.trans-delete').forEach((item) => transDelete(item));
    document.querySelectorAll('.trans-pick').forEach((item) => transPick(item));
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

(async function run() {
    await getSelectedText();
    await translate(false);
    await refresh();
    textareaEvents();
})();
