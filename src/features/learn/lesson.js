/* Lesson player: one step at a time, check/continue footer, and a celebration screen at the end. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, ui, router } = CS;
  const t = (...a) => CS.t(...a);
  const L = (v) => CS.learn.L(v);

  let session = null;

  const PRAISE = ['ls_ok_1', 'ls_ok_2', 'ls_ok_3', 'ls_ok_4'];

  function render(params) {
    const lesson = CS.learn.lesson(params.id);
    if (!lesson) return ui.empty({ icon: 'learn', title: t('ls_missing'), action: ui.button({ label: t('tab_learn'), onClick: () => router.switchTab('learn') }) });
    const track = CS.learn.trackOf(lesson);
    const steps = lesson.steps;
    const S = session = { lesson, idx: 0, right: 0, asked: 0, finished: false, step: null, tried: false, phase: 'answer' };

    const bar = h('div', { class: 'ls-bar' }, steps.map(() => h('span', { class: 'ls-seg' }, h('i'))));
    const counter = h('span', { class: 'ls-count' });
    const top = h('header', { class: 'ls-top' },
      ui.iconButton('close', t('close'), () => router.back(), { class: 'ls-close' }),
      h('div', { class: 'ls-progress' }, bar),
      counter);
    const body = h('main', { class: 'ls-body' });
    const feedback = h('div', { class: 'ls-feedback', hidden: true });
    const primary = ui.button({ label: t('ls_continue'), variant: 'primary', size: 'lg', block: true, onClick: () => onPrimary() });
    const skip = ui.button({ label: t('ls_skip'), variant: 'ghost', onClick: () => advance() });
    const foot = h('footer', { class: 'ls-foot' }, feedback, h('div', { class: 'ls-foot-row' }, skip, primary));
    const root = h('div', { class: ['ls', 'tscope-' + (track ? track.tint : 'indigo')] }, top, body, foot);

    function paintBar() {
      [...bar.children].forEach((seg, i) => { seg.classList.toggle('done', i < S.idx); seg.classList.toggle('now', i === S.idx); });
      counter.textContent = (S.idx + 1) + '/' + steps.length;
    }

    function setPrimary(label, enabled, kind) {
      primary.querySelector('.btn-label').textContent = label;
      primary.disabled = !enabled;
      primary.classList.toggle('btn-ok', kind === 'ok');
      primary.classList.toggle('btn-bad', kind === 'bad');
    }

    function onState() {
      if (S.phase !== 'answer' || !S.step.check) return;
      setPrimary(t('ls_check'), S.step.ready());
    }

    function showStep() {
      if (S.step && S.step.destroy) S.step.destroy();
      const def = steps[S.idx];
      const make = CS.learnUi.STEPS[def.t] || CS.learnUi.STEPS.read;
      S.step = make(def, onState);
      S.phase = 'answer';
      S.tried = false;
      feedback.hidden = true;
      foot.className = 'ls-foot';
      skip.hidden = !S.step.check;
      CS.mount(body, h('div', { class: 'ls-step ls-in', dataset: { type: def.t } }, S.step.node));
      body.scrollTop = 0;
      paintBar();
      if (S.step.check) setPrimary(t('ls_check'), S.step.ready());
      else setPrimary(S.idx === steps.length - 1 ? t('ls_finish') : t('ls_continue'), true);
    }

    function onPrimary() {
      if (S.phase === 'answer' && S.step.check) {
        const r = S.step.check();
        if (!S.tried) { S.asked++; if (r.ok) S.right++; }
        S.tried = true;
        showFeedback(r);
        return;
      }
      if (S.phase === 'retry') {
        S.step.reset();
        S.phase = 'answer';
        feedback.hidden = true;
        foot.className = 'ls-foot';
        setPrimary(t('ls_check'), S.step.ready());
        return;
      }
      advance();
    }

    function showFeedback(r) {
      const ok = r.ok || r.soft;
      CS.haptic(ok ? 12 : [24, 50, 24]);
      foot.className = 'ls-foot ' + (r.ok ? 'is-ok' : ok ? 'is-soft' : 'is-bad');
      const title = r.ok ? t(PRAISE[(S.idx + S.right) % PRAISE.length]) : ok ? t('ls_soft') : t('ls_bad');
      CS.mount(feedback, h('div', { class: 'ls-fb-icon' }, CS.icon(r.ok ? 'check' : ok ? 'checkCircle' : 'close')),
        h('div', { class: 'ls-fb-main' }, h('div', { class: 'ls-fb-title' }, title), r.why ? CS.learnUi.rich(r.why, 'ls-fb-why') : null));
      feedback.hidden = false;
      skip.hidden = true;
      if (ok) { S.phase = 'next'; setPrimary(S.idx === steps.length - 1 ? t('ls_finish') : t('ls_continue'), true, 'ok'); }
      else { S.phase = 'retry'; setPrimary(t('ls_retry'), true, 'bad'); skip.hidden = false; }
    }

    function advance() {
      if (S.idx < steps.length - 1) { S.idx++; showStep(); return; }
      finish();
    }

    function finish() {
      if (S.step && S.step.destroy) S.step.destroy();
      S.finished = true;
      const res = CS.learn.complete(lesson.id, { right: S.right, asked: S.asked });
      paintBar();
      [...bar.children].forEach((seg) => seg.classList.add('done'));
      counter.textContent = '';
      CS.mount(body, celebrate(lesson, track, res, S));
      foot.className = 'ls-foot is-end';
      feedback.hidden = true;
      skip.hidden = true;
      const next = CS.learn.nextLesson();
      if (next && next.id !== lesson.id) {
        setPrimary(t('ls_next_lesson'), true);
        S.step = { check: null };
        S.phase = 'end';
        primary.onclick = () => { CS.haptic(); router.go('lesson', { id: next.id }, { replace: true }); };
        skip.hidden = false;
        skip.querySelector('.btn-label').textContent = t('ls_back_path');
        skip.onclick = () => router.back();
      } else {
        setPrimary(t('ls_back_path'), true);
        primary.onclick = () => router.back();
      }
    }

    requestAnimationFrame(showStep);
    return root;
  }

  function celebrate(lesson, track, res, S) {
    const pct = S.asked ? Math.round((S.right / S.asked) * 100) : 100;
    const confetti = h('div', { class: 'ls-confetti', 'aria-hidden': 'true' },
      Array.from({ length: 28 }, (_, i) => h('i', { style: { left: ((i * 37) % 100) + '%', animationDelay: ((i % 7) * 0.09) + 's', animationDuration: (1.6 + (i % 5) * 0.25) + 's' }, class: 'c' + (i % 5) })));
    const ring = h('div', { class: 'ls-ring', ref: (n) => n.style.setProperty('--p', String(pct)) },
      h('div', { class: 'ls-ring-in' }, h('b', {}, pct + '%'), h('span', {}, t('ls_score'))));
    const s = CS.learn.stats();
    const chips = [
      h('div', { class: 'ls-stat' }, CS.icon('bolt'), h('b', {}, '+' + (res ? res.xp : 0)), h('span', {}, 'XP')),
      h('div', { class: 'ls-stat' }, CS.icon('checkCircle'), h('b', {}, S.right + '/' + S.asked), h('span', {}, t('ls_correct'))),
      h('div', { class: 'ls-stat' }, CS.icon('flag'), h('b', {}, String(s.streak)), h('span', {}, t('lr_streak_short')))
    ];
    return h('div', { class: 'ls-end' }, confetti,
      ring,
      h('h2', { class: 'ls-end-title' }, res && res.perfect ? t('ls_end_perfect') : t('ls_end_title')),
      h('p', { class: 'ls-end-sub' }, t('ls_end_sub', { lesson: L(lesson.title) })),
      h('div', { class: 'ls-stats' }, chips),
      res && res.levelUp ? h('div', { class: 'ls-award level' }, ui.tile('trophy', 'amber'), h('div', {}, h('b', {}, t('lr_level_up')), h('span', {}, t('lr_level_n', { n: res.levelUp }) + ' · ' + t('lv_' + res.levelUp)))) : null,
      res ? res.medals.map((m) => h('div', { class: 'ls-award' }, ui.tile(m.icon, m.tint), h('div', {}, h('b', {}, t('lr_new_medal')), h('span', {}, medalName(m))))) : null);
  }

  function medalName(m) { return m.track ? t('md_track', { name: L(m.track.title) }) : t('md_' + m.id); }

  router.register('lesson', {
    tab: 'learn', noAppbar: true, immersive: true, flush: true,
    title: (p) => { const l = CS.learn.lesson(p.id); return l ? L(l.title) : t('tab_learn'); },
    render,
    leave: async () => {
      const S = session;
      if (!S) return true;
      if (!S.finished && S.idx > 0) {
        const ok = await ui.confirm({ title: t('ls_leave_title'), message: t('ls_leave_body'), okLabel: t('ls_leave'), danger: true });
        if (!ok) return false;
      }
      if (S.step && S.step.destroy) S.step.destroy();
      session = null;
      return true;
    }
  });

  CS.learnUi.medalName = medalName;
})();
