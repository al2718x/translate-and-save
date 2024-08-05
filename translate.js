function hashCode(s) {
    return [...s].reduce(
        (hash, c) => (Math.imul(31, hash) + c.charCodeAt(0)) | 0,
        0
    );
}

function saveTrans(trans_from, trans_to) {
    let storingNote = browser.storage.local.set({ [trans_from]: trans_to });
    storingNote.then(() => {
        console.log('SAVED: ' + trans_from + ' | ' + trans_to);
        console.log('STORAGE:');
        let gettingAllStorageItems = browser.storage.local.get(null);
        gettingAllStorageItems.then((data) => {
            let keys = Object.keys(data);
            for (let key of keys) {
                let value = data[key];
                console.log(key + ' ' + value);
            }
        }, (error) => console.log(error));
    }, (error) => console.log(error));
}

function drawPopup(header, content) {
    let i_popup = document.createElement('div');
    let i_close = document.createElement('button');
    let i_header = document.createElement('div');
    let i_content = document.createElement('div');

    i_popup.style.position = 'fixed';
    i_popup.style.zIndex = 10000;
    i_popup.style.minWidth = '100px';
    i_popup.style.maxWidth = '300px';
    i_popup.style.left = '50%';
    i_popup.style.top = '50%';
    i_popup.style.transform = 'translate(-50%, -50%)';
    i_popup.style.padding = '15px';
    i_popup.style.border = 'border:1px solid #777';
    i_popup.style.borderRadius = '5px';
    i_popup.style.color = '#000';
    i_popup.style.backgroundColor = '#fff';
    i_popup.style.boxShadow = '0 1px 5px #777';
    i_popup.style.fontFamily = 'sans-serif';
    i_popup.style.fontSize = '12px';
    i_popup.style.lineHeight = '1rem';

    i_close.style.cursor = 'pointer';
    i_close.style.float = 'right';
    i_close.style.border = 'none';
    i_close.style.backgroundColor = '#fff';
    i_close.style.fontSize = '10px';
    i_close.style.margin = '-2px -4px 0 0';
    i_close.innerHTML = '❌';
    i_close.addEventListener('click', () => document.body.removeChild(i_popup));

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

    i_popup.appendChild(i_close);
    i_popup.appendChild(i_header);
    i_popup.appendChild(i_content);

    document.body.appendChild(i_popup);
    document.querySelectorAll('.trans-save').forEach(function (item) {
        item.style.color = '#070';
        item.style.cursor = 'pointer';
        item.style.marginRight = '2px';
        item.title = 'Save';
        item.addEventListener('click', () => {
            let trans = document.getElementById(item.dataset.trans_id).innerText;
            saveTrans(header, trans);
            document.body.removeChild(i_popup);
        });
    });

    addEventListener('keydown', (event) => {
        if ('Escape' == event.code) document.body.removeChild(i_popup);
    });
}

function translate() {
    let trans_from = document.getSelection().toString().toLowerCase();
    if ('' === trans_from) {
        trans_from = 'select text to translate!';
    }
    console.log('TRANSLATE FROM: ' + trans_from);
    let request = 'https://api.mymemory.translated.net/get?langpair=en|it&q=' + trans_from;
    console.log(request);
    fetch(request).then(function (response) {
        return response.json();
    }).then(function (data) {
        let trans_to = data.responseData.translatedText.toLowerCase();
        let trans_all = [trans_to];
        for (m of data.matches) {
            let tmp = m.translation.trim().toLowerCase();
            if ('' == tmp) continue;
            if (trans_all.includes(tmp)) continue;
            trans_all.push(tmp);
        }
        console.log('TRANSLATE RESULT: ' + trans_all);
        drawPopup(trans_from, trans_all);
    }).catch(function (err) {
        console.log('TRANSLATE FETCH ERROR: ', err);
    });
}

translate();
