/*
 * Social media tab in the admin page: YouTube Shorts from idea to published, with stats.
 * Steps: Idea -> Draft -> Ready to review -> Approved -> (Post or Schedule on YouTube) -> Scheduled -> Published.
 * Videos are uploaded in parts of 40 MB to the private "social-videos" bucket (the plan's per-file limit is 50 MB);
 * the youtube-publish function joins them while sending to YouTube, then deletes them.
 * A future publish time means YouTube keeps the video private and makes it public at that time by itself.
 * Stats (views, likes, comments) refresh every 6 hours through youtube-stats, or with the Refresh stats button.
 * All text is English; assets/cgg-i18n.js translates it (i18n/es.json, patterns in i18n/cgg-i18n.template.js).
 * Tables: social_posts, social_stats, youtube_connection (supabase/013_social_youtube.sql).
 */
(function () {
  var P = window.CGGPortal, cfg = window.CGG_PORTAL, el = P.el, sb = P.client();
  var $ = function (id) { return document.getElementById(id); };
  var BUCKET = 'social-videos', PART = 40 * 1024 * 1024; // a multiple of 256 KB, as YouTube requires
  var STEPS = {
    idea: 'Idea', draft: 'Draft', review: 'Ready to review', approved: 'Approved', publishing: 'Sending to YouTube',
    scheduled: 'Scheduled', published: 'Published', failed: "Didn't post"
  };
  var BADGE = { idea: 'tier', draft: 'tier', review: 'pending', approved: 'paid', publishing: 'pending', scheduled: 'paid', published: 'approved', failed: 'rejected' };
  var posts = null, conn = null, editing = null, loaded = false, polling = null;

  function lang() { return (document.documentElement.lang || 'en').slice(0, 2) === 'es' ? 'es' : 'en'; }
  function when(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleString(lang() === 'es' ? 'es-CO' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return iso; }
  }
  function num(n) { try { return Number(n || 0).toLocaleString(lang() === 'es' ? 'es-CO' : 'en-US'); } catch (e) { return String(n || 0); } }
  function mb(bytes) { return (bytes / 1048576).toFixed(bytes > 104857600 ? 0 : 1) + ' MB'; }
  function msg(kind, text) { if (!text) { $('soMsg').replaceChildren(); return; } P.msg($('soMsg'), kind, text); $('soMsg').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  function call(fn, body) {
    return sb.functions.invoke(fn, { body: body }).then(function (r) {
      if (r.error) {
        var ctx = r.error.context;
        if (ctx && typeof ctx.json === 'function') return ctx.json().then(function (j) { throw new Error((j && j.error) || r.error.message); }, function () { throw r.error; });
        throw r.error;
      }
      if (r.data && r.data.error) throw new Error(r.data.error);
      return r.data;
    });
  }

  // ---------- Loading ----------
  function load() {
    loaded = true;
    return Promise.all([
      sb.from('social_posts').select('*').order('created_at', { ascending: false }),
      sb.rpc('youtube_status')
    ]).then(function (res) {
      if (res[0].error) { P.msg($('soList'), 'err', res[0].error.message); return; }
      posts = res[0].data || [];
      conn = (res[1].data && res[1].data[0]) || null;
      render();
      var busy = posts.some(function (p) { return p.status === 'publishing'; });
      clearTimeout(polling);
      if (busy) polling = setTimeout(load, 8000);
    });
  }

  // ---------- Page ----------
  function render() {
    renderConnection();
    renderSummary();
    renderChart();
    renderList();
  }

  function renderConnection() {
    var box = $('soConn'); box.replaceChildren();
    if (conn) {
      box.appendChild(el('div', { className: 'item-head' },
        el('div', { style: 'display:flex;align-items:center;gap:12px' },
          conn.channel_thumbnail ? el('img', { src: conn.channel_thumbnail, alt: '', width: 44, height: 44, style: 'border-radius:50%' }) : null,
          el('div', {}, el('span', { className: 'badge approved' }, 'YouTube connected'), el('h3', { style: 'margin:6px 0 0' }, conn.channel_title || ''))),
        el('div', { className: 'actions', style: 'margin-top:0' },
          el('a', { className: 'btn light', href: 'https://studio.youtube.com/channel/' + conn.channel_id, target: '_blank', rel: 'noopener' }, 'Open YouTube Studio'),
          el('button', { className: 'btn light', type: 'button', onclick: disconnect }, 'Disconnect'))));
    } else {
      box.appendChild(el('h3', { style: 'margin:0' }, 'Connect your YouTube channel'));
      box.appendChild(el('p', { className: 'muted', style: 'margin:0' }, 'Sign in with the Google account that owns your channel. After that, Shorts post and schedule automatically from here.'));
      box.appendChild(el('div', { className: 'actions' }, el('button', { className: 'btn', type: 'button', onclick: connect }, 'Connect YouTube')));
    }
  }
  function connect(ev) {
    var b = ev.currentTarget; b.disabled = true;
    call('youtube-auth', { action: 'start' }).then(function (d) { location.href = d.url; }, function (e) { b.disabled = false; msg('err', e.message); });
  }
  function disconnect() {
    if (!confirm('Disconnect your YouTube channel? Shorts already on YouTube stay there. You can connect again any time.')) return;
    sb.rpc('youtube_disconnect').then(function (r) { if (r.error) return msg('err', r.error.message); conn = null; render(); });
  }

  function renderSummary() {
    var live = posts.filter(function (p) { return p.youtube_video_id; });
    var t = live.reduce(function (a, p) { a.v += Number(p.views || 0); a.l += Number(p.likes || 0); a.c += Number(p.comments || 0); return a; }, { v: 0, l: 0, c: 0 });
    var count = function (s) { return posts.filter(function (p) { return p.status === s; }).length; };
    var tile = function (value, label) { return el('div', { className: 'so-tile' }, el('strong', {}, value), el('span', {}, label)); };
    var box = $('soSummary'); box.replaceChildren(
      tile(num(t.v), 'Views'), tile(num(t.l), 'Likes'), tile(num(t.c), 'Comments'),
      tile(String(count('published')), 'Published'), tile(String(count('scheduled')), 'Scheduled'),
      tile(String(count('review')), 'Ready to review'));
    var last = live.map(function (p) { return p.stats_updated_at; }).filter(Boolean).sort().pop();
    $('soUpdated').replaceChildren(last ? el('span', {}, el('span', {}, 'Stats updated'), ' ', when(last)) : el('span', {}, 'Stats update every 6 hours once your Shorts are on YouTube.'));
  }

  function renderChart() {
    var box = $('soChart'); box.replaceChildren();
    var live = posts.filter(function (p) { return p.youtube_video_id && p.views != null; })
      .sort(function (a, b) { return Number(b.views) - Number(a.views); }).slice(0, 10);
    $('soChartWrap').hidden = !live.length;
    if (!live.length) return;
    var max = Math.max(1, Number(live[0].views));
    live.forEach(function (p) {
      var pct = Math.max(2, Math.round(Number(p.views) / max * 100));
      box.appendChild(el('div', { className: 'so-bar' },
        el('span', { className: 'so-bar-label', title: p.title }, p.title),
        el('span', { className: 'so-bar-track' }, el('span', { className: 'so-bar-fill', style: 'width:' + pct + '%' })),
        el('span', { className: 'so-bar-value' }, num(p.views))));
    });
  }

  function renderList() {
    var box = $('soList'); box.replaceChildren();
    var f = $('soFilter').value;
    var list = posts.filter(function (p) { return !f || p.status === f || (f === 'upcoming' && p.status === 'scheduled'); });
    if (f === 'upcoming') list.sort(function (a, b) { return Date.parse(a.publish_at || 0) - Date.parse(b.publish_at || 0); });
    if (!list.length) { box.appendChild(el('p', { className: 'muted' }, posts.length ? 'No Shorts match this filter.' : 'No Shorts yet. Tap New Short to add your first one.')); return; }
    list.forEach(function (p) { box.appendChild(card(p)); });
  }

  function card(p) {
    var thumb = p.youtube_video_id ? el('img', { className: 'so-thumb', src: 'https://i.ytimg.com/vi/' + p.youtube_video_id + '/mqdefault.jpg', alt: '', attrs: { loading: 'lazy' } })
      : el('div', { className: 'so-thumb so-thumb-empty', attrs: { 'aria-hidden': 'true' } }, '▶');
    var info = el('div', { className: 'so-info' },
      el('div', { className: 'item-head' }, el('h3', {}, p.title || 'Untitled Short'), el('span', { className: 'badge ' + BADGE[p.status] }, STEPS[p.status])));
    var meta = el('p', { className: 'meta', style: 'margin:0' });
    var bits = [];
    if (p.status === 'scheduled' && p.publish_at) bits.push(el('span', {}, el('span', {}, 'Goes public'), ' ', when(p.publish_at)));
    else if (p.status === 'published' && p.published_at) bits.push(el('span', {}, el('span', {}, 'Published'), ' ', when(p.published_at)));
    else if (p.publish_at) bits.push(el('span', {}, el('span', {}, 'Planned for'), ' ', when(p.publish_at)));
    bits.push(el('span', {}, p.language === 'en' ? 'English' : 'Spanish'));
    if (p.video_parts > 0) bits.push(el('span', {}, el('span', {}, 'Video ready'), ' (' + mb(p.video_size) + ')'));
    else if (!p.youtube_video_id) bits.push(el('span', {}, 'No video yet'));
    bits.forEach(function (b, i) { if (i) meta.appendChild(document.createTextNode(' · ')); meta.appendChild(b); });
    info.appendChild(meta);
    if (p.youtube_video_id && p.views != null) {
      info.appendChild(el('p', { className: 'so-stats' },
        el('span', {}, el('strong', {}, num(p.views)), ' ', el('span', {}, 'views')),
        el('span', {}, el('strong', {}, num(p.likes)), ' ', el('span', {}, 'likes')),
        el('span', {}, el('strong', {}, num(p.comments)), ' ', el('span', {}, 'comments'))));
    }
    if (p.notes) info.appendChild(el('p', { className: 'muted', style: 'margin:0' }, p.notes));
    if (p.error) info.appendChild(el('p', { className: 'msg err', style: 'margin:0' }, p.error));

    var acts = el('div', { className: 'actions' });
    var btn = function (text, cls, fn) { return el('button', { className: 'btn ' + (cls || 'light'), type: 'button', onclick: fn }, text); };
    var move = function (s) { return function () { save(p, { status: s }); }; };
    if (p.status === 'publishing') acts.appendChild(el('span', { className: 'muted' }, 'Sending to YouTube… this page updates by itself.'));
    else if (!p.youtube_video_id) {
      acts.appendChild(btn('Edit', 'light', function () { openForm(p); }));
      if (p.status === 'idea' || p.status === 'draft') acts.appendChild(btn('Send to review', '', move('review')));
      if (p.status === 'review') { acts.appendChild(btn('Approve', '', move('approved'))); acts.appendChild(btn('Back to draft', 'light', move('draft'))); }
      if (p.status === 'approved' || p.status === 'failed') {
        var future = p.publish_at && Date.parse(p.publish_at) > Date.now() + 2 * 60e3;
        acts.appendChild(btn(future ? 'Schedule on YouTube' : 'Post to YouTube now', 'gold', function (ev) { publish(p, ev.currentTarget, future); }));
      }
      acts.appendChild(btn('Delete', 'danger', function () { remove(p); }));
    } else {
      acts.appendChild(el('a', { className: 'btn light', href: 'https://youtube.com/shorts/' + p.youtube_video_id, target: '_blank', rel: 'noopener' }, 'Open on YouTube'));
      acts.appendChild(btn('Edit', 'light', function () { openForm(p); }));
    }
    info.appendChild(acts);
    return el('article', { className: 'item so-card' }, thumb, info);
  }

  // ---------- Actions ----------
  function save(p, fields) {
    fields.updated_at = new Date().toISOString();
    return sb.from('social_posts').update(fields).eq('id', p.id).select().then(function (r) {
      if (r.error) { msg('err', r.error.message); throw r.error; }
      Object.assign(p, r.data[0]); render(); return p;
    });
  }
  function publish(p, b, future) {
    if (!conn) return msg('err', 'Connect your YouTube channel first.');
    if (!p.video_parts) return msg('err', 'Add the video file first.');
    var text = future ? 'Upload this Short to YouTube now? It stays private and goes public by itself at the time you chose.' : 'Post this Short on YouTube now?';
    if (!confirm(text)) return;
    b.disabled = true;
    call('youtube-publish', { action: 'publish', post_id: p.id }).then(function () {
      msg('ok', future ? 'Uploading to YouTube. It will go public at the time you chose.' : 'Uploading to YouTube. It will be live in a few minutes.');
      load();
    }, function (e) { b.disabled = false; msg('err', e.message); load(); });
  }
  function remove(p) {
    if (!confirm('Delete this Short and its video file? This cannot be undone.')) return;
    var paths = []; for (var i = 0; i < 200; i++) paths.push('posts/' + p.id + '/part-' + String(i).padStart(3, '0'));
    sb.storage.from(BUCKET).remove(paths.slice(0, Math.max(p.video_parts, 1))).then(function () {
      return sb.from('social_posts').delete().eq('id', p.id);
    }).then(function (r) {
      if (r && r.error) return msg('err', r.error.message);
      posts = posts.filter(function (x) { return x.id !== p.id; }); render();
    });
  }

  // ---------- Create / edit form ----------
  function toLocalInput(iso) {
    if (!iso) return '';
    var d = new Date(iso), pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function openForm(p) {
    editing = p || null;
    var f = $('soForm'); f.hidden = false; f.reset();
    $('soFormTitle').textContent = p ? 'Edit Short' : 'New Short';
    $('soTitle').value = p ? p.title : '';
    $('soDesc').value = p ? p.description : '';
    $('soTags').value = p ? (p.tags || []).join(', ') : '';
    $('soLang').value = p ? p.language : 'es';
    $('soPrivacy').value = p ? p.privacy : 'public';
    $('soWhen').value = p ? toLocalInput(p.publish_at) : '';
    $('soNotes').value = p ? (p.notes || '') : '';
    $('soStatus').value = p && ['idea', 'draft', 'review', 'approved'].indexOf(p.status) > -1 ? p.status : 'draft';
    $('soStatusRow').hidden = !!(p && p.youtube_video_id);
    $('soFileRow').hidden = !!(p && p.youtube_video_id);
    $('soOnYouTube').hidden = !(p && p.youtube_video_id);
    $('soFileNow').replaceChildren(p && p.video_parts > 0 ? el('span', {}, el('span', {}, 'Current video:'), ' ' + (p.video_name || '') + ' (' + mb(p.video_size) + ')') : el('span', {}, ''));
    $('soProgress').hidden = true;
    countTitle();
    f.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('soTitle').focus({ preventScroll: true });
  }
  function closeForm() { $('soForm').hidden = true; editing = null; }
  function countTitle() { $('soTitleCount').textContent = $('soTitle').value.length + ' / 100'; }

  function uploadVideo(p, file) {
    var parts = Math.ceil(file.size / PART), done = 0;
    var bar = $('soBar'), label = $('soProgressText');
    $('soProgress').hidden = false;
    function next(i) {
      if (i >= parts) return Promise.resolve();
      label.replaceChildren(el('span', {}, 'Uploading video'), ' ' + (i + 1) + ' / ' + parts);
      var blob = file.slice(i * PART, Math.min(file.size, (i + 1) * PART));
      return sb.storage.from(BUCKET).upload('posts/' + p.id + '/part-' + String(i).padStart(3, '0'), blob, { upsert: true, contentType: 'application/octet-stream' })
        .then(function (r) {
          if (r.error) throw new Error(r.error.message);
          done++; bar.style.width = Math.round(done / parts * 100) + '%';
          return next(i + 1);
        });
    }
    var old = p.video_parts || 0;
    return next(0).then(function () {
      var extra = []; for (var j = parts; j < old; j++) extra.push('posts/' + p.id + '/part-' + String(j).padStart(3, '0'));
      return extra.length ? sb.storage.from(BUCKET).remove(extra) : null;
    }).then(function () {
      return { video_parts: parts, video_size: file.size, video_type: file.type || 'video/mp4', video_name: file.name.slice(0, 300) };
    });
  }

  function submit(e) {
    e.preventDefault();
    var b = $('soSave'), file = $('soFile').files[0];
    var title = $('soTitle').value.trim();
    if (!title) { $('soTitle').focus(); return msg('err', 'Add a title first.'); }
    if (file && !/^video\//.test(file.type || 'video/') ) return msg('err', 'Choose a video file.');
    var whenVal = $('soWhen').value;
    var fields = {
      title: title.slice(0, 100), description: $('soDesc').value.trim().slice(0, 5000),
      tags: $('soTags').value.split(',').map(function (t) { return t.trim().replace(/^#/, ''); }).filter(Boolean).slice(0, 30),
      language: $('soLang').value, privacy: $('soPrivacy').value,
      publish_at: whenVal ? new Date(whenVal).toISOString() : null,
      notes: $('soNotes').value.trim().slice(0, 2000) || null
    };
    var p = editing;
    if (!p || !p.youtube_video_id) fields.status = $('soStatus').value;
    if (p && p.status === 'failed' && !p.youtube_video_id) fields.status = 'approved';
    b.disabled = true; msg('', '');
    var start = p ? save(p, fields) : sb.from('social_posts').insert(fields).select().then(function (r) {
      if (r.error) throw new Error(r.error.message);
      posts.unshift(r.data[0]); return r.data[0];
    });
    start.then(function (row) {
      return file ? uploadVideo(row, file).then(function (v) { return save(row, v); }) : row;
    }).then(function (row) {
      if (row.youtube_video_id) return call('youtube-publish', { action: 'update', post_id: row.id }).then(function () { return row; });
      return row;
    }).then(function (row) {
      b.disabled = false; closeForm(); render();
      msg('ok', row.youtube_video_id ? 'Saved and updated on YouTube.' : 'Saved.');
    }).catch(function (err) {
      b.disabled = false; $('soProgress').hidden = true; msg('err', err.message || String(err)); render();
    });
  }

  function refreshStats(ev) {
    var b = ev.currentTarget; b.disabled = true;
    call('youtube-stats', {}).then(function () { b.disabled = false; msg('ok', 'Stats updated.'); load(); },
      function (e) { b.disabled = false; msg('err', e.message); });
  }

  // ---------- Wiring ----------
  function init() {
    $('soNew').addEventListener('click', function () { openForm(null); });
    $('soRefresh').addEventListener('click', refreshStats);
    $('soCancel').addEventListener('click', closeForm);
    $('soForm').addEventListener('submit', submit);
    $('soTitle').addEventListener('input', countTitle);
    $('soFilter').addEventListener('change', renderList);
    var r = new URLSearchParams(location.search).get('youtube');
    if (r) {
      var texts = {
        connected: ['ok', 'YouTube connected. Your Shorts can now post and schedule automatically.'],
        cancelled: ['err', 'YouTube wasn\'t connected: the Google sign-in was cancelled.'],
        expired: ['err', 'The Google sign-in took too long. Tap Connect YouTube again.'],
        nochannel: ['err', 'That Google account has no YouTube channel. Sign in with the account that owns your channel.'],
        error: ['err', 'YouTube couldn\'t be connected. Tap Connect YouTube to try again.']
      };
      var t = texts[r] || texts.error;
      setTimeout(function () { msg(t[0], t[1]); }, 300);
      history.replaceState(null, '', location.pathname + location.hash);
    }
  }
  window.CGGSocial = { show: function () { if (!loaded) load(); else render(); }, init: init };
})();
