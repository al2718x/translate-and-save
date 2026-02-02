(async function run() {
    let iTranslateSrc = document.getElementById('i-translate-src');
    let iTranslateRes = document.getElementById('i-translate-res');
    let selApi = document.getElementById('sel-api');
    let iTranslateFrom = document.getElementById('i-translate-from');
    let iTranslateTo = document.getElementById('i-translate-to');
    let selProfiles = document.getElementById('sel-profiles');
    let btnProfilesToggle = document.getElementById('btn-profiles-toggle');
    let iExportPattern = document.getElementById('i-export-pattern');
    let iPairs = document.getElementById('i-pairs');
    let btnSiteTranslate = document.getElementById('btn-site-translate');
    let btnSwitchFromTo = document.getElementById('btn-switch-from-to');
    let btnExportToggle = document.getElementById('btn-export-toggle');
    let btnExportCopy = document.getElementById('btn-export-copy');
    let btnExportSave = document.getElementById('btn-export-save');
    let iExport = document.getElementById('i-export');
    let iSpinner = document.getElementById('i-spinner');

    async function initConfig() {
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
        if (!config['show-profiles']) {
            config['show-profiles'] = false;
        }
        if (!config['export-pattern']) {
            config['export-pattern'] = '{from}|{to}';
        }
        await browser.storage.local.set({
            'config': config
        });
        return storage_data;
    }

    function initDom(config) {
        let t = null;
        iTranslateSrc.addEventListener('input', () => {
            if (t) clearTimeout(t);
            t = setTimeout(() => translate(), 500);
        });
        selApi.value = config['api'];
        iTranslateFrom.value = config['translate-from'];
        iTranslateTo.value = config['translate-to'];
        iExportPattern.value = config['export-pattern'];
        profilesShow(config['show-profiles']);
        selApi.addEventListener('change', () => configSave().then(() => translate()));
        iTranslateFrom.addEventListener('blur', () => validateAndSaveLang(iTranslateFrom.value));
        iTranslateTo.addEventListener('blur', () => validateAndSaveLang(iTranslateTo.value));
        iTranslateFrom.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                validateAndSaveLang(iTranslateFrom.value);
            }
        });
        iTranslateTo.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                validateAndSaveLang(iTranslateTo.value);
            }
        });
        selProfiles.addEventListener('change', () => selectProfile());
        btnProfilesToggle.addEventListener('click', () => profilesToggle());
        iExportPattern.addEventListener('blur', () => configSave().then(() => refresh()));
        iExportPattern.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                configSave().then(() => refresh());
            }
        });
        btnSiteTranslate.addEventListener('click', () => {
            let api = selApi.value;
            let lang_from = iTranslateFrom.value;
            let lang_to = iTranslateTo.value;
            let query = iTranslateSrc.value.trim();
            let url = ('1' === api) ?
                `https://laratranslate.com/translate?source=${lang_from}&target=${lang_to}&text=${encodeURIComponent(query)}` :
                `https://translate.google.com/?sl=${lang_from}&tl=${lang_to}&text=${encodeURIComponent(query)}`;
            window.open(url, '_blank');
        });
        btnSwitchFromTo.addEventListener('click', () => {
            let tmp = iTranslateFrom.value;
            iTranslateFrom.value = iTranslateTo.value;
            iTranslateTo.value = tmp;
            configSave().then(() => translate());
        });
        btnExportToggle.addEventListener('click', () => exportToggle());
        btnExportCopy.addEventListener('click', () => exportCopy());
        btnExportSave.addEventListener('click', () => exportSave(`${iTranslateFrom.value}-${iTranslateTo.value}.txt`));
        setTimeout(() => iTranslateSrc.focus(), 0);
    }

    function hashCode(s) {
        return [...s].reduce(
            (hash, c) => (Math.imul(31, hash) + c.charCodeAt(0)) | 0,
            0
        );
    }

    async function validateAndSaveLang(value) {
        if (value.length < 2) {
            await initConfig();
        }
        if (!/^[a-zA-Z_\-]+$/.test(value)) {
            await initConfig();
        }
        configSave().then(() => translate());
    }

    async function configSave() {
        let storage_data = await browser.storage.local.get(null);
        let config = storage_data['config'] ?? {};
        config['api'] = selApi.value;
        config['translate-from'] = iTranslateFrom.value;
        config['translate-to'] = iTranslateTo.value;
        config['show-profiles'] = selProfiles.style.display !== 'none';
        config['export-pattern'] = iExportPattern.value;
        await browser.storage.local.set({
            'config': config
        });
    }

    function transKey() {
        return iTranslateFrom.value + '~' + iTranslateTo.value;
    }

    function pairSave(item, append = false) {
        item.title = (append) ? 'Save append' : 'Save new';
        item.addEventListener('click', async function () {
            let storage_data = await browser.storage.local.get(null);
            let profiles = storage_data['profiles'] ?? {};
            let translation = storage_data['data-' + transKey()] ?? {};
            let trans_src = iTranslateSrc.value.trim().toLowerCase();
            let trans_res = document.getElementById(item.dataset.trans_id).innerText;
            profiles[transKey()] = trans_src;
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
                'profiles': profiles,
                ['data-' + transKey()]: translation
            });
            await refresh();
        });
    }

    function pairDelete(item) {
        item.title = 'Delete';
        item.addEventListener('click', async function () {
            if (!item.classList.contains('confirmed')) {
                item.classList.add('confirmed');
                setTimeout(() => item.classList.remove('confirmed'), 2000);
                return;
            }
            let storage_data = await browser.storage.local.get(null);
            let translation = storage_data['data-' + transKey()] ?? {};
            let trans = document.getElementById(item.dataset.trans_id).innerText;
            delete translation[trans];
            await browser.storage.local.set({
                ['data-' + transKey()]: translation
            });
            if (Object.keys(translation).length === 0) { //if it was last pair then delete profile too
                let profiles = storage_data['profiles'] ?? {};
                delete profiles[transKey()];
                await browser.storage.local.set({
                    'profiles': profiles
                });
                let config = storage_data['config'] ?? {};
                if (config['show-profiles']) {
                    profilesShow(false);
                }
            }
            await refresh();
        });
    }

    function pairEdit(item) {
        item.title = 'Edit';
        item.addEventListener('blur', (event) => pairUpdate(event));
        item.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                pairUpdate(event);
            }
        })
    }

    async function pairUpdate(event) {
        let storage_data = await browser.storage.local.get(null);
        let profiles = storage_data['profiles'] ?? {};
        let translation = storage_data['data-' + transKey()] ?? {};
        let trans = document.getElementById(event.target.dataset.trans_id).innerText;
        let new_trans = event.target.innerText.trim().replace(/\r\n\t/g, ' ').replace(/\s+/g, ' ');
        if (new_trans) {
            profiles[transKey()] = trans;
            translation[trans] = new_trans;
        }
        await browser.storage.local.set({
            'profiles': profiles,
            ['data-' + transKey()]: translation
        });
        await refresh();
    }

    function pairPick(item) {
        item.title = 'Pick';
        item.addEventListener('click', function () {
            iTranslateSrc.value = item.innerText;
            translate();
        });
    }

    function drawTranslateResult(result) {
        iTranslateRes.innerHTML = result
            .map((item) => {
                let id = 'trans-save' + hashCode(item);
                return `
                <div class="trans-item">
                <span class="trans-save trans-new" data-trans_id="${id}">💾</span>
                <span class="trans-save trans-append" data-trans_id="${id}">💾💾</span>
                <i id="${id}" contenteditable="true" title="Edit">${item}</i>
                </div>
                `;
            })
            .join('');
        document.querySelectorAll('.trans-new').forEach((item) => pairSave(item));
        document.querySelectorAll('.trans-append').forEach((item) => pairSave(item, true));
    }

    async function runApiTranslated(lanf_from, lang_to, query) {
        console.log('TRANSLATE BY: translated.net');
        let request = `https://api.mymemory.translated.net/get?langpair=${lanf_from}|${lang_to}&q=${encodeURIComponent(query)}`;
        let response = await withTimeout(fetch(request), 2000);
        if (!response) {
            throw new Error('Timeout');
        }
        if (!response.ok) {
            throw new Error(response.statusText);
        }
        let data = await response.json();
        console.log('TRANSLATE RAW: ' + JSON.stringify(data));
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
        return trans_res_all;
    }

    async function runApiGoogle(lanf_from, lang_to, query) {
        console.log('TRANSLATE BY: googleapis.com');
        let request = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${lanf_from}&tl=${lang_to}&dt=t&dt=bd&dj=1&q=${encodeURIComponent(query)}`;
        let response = await withTimeout(fetch(request), 2000);
        if (!response) {
            throw new Error('Timeout');
        }
        if (!response.ok) {
            throw new Error(response.statusText);
        }
        let data = await response.json();
        console.log('TRANSLATE RAW: ' + JSON.stringify(data));
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
        return trans_res_all;
    }

    async function translate(force_refresh = true) {
        let query = iTranslateSrc.value.trim().toLowerCase();
        console.log('TRANSLATE TEXT: ' + query);
        let do_refresh = force_refresh;
        if ('' === query) {
            iTranslateRes.innerHTML = '';
        } else {
            let api = selApi.value;
            let lang_from = iTranslateFrom.value;
            let lang_to = iTranslateTo.value;
            iSpinner.style.display = null;
            try {
                let trans_res_all = [];
                switch (api) {
                    case '1':
                        trans_res_all = await runApiTranslated(lang_from, lang_to, query);
                        break;
                    default:
                        trans_res_all = await runApiGoogle(lang_from, lang_to, query);
                }
                console.log('TRANSLATE RESULT: ' + trans_res_all);
                drawTranslateResult(trans_res_all);
                do_refresh = true;
            } catch (err) {
                console.log('TRANSLATE ERROR: ', err);
                iTranslateRes.innerHTML = err;
            }
            iSpinner.style.display = 'none';
        }
        if (do_refresh) {
            await refresh();
        }
    }

    function selectProfile() {
        let key = selProfiles.value;
        console.log('SELECT PROFILE: ' + key);
        let translate_from = key.split('~')[0];
        let translate_to = key.split('~')[1];
        if (!translate_from || !translate_to) return;
        iTranslateFrom.value = translate_from;
        iTranslateTo.value = translate_to;
        configSave().then(() => translate());
    }

    function profilesShow(show) {
        if (show) {
            iTranslateFrom.style.display = 'none';
            iTranslateTo.style.display = 'none';
            btnSwitchFromTo.style.display = 'none';
            selProfiles.style.display = null;
            btnProfilesToggle.value = '△';
            btnProfilesToggle.title = 'Edit profiles';
        } else {
            selProfiles.style.display = 'none';
            iTranslateFrom.style.display = null;
            iTranslateTo.style.display = null;
            btnSwitchFromTo.style.display = null;
            btnProfilesToggle.value = '▽';
            btnProfilesToggle.title = 'Show profiles selector';
        }
        configSave();
    }

    function profilesToggle() {
        profilesShow('none' === selProfiles.style.display);
    }

    function exportToggle() {
        if ('none' === iExport.style.display) {
            iExport.style.display = null;
            btnExportToggle.value = '△';
            btnExportToggle.title = 'Hide export';
        } else {
            iExport.style.display = 'none';
            btnExportToggle.value = '▽';
            btnExportToggle.title = 'Show export';
        }
    }

    function exportCopy() {
        navigator.clipboard.writeText(iExport.value);
    }

    function exportSave(filename) {
        let element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(iExport.value));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    function refreshDraw(storage_data) {
        let profiles = storage_data['profiles'] ?? {};
        let latest = profiles[transKey()] ?? '';
        let keys_profiles = Object.keys(profiles);
        selProfiles.innerHTML = '';
        let profile_exists = false;
        for (let key of keys_profiles) {
            let option = document.createElement('option');
            option.value = key;
            option.text = key.replace(/~/g, ' \u2192 ');
            if (key === transKey()) {
                profile_exists = true;
                option.selected = true;
            }
            selProfiles.appendChild(option);
        }
        if (!profile_exists) { //profile was deleted with his last deleted pair, but we need to show something here
            let option = document.createElement('option');
            option.value = transKey();
            option.text = transKey().replace(/~/g, ' \u2192 ');
            option.selected = true;
            selProfiles.appendChild(option);
        }
        let translation = storage_data['data-' + transKey()] ?? {};
        let keys = Object.keys(translation);
        let pairs = new Map();
        for (let key of keys) {
            let value = translation[key];
            pairs.set(key, value);
        }
        let pairsSorted = new Map([...pairs.entries()].sort());
        let pairs_html = '';
        let export_text = '';
        pairsSorted.forEach((value, key, map) => {
            let id = 'trans-delete' + hashCode(key);
            let latest_str = key === latest ? ' class="latest"' : '';
            pairs_html += `
            <div${latest_str}>
            <span class="trans-delete" data-trans_id="${id}">☒</span>
            <b class="trans-pick" id="${id}">${key}</b>
            <span class="trans-edit" contenteditable="true" data-trans_id="${id}">${value}</span>
            </div>
            `;
            export_text += iExportPattern.value.replace(/{from}/g, key).replace(/{to}/g, value) + '\r\n';
        });
        iPairs.innerHTML = pairs_html;
        iExport.innerHTML = export_text;
        document.querySelectorAll('.trans-delete').forEach((item) => pairDelete(item));
        document.querySelectorAll('.trans-pick').forEach((item) => pairPick(item));
        document.querySelectorAll('.trans-edit').forEach((item) => pairEdit(item));
    }

    async function refresh() {
        let storage_data = await browser.storage.local.get(null);
        refreshDraw(storage_data);
    }

    async function getSelectedText() {
        try {
            let tabs = await browser.tabs.query({ currentWindow: true, active: true });
            let tab = tabs[0];
            let selectedText = await browser.tabs.sendMessage(tab.id, { message: 'getSelectedText' });
            iTranslateSrc.value = selectedText.replace(/\s+\n/g, '\n').replace(/\n\s+/g, '\n');
        } catch (e) {
            console.log('GET SELECTED TEXT ERROR: ', e);
        }
    }

    async function withTimeout(promise, timeoutMs) {
        const timeout = new Promise(
            (_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs)
        );
        try {
            return await Promise.race([promise, timeout]);
        } catch (error) {
            if (error.message === 'Timeout') {
                console.log(`Operation timed out after ${timeoutMs} ms`);
                return null;
            }
            console.log(error.message);
            throw error;
        }
    }

    let init_storage_data = await initConfig();
    initDom(init_storage_data['config']);
    refreshDraw(init_storage_data);
    await withTimeout(getSelectedText(), 200);
    await translate(false);
})();
