/*
 * Commission agents in the admin page.
 *  - Christopher (admin): "Agents" tab: add agents (account + temporary password to send by WhatsApp), see each agent's
 *    sales and money, new temporary password, turn an agent off/on, all commissions (cancel, mark paid, send payouts now).
 *  - Agents: "My earnings" (their link, totals, PayPal email for payouts, commissions, businesses credited to them) and
 *    "Add a business" (goes live as Bronze and becomes their lead). Their Prospecting is handled in admin/index.html.
 * Agents earn 30% of a business's first paid month, then 15% of every monthly renewal (supabase/020_agent_renewals.sql); payouts: supabase/functions/agents.
 * All text is English; assets/cgg-i18n.js translates it (i18n/es.json).
 */
(function () {
  var P = window.CGGPortal, el = P.el, sb = P.client();
  var $ = function (id) { return document.getElementById(id); };
  var SITE = 'https://christopherthegoodgringo.com';
  // Agent countries: the 17 Latin American countries on the site plus the United States, Puerto Rico, Canada and Spain, named in the page's language.
  var COUNTRY_CODES = 'AR BZ BO CL CO CR DO EC SV GT HN MX NI PA PY PE UY US PR CA ES'.split(' ');
  var COUNTRIES = [];
  function buildCountries() {
    var l = (document.documentElement.lang || 'en').slice(0, 2) === 'es' ? 'es' : 'en', dn;
    try { dn = new Intl.DisplayNames([l], { type: 'region' }); } catch (e) { dn = { of: function (c) { return c; } }; }
    COUNTRIES = COUNTRY_CODES.map(function (c) { var n; try { n = dn.of(c); } catch (e) { n = c; } return [c, n || c]; })
      .sort(function (x, y) { return x[1].localeCompare(y[1], l); });
  }
  buildCountries();
  // Countries the site lists businesses in (English names are stored with the listing).
  var BUSINESS_COUNTRIES = [['AR', 'Argentina'], ['BZ', 'Belize'], ['BO', 'Bolivia'], ['BR', 'Brazil'], ['CL', 'Chile'], ['CO', 'Colombia'], ['CR', 'Costa Rica'],
    ['DO', 'Dominican Republic'], ['EC', 'Ecuador'], ['SV', 'El Salvador'], ['GT', 'Guatemala'], ['HN', 'Honduras'], ['MX', 'Mexico'], ['NI', 'Nicaragua'],
    ['PA', 'Panama'], ['PY', 'Paraguay'], ['PE', 'Peru'], ['UY', 'Uruguay'], ['VE', 'Venezuela']];
  var TIER = { silver: 'Silver', gold: 'Gold', platinum: 'Platinum', bronze: 'Bronze' };
  var agents = [], summaries = {}, commissions = [], me = null, ctx = {};

  function lang() { return (document.documentElement.lang || 'en').slice(0, 2) === 'es' ? 'es' : 'en'; }
  function money(c) { try { return (Number(c || 0) / 100).toLocaleString(lang() === 'es' ? 'es-CO' : 'en-US', { style: 'currency', currency: 'USD' }); } catch (e) { return '$' + (c / 100).toFixed(2); } }
  function day(iso) { if (!iso) return ''; try { return new Date(iso).toLocaleDateString(lang() === 'es' ? 'es-CO' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { return iso.slice(0, 10); } }
  function data(text) { return el('span', { attrs: { 'data-no-translate': '' } }, String(text == null ? '' : text)); }
  function linkFor(code) { return SITE + '/owner/?agent=' + encodeURIComponent(code); }
  // Business card generator (agent-card.html), filled in with the agent's details.
  function cardLink(a) {
    var q = new URLSearchParams({ name: a.name || '', code: a.code || '', email: a.email || '', phone: a.phone || '', lang: a.language === 'en' ? 'en' : 'es' });
    return '/agent-card.html?' + q.toString();
  }
  function call(body) {
    return sb.functions.invoke('agents', { body: body }).then(function (r) {
      if (r.error) {
        var c = r.error.context;
        if (c && typeof c.json === 'function') return c.json().then(function (j) { throw new Error((j && j.error) || r.error.message); }, function () { throw r.error; });
        throw r.error;
      }
      if (r.data && r.data.error) throw new Error(r.data.error);
      return r.data;
    });
  }
  function copyBtn(text, label) {
    var b = el('button', { type: 'button', className: 'btn light', onclick: function () {
      var done = function () { b.firstChild.textContent = 'Copied'; setTimeout(function () { b.firstChild.textContent = label || 'Copy'; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { window.prompt('', text); });
      else window.prompt('', text);
    } }, el('span', {}, label || 'Copy'));
    return b;
  }
  function badge(kind, text) { return el('span', { className: 'badge ' + kind }, text); }
  function statusBadge(k) {
    if (k.status === 'paid') return badge('approved', 'Paid');
    if (k.status === 'cancelled') return badge('rejected', 'Cancelled');
    return new Date(k.available_at) <= new Date() ? badge('paid', 'Ready to send') : badge('pending', 'Waiting 14 days');
  }
  function tile(n, label) { var t = el('div', { className: 'so-tile' }); t.appendChild(el('strong', { attrs: { 'data-no-translate': '' } }, String(n))); t.appendChild(el('span', {}, label)); return t; }
  function codeFrom(name) { return (String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().match(/[A-Z0-9]+/g) || ['AGENT'])[0].slice(0, 12); }

  // ---------- Admin: Agents tab ----------
  function loadAdmin() {
    return Promise.all([
      sb.from('agents').select('*').order('created_at', { ascending: false }),
      sb.rpc('agent_summary', { p_agent: null }),
      sb.from('agent_commissions').select('*').order('created_at', { ascending: false }).limit(300)
    ]).then(function (res) {
      if (res[0].error) { P.msg($('agList'), 'err', res[0].error.message); return; }
      agents = res[0].data || [];
      summaries = {}; (res[1].data || []).forEach(function (s) { summaries[s.agent_id] = s; });
      commissions = res[2].data || [];
      if (ctx.onAgents) ctx.onAgents();
      renderAdmin();
    });
  }
  function nameOf(id) { var a = agents.find(function (x) { return x.id === id; }); return a ? a.name : ''; }

  function credentials(a, message) {
    var box = el('div', { className: 'item ag-cred' });
    box.appendChild(el('h3', {}, 'Secure password setup'));
    box.appendChild(el('p', { className: 'meta' }, message || ('A secure password setup link was emailed to ' + a.email + '. No password is included in the email or shown here.')));
    box.appendChild(el('p', { className: 'meta' }, 'The agent uses the personal, temporary link in that email to choose their own password, then signs in at ' + SITE + '/admin/.'));
    return box;
  }

  // Separate prospective-agent recruitment queue. Sending remains deliberately disabled.
  function renderRecruitmentCampaign(list) {
    var box = el('article', { className: 'item' });
    box.appendChild(el('div', { className: 'item-head' },
      el('h3', {}, 'Prospective-Agent Recruitment Campaign'),
      badge('pending', 'Email sending disabled')));
    box.appendChild(el('p', { className: 'meta' }, 'Separate from registered-agent welcome emails. Add prospective agents here, review each contact, and approve them before the first email. The five-message sequence is saved, but this panel cannot activate or send the campaign.'));
    var status = el('div', { className: 'ag-tiles' },
      tile('5', 'Saved email templates'),
      tile('1, 3, 6, 10, 15', 'Planned send days'),
      tile('Manual', 'Approval required'));
    box.appendChild(status);
    var form = el('form', { className: 'ag-edit', style: 'display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end;margin:12px 0' });
    var nm = el('input', { attrs: { type: 'text', placeholder: 'Prospect name', maxlength: '120' } });
    var em = el('input', { attrs: { type: 'email', placeholder: 'Prospect email', required: 'required', maxlength: '254' } });
    var add = el('button', { type: 'submit', className: 'btn' }, 'Add prospect for review');
    form.appendChild(el('label', {}, el('span', {}, 'Name (optional)'), nm));
    form.appendChild(el('label', {}, el('span', {}, 'Email address'), em));
    form.appendChild(add);
    var notice = el('div');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var email = em.value.trim().toLowerCase(), name = nm.value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { P.msg(notice, 'err', 'Enter a valid email address.'); return; }
      add.disabled = true;
      sb.from('agent_recruitment_prospects').insert({ full_name: name || null, email: email, source: 'agent_portal', approval_status: 'pending', current_step: 0, next_send_at: null })
        .select('id').single().then(function (r) {
          add.disabled = false;
          if (r.error) { P.msg(notice, 'err', /duplicate key|unique/i.test(r.error.message) ? 'This email is already in the recruitment list.' : r.error.message); return; }
          nm.value = ''; em.value = ''; P.msg(notice, 'ok', 'Prospect added. Review and approve before any recruitment email can be sent.'); loadRecruitmentRows(rows, notice);
        });
    });
    box.appendChild(form); box.appendChild(notice);
    var rows = el('div', { className: 'list' });
    rows.appendChild(el('p', { className: 'muted' }, 'Loading prospective agents…'));
    box.appendChild(el('h4', { className: 'ag-h' }, 'Prospects awaiting review and campaign status'));
    box.appendChild(rows);
    list.appendChild(box);
    loadRecruitmentRows(rows, notice);
  }
  function loadRecruitmentRows(rows, notice) {
    Promise.all([
      sb.from('agent_recruitment_prospects').select('*').order('created_at', { ascending: false }).limit(250),
      sb.from('agent_recruitment_templates').select('step,send_day,subject,active').order('step')
    ]).then(function (results) {
      rows.replaceChildren();
      if (results[0].error) { rows.appendChild(el('p', { className: 'meta', style: 'color:#a2462f' }, 'Could not load recruitment prospects: ' + results[0].error.message)); return; }
      if (results[1].error) { rows.appendChild(el('p', { className: 'meta', style: 'color:#a2462f' }, 'Could not load email templates: ' + results[1].error.message)); return; }
      var prospects = results[0].data || [], templates = results[1].data || [];
      var tpl = el('details', { className: 'item' }, el('summary', {}, 'Review saved email subjects'));
      templates.forEach(function (t) {
        tpl.appendChild(el('p', { className: 'meta' }, 'Email ' + t.step + ' · Day ' + (t.send_day + 1) + ' · ' + t.subject));
      });
      rows.appendChild(tpl);
      if (!prospects.length) { rows.appendChild(el('p', { className: 'muted' }, 'No prospective agents added yet.')); return; }
      prospects.forEach(function (p) {
        var state = p.opted_out_at ? badge('rejected', 'Opted out') :
          p.registered_agent_id ? badge('approved', 'Registered — stop sequence') :
          p.approval_status === 'approved' ? badge('approved', 'Approved') :
          p.approval_status === 'rejected' ? badge('rejected', 'Rejected') : badge('pending', 'Awaiting your approval');
        var card = el('article', { className: 'item' },
          el('div', { className: 'item-head' }, el('strong', {}, data(p.full_name || p.email)), state),
          el('p', { className: 'meta ag-link' }, data(p.email), ' · Added ', day(p.created_at)),
          el('p', { className: 'meta' }, 'Recruitment emails sent: ', data(p.current_step || 0), ' / 5. No emails are being sent while the campaign is disabled.'));
        if (!p.opted_out_at && !p.registered_agent_id && p.approval_status === 'pending') {
          var actions = el('div', { className: 'actions' });
          actions.appendChild(el('button', { type: 'button', className: 'btn', onclick: function (ev) {
            var b = ev.currentTarget; b.disabled = true;
            sb.from('agent_recruitment_prospects').update({ approval_status: 'approved', approved_at: new Date().toISOString(), next_send_at: null, updated_at: new Date().toISOString() }).eq('id', p.id).then(function (r) {
              if (r.error) { b.disabled = false; P.msg(notice, 'err', r.error.message); return; }
              P.msg(notice, 'ok', 'Prospect approved. Sending remains disabled pending your separate activation authorization.'); loadRecruitmentRows(rows, notice);
            });
          } }, 'Approve prospect'));
          actions.appendChild(el('button', { type: 'button', className: 'btn light', onclick: function (ev) {
            var b = ev.currentTarget; b.disabled = true;
            sb.from('agent_recruitment_prospects').update({ approval_status: 'rejected', next_send_at: null, updated_at: new Date().toISOString() }).eq('id', p.id).then(function (r) {
              if (r.error) { b.disabled = false; P.msg(notice, 'err', r.error.message); return; }
              P.msg(notice, 'ok', 'Prospect rejected. No email will be sent.'); loadRecruitmentRows(rows, notice);
            });
          } }, 'Reject'));
          card.appendChild(actions);
        }
        rows.appendChild(card);
      });
    }).catch(function (e) { rows.replaceChildren(el('p', { className: 'meta', style: 'color:#a2462f' }, e.message || 'Could not load campaign data.')); });
  }

  function renderAdmin() {
    var list = $('agList'); if (!list) return;
    list.replaceChildren();
    renderRecruitmentCampaign(list);
    list.appendChild(leaderboardBox());
    // Recent account and email activity is fetched through the admin-only Edge Function.
    var logBox = el('article', { className: 'item' });
    var logHead = el('div', { className: 'item-head' }, el('h3', {}, 'Recent agent activity & email log'),
      el('button', { type: 'button', className: 'btn light', onclick: function () { loadAdmin(); } }, 'Refresh'));
    logBox.appendChild(logHead);
    var logRows = el('div', { className: 'list' });
    logRows.appendChild(el('p', { className: 'muted' }, 'Loading activity…'));
    logBox.appendChild(logRows); list.appendChild(logBox);
    call({ action: 'activity_log' }).then(function (r) {
      logRows.replaceChildren();
      var events = r.events || [];
      if (!events.length) { logRows.appendChild(el('p', { className: 'muted' }, 'No activity logged yet. New signups and email events will appear here.')); return; }
      var labels = { agent_signup: 'Agent registered', agent_created: 'Agent account created', welcome_email_sent: 'Welcome email sent', welcome_email_failed: 'Welcome email failed', password_setup_email_sent: 'Password setup email sent', password_setup_email_failed: 'Password setup email failed', password_reset_link_sent: 'Password reset link sent', password_reset_link_failed: 'Password reset link failed' };
      events.forEach(function (ev) {
        var detail = ev.details && ev.details.error ? ' · ' + ev.details.error : '';
        var when = ev.occurred_at ? new Date(ev.occurred_at).toLocaleString() : '';
        logRows.appendChild(el('div', { className: 'item' },
          el('div', { className: 'item-head' }, el('strong', {}, labels[ev.event_type] || ev.event_type), el('span', { className: 'meta' }, when)),
          el('p', { className: 'meta ag-link' }, data(ev.agent_name || 'Unknown agent'), ' · ', data(ev.agent_email || ''), detail ? el('span', { style: 'color:#a2462f' }, detail) : '')));
      });
    }).catch(function (e) { logRows.replaceChildren(el('p', { className: 'meta', style: 'color:#a2462f' }, 'Could not load activity log: ' + (e.message || 'Unknown error'))); });
    if (!agents.length) list.appendChild(el('p', { className: 'muted' }, 'No agents yet. Add your first one above.'));
    agents.forEach(function (a) {
      var s = summaries[a.id] || {};
      var out = el('div');
      var payout = a.paypal_email ? badge('approved', 'PayPal ready') : badge('pending', 'No PayPal email yet');
      var card = el('article', { className: 'item' },
        el('div', { className: 'item-head' }, el('h3', {}, data(a.name)),
          el('span', {}, a.status === 'active' ? badge('approved', 'Active') : badge('rejected', 'Turned off'), ' ', payout)),
        el('p', { className: 'meta' }, data(a.email), a.phone ? ' · ' : '', a.phone ? data(a.phone) : '', ' · ', el('span', {}, 'Code'), ': ', el('strong', {}, data(a.code)), a.paypal_email ? ' · ' : '', a.paypal_email ? el('span', {}, 'PayPal') : '', a.paypal_email ? ': ' : '', a.paypal_email ? data(a.paypal_email) : ''),
        el('div', { className: 'ag-tiles' }, tile(s.referrals || 0, 'Verified referred signups'), tile((function () { var seen = {}; commissions.filter(function (k) { return k.agent_id === a.id && k.status !== 'cancelled'; }).forEach(function (k) { if (k.listing_name) seen[String(k.listing_name).toLowerCase()] = true; }); return Object.keys(seen).length; })(), 'Businesses with verified commissions'), tile(s.sales || 0, 'Paid sales / renewals'),
          tile(money(s.earned_cents), 'Earned'), tile(money(s.paid_cents), 'Paid out'), tile(money(s.waiting_cents), 'Waiting')),
        el('p', { className: 'meta ag-link' }, el('span', {}, 'Their link'), ': ', data(linkFor(a.code))),
        el('div', { className: 'actions' },
          copyBtn(linkFor(a.code), 'Copy their link'),
          el('button', { type: 'button', className: 'btn light', onclick: function (ev) {
            var b = ev.currentTarget;
            if (!window.confirm('Send the welcome email to ' + a.name + ' at ' + a.email + '?')) return;
            b.disabled = true; b.textContent = 'Sending…';
            call({ action: 'send_welcome', agent_id: a.id }).then(function (r) {
              b.disabled = false; b.textContent = 'Send welcome email';
              P.msg(out, 'ok', (r && r.message) || ('Welcome email sent to ' + a.email + '.'));
            }, function (e) {
              b.disabled = false; b.textContent = 'Send welcome email';
              P.msg(out, 'err', e.message || 'Could not send the welcome email.');
            });
          } }, 'Send welcome email'),
          el('a', { className: 'btn light', target: '_blank', rel: 'noopener', href: cardLink(a) }, 'Business card'),
          el('button', { type: 'button', className: 'btn light', onclick: function () { out.replaceChildren(editForm(a, out)); } }, 'Edit details'),
          el('button', { type: 'button', className: 'btn light', onclick: function (ev) {
            var b = ev.currentTarget; b.disabled = true;
            call({ action: 'reset_password', agent_id: a.id }).then(function (r) { b.disabled = false; out.replaceChildren(credentials(a, r.message || ('Secure password setup link sent to ' + a.email + '.'))); },
              function (e) { b.disabled = false; P.msg(out, 'err', e.message); });
          } }, 'Send password setup link'),
          el('button', { type: 'button', className: a.status === 'active' ? 'btn danger' : 'btn light', onclick: function (ev) {
            var b = ev.currentTarget; b.disabled = true;
            sb.from('agents').update({ status: a.status === 'active' ? 'inactive' : 'active' }).eq('id', a.id).then(function (r) {
              b.disabled = false; if (r.error) return P.msg(out, 'err', r.error.message); loadAdmin();
            });
          } }, a.status === 'active' ? 'Turn off' : 'Turn back on'),
          el('button', { type: 'button', className: 'btn danger', onclick: function () {
            var yes = el('button', { type: 'button', className: 'btn danger', onclick: function (ev) {
              var b = ev.currentTarget; b.disabled = true;
              call({ action: 'delete', agent_id: a.id }).then(function () { loadAdmin(); }, function (e) { b.disabled = false; P.msg(out, 'err', e.message); });
            } }, 'Yes, delete this agent');
            out.replaceChildren(el('div', { className: 'item' },
              el('p', {}, el('strong', {}, 'Delete this agent?'), ' ', el('span', {}, 'Their sign-in, their link and their commission history will be removed. Businesses they contacted go back to the shared Prospecting list. This can’t be undone.')),
              el('div', { className: 'actions' }, yes, el('button', { type: 'button', className: 'btn light', onclick: function () { out.replaceChildren(); } }, 'Cancel'))));
          } }, 'Delete')),
        out);
      list.appendChild(card);
    });
    renderCommissions($('agComm'), commissions, true);
  }

  // Christopher edits any of an agent's details. A new email also becomes the agent's sign-in email.
  function editForm(a, out) {
    var f = el('form', { className: 'item ag-edit' });
    function field(label, input) { var l = el('label', {}, el('span', {}, label)); l.appendChild(input); f.appendChild(l); return input; }
    var name = field('Name', el('input', { type: 'text', value: a.name || '', required: true, maxLength: 120 }));
    var email = field('Email (they sign in with it)', el('input', { type: 'email', value: a.email || '', required: true }));
    var phone = field('WhatsApp / phone (with country code)', el('input', { type: 'tel', value: a.phone || '' }));
    var country = el('select'); country.appendChild(el('option', { value: '' }, '—'));
    COUNTRIES.forEach(function (c) { country.appendChild(el('option', { value: c[0], selected: c[0] === a.country, attrs: { 'data-no-translate': '' } }, c[1])); });
    field('Country', country);
    var language = el('select'); language.appendChild(el('option', { value: 'es', selected: a.language !== 'en' }, 'Spanish')); language.appendChild(el('option', { value: 'en', selected: a.language === 'en' }, 'English'));
    field('Language', language);
    var paypal = field('PayPal email (where commissions are sent)', el('input', { type: 'email', value: a.paypal_email || '' }));
    var code = field('Agent code', el('input', { type: 'text', value: a.code || '', required: true, maxLength: 20 }));
    code.addEventListener('input', function () { code.value = code.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
    f.appendChild(el('p', { className: 'meta' }, 'Changing the code changes their personal link. Links they already sent with the old code stop giving them credit.'));
    var notes = field('Notes (only you see these)', el('textarea', { rows: 2, maxLength: 2000 })); notes.value = a.notes || '';
    var msg = el('div');
    var save = el('button', { type: 'submit', className: 'btn' }, 'Save changes');
    f.appendChild(el('div', { className: 'actions' }, save, el('button', { type: 'button', className: 'btn light', onclick: function () { out.replaceChildren(); } }, 'Cancel')));
    f.appendChild(msg);
    f.addEventListener('submit', function (e) {
      e.preventDefault(); save.disabled = true;
      call({ action: 'update', agent_id: a.id, name: name.value, email: email.value, phone: phone.value, country: country.value, language: language.value, code: code.value, notes: notes.value, paypal_email: paypal.value })
        .then(function () { save.disabled = false; loadAdmin(); }, function (err) { save.disabled = false; msg.replaceChildren(); P.msg(msg, 'err', err.message); });
    });
    return f;
  }

  // Top agents this month (agent_leaderboard(): first name + last initial and number of paid sales only).
  function countryName(c) { try { return new Intl.DisplayNames([lang()], { type: 'region' }).of(c); } catch (e) { return c; } }
  function leaderboardBox() {
    var wrap = el('div', { className: 'item ag-board' }, el('h3', {}, '🏆 ', el('span', {}, 'Top agents this month')));
    var list = el('ol', { className: 'ag-board-list' }); wrap.appendChild(list);
    sb.rpc('agent_leaderboard').then(function (r) {
      var rows = r.data || [];
      if (!rows.length) { wrap.appendChild(el('p', { className: 'meta' }, 'No sales yet this month. Your first sale puts you at the top!')); return; }
      rows.forEach(function (x) {
        var medal = x.rank === 1 ? '🥇' : x.rank === 2 ? '🥈' : x.rank === 3 ? '🥉' : String(x.rank) + '.';
        list.appendChild(el('li', { className: x.is_me ? 'me' : '' },
          el('span', { className: 'ag-rank', attrs: { 'data-no-translate': '' } }, medal),
          el('span', { className: 'ag-who' }, data(x.agent_name), x.country ? el('small', { attrs: { 'data-no-translate': '' } }, ' · ' + countryName(x.country)) : null, x.is_me ? el('em', {}, ' (you)') : null),
          el('strong', {}, data(String(x.sales)), ' ', el('span', {}, x.sales === 1 ? 'sale' : 'sales'))));
      });
      wrap.appendChild(el('p', { className: 'meta' }, 'Counts every paid sale and monthly renewal since the 1st of the month. It starts over every month.'));
    });
    return wrap;
  }
  function renderCommissions(box, rows, admin) {
    if (!box) return;
    box.replaceChildren();
    if (!rows.length) { box.appendChild(el('p', { className: 'muted' }, admin ? 'No commissions yet. They appear here automatically when a business an agent brought in pays its first month or a monthly renewal.' : 'No commissions yet. When a business that signed up through your link pays for a Silver, Gold or Platinum plan, your commission shows here.')); return; }
    rows.forEach(function (k) {
      var out = el('div');
      var acts = el('div', { className: 'actions' });
      if (admin && k.status === 'pending') {
        acts.appendChild(el('button', { type: 'button', className: 'btn light', onclick: function () { update(k, { status: 'paid', paid_at: new Date().toISOString(), note: 'Marked paid by hand', error: null }, out); } }, 'Mark as paid (paid by hand)'));
        acts.appendChild(el('button', { type: 'button', className: 'btn danger', onclick: function () { update(k, { status: 'cancelled', note: 'Cancelled by admin' }, out); } }, 'Cancel (refunded)'));
      }
      if (admin && k.status === 'cancelled') acts.appendChild(el('button', { type: 'button', className: 'btn light', onclick: function () { update(k, { status: 'pending', note: null }, out); } }, 'Undo cancel'));
      var when = k.status === 'paid' ? [el('span', {}, 'Paid'), ' ', data(day(k.paid_at))]
        : k.status === 'cancelled' ? [el('span', {}, 'Cancelled')]
        : [el('span', {}, 'Payable from'), ' ', data(day(k.available_at))];
      var meta = el('p', { className: 'meta' });
      [admin ? el('span', {}, el('span', {}, 'Agent'), ': ', data(nameOf(k.agent_id)), ' · ') : '',
        el('span', {}, k.kind === 'renewal' ? 'Monthly renewal (15%)' : 'New listing (30%)'), ' · ', el('span', {}, TIER[k.tier] || k.tier || ''), ' · ', el('span', {}, 'They paid'), ' ', data(money(k.amount_paid_cents)), ' · ',
        el('strong', {}, el('span', {}, 'Commission'), ' ', data(money(k.commission_cents))), ' · '].concat(when).forEach(function (n) {
        if (n) meta.appendChild(typeof n === 'string' ? document.createTextNode(n) : n);
      });
      box.appendChild(el('article', { className: 'item' },
        el('div', { className: 'item-head' }, el('h3', {}, data(k.listing_name || '')), el('span', {}, statusBadge(k))),
        meta,
        k.error && k.status === 'pending' ? el('p', { className: 'meta', style: 'color:#a2462f' }, k.error) : '',
        acts.childNodes.length ? acts : '', out));
    });
  }
  function update(k, patch, out) {
    sb.from('agent_commissions').update(patch).eq('id', k.id).then(function (r) { if (r.error) return P.msg(out, 'err', r.error.message); loadAdmin(); });
  }

  function initAdmin() {
    var form = $('agForm'); if (!form) return;
    var cs = $('agCountry'); COUNTRIES.forEach(function (c) { cs.appendChild(el('option', { value: c[0], selected: c[0] === 'CO', attrs: { 'data-no-translate': '' } }, c[1])); });
    $('agName').addEventListener('input', function () { if (!$('agCode').dataset.touched) $('agCode').value = codeFrom($('agName').value); });
    $('agCode').addEventListener('input', function () { $('agCode').dataset.touched = '1'; $('agCode').value = $('agCode').value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = e.submitter; if (btn) btn.disabled = true;
      call({ action: 'create', name: $('agName').value, email: $('agEmail').value, phone: $('agPhone').value, country: cs.value, language: $('agLang').value, code: $('agCode').value })
        .then(function (r) { if (btn) btn.disabled = false; form.reset(); delete $('agCode').dataset.touched; $('agOut').replaceChildren(credentials(r.agent, r.message || (r.setup_email_sent ? ('Secure password setup link emailed to ' + r.agent.email + '.') : 'Agent created, but the setup email failed. Use Send password setup link to retry.'))); loadAdmin(); },
          function (err) { if (btn) btn.disabled = false; $('agOut').replaceChildren(); P.msg($('agOut'), 'err', err.message); });
    });
    $('agPay').addEventListener('click', function (ev) {
      var b = ev.currentTarget; b.disabled = true;
      call({ action: 'pay_now' }).then(function (r) {
        b.disabled = false;
        var box = $('agPayOut'); box.replaceChildren();
        var p = el('div', { className: 'msg ok' }, el('span', {}, 'Payable commissions checked'), ': ', data(r.checked), ' · ', el('span', {}, 'Sent'), ': ', data(r.sent));
        box.appendChild(p); loadAdmin();
      }, function (e) { b.disabled = false; P.msg($('agPayOut'), 'err', e.message); });
    });
  }

  // ---------- Agent: My earnings ----------
  function loadEarnings() {
    var box = $('erOut'); if (!box || !me) return;
    Promise.all([
      sb.rpc('agent_summary', { p_agent: null }),
      sb.from('agent_commissions').select('*').order('created_at', { ascending: false }).limit(200),
      sb.rpc('my_referred_businesses'),
      sb.from('agents').select('*').eq('id', me.id).maybeSingle()
    ]).then(function (res) {
      var s = (res[0].data || [])[0] || {}, rows = res[1].data || [], biz = res[2].data || [];
      if (res[3].data) me = res[3].data;
      box.replaceChildren();
      var link = linkFor(me.code);
      box.appendChild(el('div', { className: 'item' },
        el('h3', {}, 'Your personal link'),
        el('p', { className: 'meta' }, 'Businesses that sign up through this link are credited to you. Your Prospecting messages already include it.'),
        el('p', { className: 'ag-big' }, data(link)),
        el('div', { className: 'actions' }, copyBtn(link, 'Copy link'),
          el('a', { className: 'btn light', target: '_blank', rel: 'noopener', href: 'https://wa.me/?text=' + encodeURIComponent(link) }, 'Share on WhatsApp'),
          el('a', { className: 'btn gold', target: '_blank', rel: 'noopener', href: cardLink(me) }, 'Make my business card')),
        el('p', { className: 'meta' }, el('span', {}, 'Your code'), ': ', el('strong', {}, data(me.code)))));
      box.appendChild(el('div', { className: 'ag-tiles' }, tile(s.referrals || 0, 'Owners signed up'), tile(s.sales || 0, 'Paid sales'),
        tile(money(s.earned_cents), 'Earned'), tile(money(s.paid_cents), 'Paid out'), tile(money(s.waiting_cents), 'Waiting')));
      box.appendChild(payoutBox());
      box.appendChild(leaderboardBox());
      box.appendChild(el('div', { className: 'item' },
        el('h3', {}, 'How you earn'),
        el('p', {}, 'For every business that signs up through your link and picks a paid plan, you earn 30% of its first month, then 15% of every month it renews:'),
        el('ul', { className: 'ag-ul' },
          el('li', {}, el('span', {}, 'Silver'), ' ($9.99) → ', el('strong', {}, data('$3.00')), ' + ', data('$1.50'), ' ', el('span', {}, 'every month')),
          el('li', {}, el('span', {}, 'Gold'), ' ($19.99) → ', el('strong', {}, data('$6.00')), ' + ', data('$3.00'), ' ', el('span', {}, 'every month')),
          el('li', {}, el('span', {}, 'Platinum'), ' ($49.99) → ', el('strong', {}, data('$15.00')), ' + ', data('$7.50'), ' ', el('span', {}, 'every month'))),
        el('p', { className: 'meta' }, 'Free Bronze listings don\'t earn a commission. Your money is sent automatically 14 days after each payment.')));
      box.appendChild(el('h3', { className: 'ag-h' }, 'Your commissions'));
      var cbox = el('div', { className: 'list' }); renderCommissions(cbox, rows, false); box.appendChild(cbox);
      box.appendChild(el('h3', { className: 'ag-h' }, 'Businesses that signed up through you'));
      var bl = el('div', { className: 'list' });
      if (!biz.length) bl.appendChild(el('p', { className: 'muted' }, 'None yet.'));
      biz.forEach(function (b) {
        bl.appendChild(el('article', { className: 'item' }, el('div', { className: 'item-head' }, el('h3', {}, data(b.listing_name)), el('span', {}, badge(b.tier === 'bronze' ? 'tier' : 'approved', TIER[b.tier] || b.tier))),
          el('p', { className: 'meta' }, el('span', {}, (P.cfg || window.CGG_PORTAL).typeLabels[b.listing_type] || b.listing_type), ' · ', el('span', {}, 'Since'), ' ', data(day(b.since)))));
      });
      box.appendChild(bl);
    });
  }
  function payoutBox() {
    var box = el('div', { className: 'item' }), out = el('div');
    box.appendChild(el('h3', {}, 'Getting paid'));
    if (me.paypal_email) box.appendChild(el('p', {}, badge('approved', 'Payouts ready'), ' ', el('span', {}, 'Your commissions are sent automatically to your PayPal account:'), ' ', el('strong', {}, data(me.paypal_email))));
    else box.appendChild(el('p', {}, 'Your commissions are paid with PayPal. Add the email of your PayPal account (opening one is free at paypal.com).'));
    var f = el('form', { className: 'ag-edit' });
    var input = el('input', { type: 'email', value: me.paypal_email || '', placeholder: 'you@example.com', required: true });
    var lab = el('label', {}, el('span', {}, 'PayPal email')); lab.appendChild(input); f.appendChild(lab);
    var save = el('button', { type: 'submit', className: 'btn' }, me.paypal_email ? 'Update PayPal email' : 'Save PayPal email');
    f.appendChild(el('div', { className: 'actions' }, save)); f.appendChild(out);
    f.addEventListener('submit', function (e) {
      e.preventDefault(); save.disabled = true;
      call({ action: 'set_paypal', paypal_email: input.value }).then(function (r) {
        save.disabled = false; me.paypal_email = r.agent.paypal_email; me.payouts_enabled = r.agent.payouts_enabled; loadEarnings();
      }, function (err) { save.disabled = false; out.replaceChildren(); P.msg(out, 'err', err.message); });
    });
    box.appendChild(f);
    return box;
  }

  // ---------- Agent: Add a business ----------
  function initAdd() {
    var form = $('aaForm'); if (!form) return;
    Object.keys(window.CGG_PORTAL.typeLabels).forEach(function (t) { $('aaType').appendChild(el('option', { value: t }, window.CGG_PORTAL.typeLabels[t])); });
    BUSINESS_COUNTRIES.forEach(function (c) { $('aaCountry').appendChild(el('option', { value: c[0], selected: c[0] === 'CO' }, c[1])); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = e.submitter; if (btn) btn.disabled = true;
      var c = BUSINESS_COUNTRIES.find(function (x) { return x[0] === $('aaCountry').value; }) || [];
      var v = function (id) { return $(id).value.trim() || null; };
      var name = $('aaName').value.trim();
      sb.rpc('agent_add_business', { p_type: $('aaType').value, p_name: name, p_country_code: c[0], p_country_name: c[1], p_city: $('aaCity').value.trim(),
        p_address: v('aaAddress'), p_website: P.normalizeUrl ? (P.normalizeUrl($('aaWebsite').value) || null) : v('aaWebsite'), p_whatsapp: v('aaWhatsapp'), p_email: v('aaEmail'), p_language: $('aaLang').value })
        .then(function (r) {
          if (btn) btn.disabled = false;
          if (r.error) return P.msg($('aaMsg'), 'err', r.error.message);
          form.reset();
          var m = el('div', { className: 'msg ok' }, data(name), ' ', el('span', {}, 'is live in the Finder and is now one of your leads in Prospecting.'));
          $('aaMsg').replaceChildren(m);
          if (ctx.afterAdd) ctx.afterAdd();
        });
    });
  }

  document.addEventListener('cgg:language', function () {
    var t = $('tab-agents'), e = $('tab-earnings');
    if (t && !t.hidden) renderAdmin();
    if (e && !e.hidden && me) loadEarnings();
  });

  window.CGGAgents = {
    init: function (c) { ctx = c || {}; initAdmin(); initAdd(); },
    loadAdmin: loadAdmin,
    showAdmin: function () { loadAdmin(); },
    list: function () { return agents; },
    nameOf: nameOf,
    setMe: function (a) { me = a; },
    me: function () { return me; },
    showEarnings: function () { loadEarnings(); }
  };
})();
