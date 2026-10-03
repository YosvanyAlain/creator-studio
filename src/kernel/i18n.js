/* i18n: Spanish and English tables; locales add keys with CS.i18n.add(lang, table). */
'use strict';
(function () {
  const CS = globalThis.CS;
  const tables = { es: {}, en: {} };
  const SUPPORTED = ['es', 'en'];

  function detect() {
    const pref = CS.settings.get('lang');
    if (pref && pref !== 'auto' && SUPPORTED.includes(pref)) return pref;
    const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'es']);
    for (const code of langs) {
      const short = String(code || '').slice(0, 2).toLowerCase();
      if (SUPPORTED.includes(short)) return short;
    }
    return 'en';
  }

  let lang = 'es';

  function format(text, vars) {
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (match, name) => (vars[name] != null ? String(vars[name]) : match));
  }

  /* Plurals: key_one / key_other, chosen by vars.n. */
  function t(key, vars) {
    let k = key;
    if (vars && typeof vars.n === 'number') {
      const form = vars.n === 1 ? key + '_one' : key + '_other';
      if (tables[lang][form] != null || tables.en[form] != null) k = form;
    }
    const text = tables[lang][k] != null ? tables[lang][k] : tables.en[k] != null ? tables.en[k] : tables.es[k];
    if (text == null) {
      if (CS.i18n && CS.i18n.strict) throw new Error('missing i18n key: ' + key);
      return key;
    }
    return format(text, vars);
  }

  CS.i18n = {
    strict: false,
    add(code, table) { Object.assign(tables[code] || (tables[code] = {}), table); },
    t,
    has: (key) => tables.es[key] != null || tables.en[key] != null,
    init() {
      lang = detect();
      document.documentElement.lang = lang;
      return lang;
    },
    setLang(code) {
      CS.settings.set('lang', code);
      lang = detect();
      document.documentElement.lang = lang;
      CS.bus.emit('lang', lang);
    },
    get lang() { return lang; },
    tables: () => tables,
    SUPPORTED
  };
  CS.t = t;
})();
