/* Contact form: validation, and the hand-off to whatever will actually send it.
   ---------------------------------------------------------------------------
   NOTHING IS SENT YET. This is a static site, so there is no server to post to.
   Put a URL on the form to go live:

       <form class="ct-form" id="ctForm" data-endpoint="https://formspree.io/f/xxxx">

   With an endpoint it POSTs JSON and reports a real failure if the request
   does not come back OK. Without one it validates, shows the confirmation
   panel, and logs the payload to the console — so the page can be demonstrated
   without quietly pretending an email went out. The confirmation copy says
   which of the two happened.
*/
(() => {
  const form = document.getElementById('ctForm');
  const sent = document.getElementById('ctSent');
  if (!form || !sent) return;

  const body  = document.getElementById('ctSentBody');
  const again = document.getElementById('ctAgain');
  const btn   = form.querySelector('.ct-submit');
  const btnT  = form.querySelector('.ct-submit-t');
  const LIVE  = form.dataset.endpoint || '';

  const errOf = el => {
    // the message span is a sibling inside the same label
    const box = el.closest('.ct-field, .ct-consent');
    return box ? box.querySelector('[data-err]') : null;
  };

  const setErr = (el, msg) => {
    const box = el.closest('.ct-field, .ct-consent');
    const slot = errOf(el);
    if (box) box.classList.toggle('has-err', !!msg);
    if (slot) slot.textContent = msg || '';
  };

  const RULES = [
    ['name',    v => v.trim().length >= 2      || 'Please tell us your name.'],
    ['email',   v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'That does not look like an email address.'],
    ['message', v => v.trim().length >= 12     || 'A sentence or two about the project, please.']
  ];

  const check = () => {
    let first = null;
    for (const [name, ok] of RULES) {
      const el = form.elements[name];
      const res = ok(el.value);
      setErr(el, res === true ? '' : res);
      if (res !== true && !first) first = el;
    }
    const consent = form.elements.consent;
    setErr(consent, consent.checked ? '' : 'We need this to be able to reply.');
    if (!consent.checked && !first) first = consent;
    return first;
  };

  // clear a field's error as soon as it is put right, but never show a new one
  // while someone is still mid-sentence
  form.addEventListener('input', e => {
    const box = e.target.closest('.ct-field, .ct-consent');
    if (box && box.classList.contains('has-err')) setErr(e.target, '');
  });

  const payload = () => {
    const d = new FormData(form);
    const out = Object.fromEntries(d.entries());
    out.service = d.getAll('service');          // checkboxes, so keep them all
    out.consent = !!form.elements.consent.checked;
    return out;
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const bad = check();
    if (bad) {
      bad.focus({ preventScroll: true });
      bad.closest('.ct-field, .ct-consent').scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    const data = payload();

    if (!LIVE) {
      console.log('[contact] no data-endpoint set — nothing was sent. Payload:', data);
      body.innerHTML = 'This form has no mail service connected yet, so <b>nothing was actually sent</b>. ' +
                       'Add a <code>data-endpoint</code> to the form to go live. ' +
                       'In the meantime, email <a href="mailto:studio@dearchitect.com">studio@dearchitect.com</a> directly.';
      form.hidden = true; sent.hidden = false;
      sent.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    btn.disabled = true;
    btnT.textContent = 'Sending…';
    try {
      const res = await fetch(LIVE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      form.hidden = true; sent.hidden = false;
      sent.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } catch (err) {
      console.error('[contact] send failed', err);
      btn.disabled = false;
      btnT.textContent = 'Send enquiry';
      // say so rather than showing a thank-you for a message that never left
      let note = form.querySelector('.ct-fail');
      if (!note) {
        note = document.createElement('p');
        note.className = 'ct-fail';
        btn.after(note);
      }
      note.innerHTML = 'That did not send — please try again, or email ' +
                       '<a href="mailto:studio@dearchitect.com">studio@dearchitect.com</a>.';
    }
  });

  again?.addEventListener('click', () => {
    form.reset();
    form.querySelectorAll('.has-err').forEach(b => b.classList.remove('has-err'));
    form.hidden = false; sent.hidden = true;
    btn.disabled = false; btnT.textContent = 'Send enquiry';
    form.elements.name.focus();
  });
})();
