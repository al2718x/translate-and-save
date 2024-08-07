browser.runtime.onMessage.addListener((request) => {
    if ('getSelectedText' == request.message) {
        return new Promise(resolve => {
            setTimeout(() => resolve(document.getSelection().toString().toLowerCase()), 100);
        });
    }
    if ('translateText' == request.message) {
        translate(request.text);
    }
    return new Promise(resolve => {
        setTimeout(() => resolve(''), 100);
    });
});

function hashCode(s) {
    return [...s].reduce(
        (hash, c) => (Math.imul(31, hash) + c.charCodeAt(0)) | 0,
        0
    );
}

async function saveTrans(trans_src, trans_res) {
    let data = await browser.storage.local.get(null);
    let translation = data['translation'] ?? {};
    translation[trans_src] = trans_res;
    await browser.storage.local.set({ 'translation': translation });
}

function removeForm(i_form) {
    if (document.body.contains(i_form)) {
        document.body.removeChild(i_form);
    }
}

function drawForm(header, content) {
    let i_form_old = document.getElementById('i-translate-and-save-form');
    if (i_form_old && document.body.contains(i_form_old)) {
        document.body.removeChild(i_form_old);
    }

    let i_form = document.createElement('div');
    let i_close = document.createElement('button');
    let i_header = document.createElement('div');
    let i_content = document.createElement('div');

    i_form.id = 'i-translate-and-save-form';
    i_form.style.position = 'fixed';
    i_form.style.zIndex = 10000;
    i_form.style.minWidth = '100px';
    i_form.style.maxWidth = '300px';
    i_form.style.left = '50%';
    i_form.style.top = '50%';
    i_form.style.transform = 'translate(-50%, -50%)';
    i_form.style.padding = '15px';
    i_form.style.border = 'border:1px solid #777';
    i_form.style.borderRadius = '5px';
    i_form.style.color = '#000';
    i_form.style.backgroundColor = '#fff';
    i_form.style.boxShadow = '0 1px 5px #777';
    i_form.style.fontFamily = 'sans-serif';
    i_form.style.fontSize = '12px';
    i_form.style.lineHeight = '1rem';

    i_close.style.cursor = 'pointer';
    i_close.style.float = 'right';
    i_close.style.border = 'none';
    i_close.style.backgroundColor = '#fff';
    i_close.style.fontSize = '10px';
    i_close.style.margin = '-2px -4px 0 0';
    i_close.innerHTML = '❌';
    i_close.addEventListener('click', () => removeForm(i_form));

    i_header.style.marginBottom = '10px';
    i_header.style.padding = '0 30px 10px 0';
    i_header.style.borderBottom = '1px solid #777';
    i_header.style.fontWeight = 'bold';
    i_header.innerHTML = header;

    i_content.innerHTML = content
        .map((item) => {
            let id = 'trans-' + hashCode(item);
            return `
            <span class="trans-save" data-trans_id="${id}">💾</span>
            <span id="${id}">${item}</span>
            `;
        })
        .join('<span style="display:block;height:5px;"></span>');

    i_form.appendChild(i_close);
    i_form.appendChild(i_header);
    i_form.appendChild(i_content);

    document.body.appendChild(i_form);
    document.querySelectorAll('.trans-save').forEach(function (item) {
        item.style.color = '#070';
        item.style.cursor = 'pointer';
        item.style.marginRight = '2px';
        item.title = 'Save';
        item.addEventListener('click', async function () {
            let trans = document.getElementById(item.dataset.trans_id).innerText;
            await saveTrans(header, trans);
            removeForm(i_form);
        });
    });

    addEventListener('keydown', (event) => {
        if ('Escape' == event.code) {
            removeForm(i_form);
        }
    });
}

async function translate(trans_src) {
    // let trans_src = document.getSelection().toString().toLowerCase();
    if ('' === trans_src) {
        trans_src = 'select text to translate!';
    }
    console.log('TRANSLATE SOURCE: ' + trans_src);
    let data = await browser.storage.local.get(null);
    let trans_from = data['config']['translate-from'] ?? 'en';
    let trans_to = data['config']['translate-to'] ?? 'it';
    let request = `https://api.mymemory.translated.net/get?langpair=${trans_from}|${trans_to}&q=${trans_src}`;
    fetch(request).then(function (response) {
        return response.json();
    }).then(function (data) {
        let trans_res = data.responseData.translatedText.toLowerCase();
        let trans_res_all = [trans_res];
        for (m of data.matches) {
            let tmp = m.translation.trim().toLowerCase();
            if ('' == tmp) continue;
            if (trans_res_all.includes(tmp)) continue;
            trans_res_all.push(tmp);
        }
        console.log('TRANSLATE RESULT: ' + trans_res_all);
        drawForm(trans_src, trans_res_all);
    }).catch(function (err) {
        console.log('TRANSLATE FETCH ERROR: ', err);
    });
}
