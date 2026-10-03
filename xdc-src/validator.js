/* =========================================================================
 * Webxdc Creator Studio — validator.js
 * Layered project validator (structure, API, blocks).
 * ========================================================================= */
'use strict';
(function () {
  const CS = (globalThis.CS = globalThis.CS || {});
  const U = CS.util;

  /* APIs webxdc reales (spec oficial webxdc.org) */
  const KNOWN_API = [
    'sendUpdate', 'setUpdateListener', 'sendToChat', 'selfAddr', 'selfName',
    'importFiles', 'joinRealtimeChannel', 'sendUpdateInterval', 'sendUpdateMaxSize'
  ];
  const EXPERIMENTAL_API = ['joinRealtimeChannel'];
  const CLIENT_API = ['importFiles'];

  const LIMITS = {
    maxFiles: 200,
    warnFiles: 150,
    maxFileBytes: 2 * 1024 * 1024,
    maxTotalBytes: 12 * 1024 * 1024,
    warnTotalBytes: 8 * 1024 * 1024
  };

  /* ---------- Analysis helpers ---------- */

  /* Extrae atributos src/href de recursos de un HTML (DOMParser o regex). */
  function extractRefs(html) {
    const refs = [];
    let doc = null;
    if (typeof DOMParser !== 'undefined') {
      try { doc = new DOMParser().parseFromString(html, 'text/html'); } catch (e) { doc = null; }
    }
    if (doc) {
      const sel = 'script[src], link[href], img[src], source[src], audio[src], video[src], iframe[src], a[href]';
      U.$$(sel, doc).forEach(function (node) {
        refs.push({
          tag: node.tagName.toLowerCase(),
          src: node.getAttribute('src') || node.getAttribute('href') || ''
        });
      });
    } else {
      const re = /<(script|link|img|source|audio|video|iframe|a)\b[^>]*?(?:src|href)\s*=\s*["']([^"']+)["'][^>]*>/gi;
      let m;
      while ((m = re.exec(html))) refs.push({ tag: m[1].toLowerCase(), src: m[2] });
    }
    return refs;
  }

  function elementIds(html) {
    const ids = new Set();
    const re = /\bid\s*=\s*["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(html))) ids.add(m[1]);
    return ids;
  }

  function isExternal(src) {
    return /^(https?:|ftps?:)?\/\//i.test(src) || /^(https?|ftp):/i.test(src);
  }

  function isSkippableRef(src) {
    return /^(data:|blob:|mailto:|tel:|javascript:|#|\{\{)/i.test(src) || src === '';
  }

  function forEachTextFile(project, fn) {
    Object.keys(project.files).forEach(function (path) {
      const f = project.files[path];
      if (f && f.kind === 'text') fn(path, f.content);
    });
  }

  /* ---------- Validation principal ---------- */
  /* Devuelve [{ severity, layer, key, params }] ordenado por gravedad. */
  function validate(project) {
    const results = [];
    function add(severity, layer, key, params) {
      results.push({ severity: severity, layer: layer, key: key, params: params || {} });
    }

    if (!project || !project.files) {
      add('error', 'project', 'v_files_empty');
      return order(results);
    }
    const paths = Object.keys(project.files);

    /* ---- Capa 1: proyecto ---- */
    if (!paths.length) { add('error', 'project', 'v_files_empty'); return order(results); }

    if (!project.files['index.html']) add('error', 'project', 'v_no_index');
    else if (project.files['index.html'].kind !== 'text') add('error', 'project', 'v_index_not_text');

    if (paths.some(function (p) { return p.toLowerCase() === 'webxdc.js'; })) {
      add('error', 'project', 'v_webxdc_js_present');
    }

    if (paths.length > LIMITS.maxFiles) add('error', 'project', 'v_file_count_max', { n: paths.length, max: LIMITS.maxFiles });
    else if (paths.length > LIMITS.warnFiles) add('warning', 'project', 'v_file_count_high', { n: paths.length });

    const lower = paths.map(function (p) { return p.toLowerCase(); });
    const seenLower = {};
    paths.forEach(function (p, i) {
      if (!U.isSafePath(p)) add('error', 'project', 'v_bad_path', { path: p });
      else {
        if (/[A-Z]/.test(p) || / /.test(p)) add('warning', 'project', 'v_path_portability', { path: p });
        if (p.split('/').length > 4) add('info', 'project', 'v_deep_path', { path: p });
      }
      if (seenLower[lower[i]] !== undefined) add('warning', 'project', 'v_case_dup', { a: seenLower[lower[i]], b: p });
      else seenLower[lower[i]] = p;

      const f = project.files[p];
      const size = f.kind === 'text' ? U.byteLen(f.content) : (f.size || U.dataUrlToBytes(f.dataUrl || '').length);
      if (size > LIMITS.maxFileBytes) add('error', 'project', 'v_file_too_big', { path: p, size: U.formatBytes(size), max: U.formatBytes(LIMITS.maxFileBytes) });
    });

    const total = CS.projects ? CS.projects.totalSize(project) : 0;
    if (total > LIMITS.maxTotalBytes) add('error', 'project', 'v_total_max', { size: U.formatBytes(total), max: U.formatBytes(LIMITS.maxTotalBytes) });
    else if (total > LIMITS.warnTotalBytes) add('info', 'project', 'v_total_high', { size: U.formatBytes(total) });

    /* ---- Capa 2: recursos / rutas ---- */
    const indexPath = project.files['index.html'] && project.files['index.html'].kind === 'text' ? 'index.html' : null;
    if (indexPath) {
      const html = project.files['index.html'].content;
      const refs = extractRefs(html);
      let hasWebxdcTag = false;

      refs.forEach(function (r) {
        if (isSkippableRef(r.src)) return;
        if (U.normalizeRelPath(r.src) === 'webxdc.js') { hasWebxdcTag = true; return; }
        if (isExternal(r.src)) {
          add('warning', 'resources', 'v_external_ref', { tag: r.tag, src: U.truncate(r.src, 60) });
          return;
        }
        const resolved = U.resolveRelPath('', r.src);
        if (!resolved || !project.files[resolved]) {
          add('warning', 'resources', 'v_missing_ref', { tag: r.tag, src: U.truncate(r.src, 60) });
        }
      });
      if (!hasWebxdcTag) add('info', 'resources', 'v_no_webxdc_tag');

      /* meta viewport */
      if (!/name\s*=\s*["']viewport["']/i.test(html)) add('info', 'resources', 'v_no_viewport');

      /* miniapp title */
      const tm = html.match(/<title[^>]*>\s*([^<\s][^<]*?)\s*<\/title>/i);
      if (!tm) add('info', 'resources', 'v_no_title');

      /* refs dentro de otros HTML */
      paths.forEach(function (p) {
        if (p !== 'index.html' && U.extname(p) === 'html' && project.files[p].kind === 'text') {
          extractRefs(project.files[p].content).forEach(function (r) {
            if (isSkippableRef(r.src) || isExternal(r.src)) return;
            if (U.normalizeRelPath(r.src) === 'webxdc.js') return;
            const resolved = U.resolveRelPath(U.dirname(p), r.src);
            if (!resolved || !project.files[resolved]) {
              add('warning', 'resources', 'v_missing_ref_sub', { file: p, src: U.truncate(r.src, 50) });
            }
          });
        }
        /* url() dentro de CSS */
        if (U.extname(p) === 'css' && project.files[p].kind === 'text') {
          const re = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
          let m;
          while ((m = re.exec(project.files[p].content))) {
            const src = m[1];
            if (isSkippableRef(src) || isExternal(src)) continue;
            const resolved = U.resolveRelPath(U.dirname(p), src);
            if (!resolved || !project.files[resolved]) {
              add('warning', 'resources', 'v_missing_ref_sub', { file: p, src: U.truncate(src, 50) });
            }
          }
        }
      });
    }

    /* ---- Layer 3: basic security ---- */
    forEachTextFile(project, function (path, content) {
      if (/\beval\s*\(/.test(content) || /new\s+Function\s*\(/.test(content)) {
        add('info', 'security', 'v_eval_usage', { path: path });
      }
      if (/\.innerHTML\s*=/.test(content)) {
        add('info', 'security', 'v_innerhtml', { path: path });
      }
    });

    /* ---- Capa 3b: sintaxis del JS escrito a mano ---- */
    forEachTextFile(project, function (path, content) {
      if (U.extname(path) !== 'js') return;
      if (!content || U.byteLen(content) > 200000) return;   /* archivos enormes: saltar */
      if (/^\s*(import|export)\s/m.test(content)) return;   /* ES modules: out of scope */
      try {
        new Function(content);
      } catch (e) {
        add('warning', 'security', 'v_js_syntax', { path: path, err: U.truncate(String(e && e.message || e), 90) });
      }
    });

    /* ---- Capa 4: webxdc ---- */
    const apiSeen = {};
    forEachTextFile(project, function (path, content) {
      /* quitar el tag del script para no confundir “webxdc.js” con una llamada a la API */
      const clean = String(content).replace(/src\s*=\s*["']webxdc\.js["']/gi, '');
      const re = /webxdc\s*\.\s*([A-Za-z_$][\w$]*)/g;
      let m;
      while ((m = re.exec(clean))) {
        const name = m[1];
        apiSeen[name] = apiSeen[name] || [];
        if (apiSeen[name].indexOf(path) < 0) apiSeen[name].push(path);
      }
    });
    Object.keys(apiSeen).forEach(function (name) {
      if (KNOWN_API.indexOf(name) < 0) {
        add('warning', 'webxdc', 'v_api_unknown', { api: 'webxdc.' + name, files: apiSeen[name].join(', ') });
      }
    });
    if (apiSeen.joinRealtimeChannel) add('client', 'webxdc', 'v_realtime', { files: apiSeen.joinRealtimeChannel.join(', ') });
    if (apiSeen.importFiles) add('client', 'webxdc', 'v_importfiles', { files: apiSeen.importFiles.join(', ') });
    if (apiSeen.sendToChat) add('info', 'webxdc', 'v_sendtochat', { files: apiSeen.sendToChat.join(', ') });

    if (!project.files['manifest.toml']) add('info', 'webxdc', 'v_manifest_missing');
    else {
      const man = String(project.files['manifest.toml'].content || '');
      if (!/^\s*name\s*=/m.test(man)) add('warning', 'webxdc', 'v_manifest_no_name');
      if (/source_code_url\s*=\s*""/.test(man) || !/source_code_url\s*=/.test(man)) {
        add('info', 'webxdc', 'v_manifest_no_url');
      }
    }

    /* icono del chat */
    const hasIcon = Object.keys(project.files).some(function (p) {
      return /^icon\.(png|jpe?g)$/i.test(p);
    });
    if (!hasIcon) add('info', 'structure', 'v_no_icon');

    /* viewport meta (mobile) */
    if (indexPath) {
      const html = project.files['index.html'].content || '';
      if (!/name\s*=\s*["']viewport["']/i.test(html)) {
        add('warning', 'structure', 'v_no_viewport');
      }
      if (!/<script[^>]+webxdc\.js/i.test(html)) {
        add('warning', 'webxdc', 'v_no_webxdc_script');
      }
      /* charset */
      if (!/<meta[^>]+charset/i.test(html)) {
        add('info', 'structure', 'v_no_charset');
      }
    }

    /* empty text files */
    forEachTextFile(project, function (path, content) {
      if (!String(content || '').trim()) {
        add('info', 'structure', 'v_empty_file', { path: path });
      }
    });

    /* sendUpdate sin listener (aviso) */
    let hasSend = false, hasListen = false;
    forEachTextFile(project, function (path, content) {
      if (/sendUpdate\s*\(/.test(content)) hasSend = true;
      if (/setUpdateListener\s*\(/.test(content)) hasListen = true;
    });
    if (hasSend && !hasListen) add('warning', 'webxdc', 'v_send_without_listener');
    if (hasListen && !hasSend) add('info', 'webxdc', 'v_listen_without_send');

    /* localStorage sin try/catch (WebView a veces lo bloquea) */
    forEachTextFile(project, function (path, content) {
      if (/localStorage\./.test(content) && !/try\s*\{/.test(content)) {
        add('info', 'compat', 'v_localstorage_try', { path: path });
      }
    });

    /* ---- Capa 6: red (webxdc no tiene internet) ---- */
    forEachTextFile(project, function (path, content) {
      if (/\bfetch\s*\(/.test(content) || /XMLHttpRequest/.test(content)) {
        add('warning', 'security', 'v_network_api', { path: path });
      }
      if (/\bWebSocket\s*\(/.test(content) || /\bRTCPeerConnection\s*\(/.test(content)) {
        add('warning', 'security', 'v_network_api', { path: path });
      }
      if (/document\.write\s*\(/.test(content)) {
        add('warning', 'security', 'v_document_write', { path: path });
      }
    });

    /* ---- Capa 7: rendimiento obvio ---- */
    paths.forEach(function (p) {
      const f = project.files[p];
      const size = f.kind === 'text' ? U.byteLen(f.content) : (f.size || 0);
      if (size > 512 * 1024) add('info', 'project', 'v_perf_large_file', { path: p, size: U.formatBytes(size) });
    });
    const htmls = paths.filter(function (p) { return U.extname(p) === 'html' && project.files[p].kind === 'text'; });
    htmls.forEach(function (p) {
      const c = project.files[p].content || '';
      const scripts = c.match(/<script\b/gi);
      if (scripts && scripts.length > 12) add('info', 'project', 'v_perf_many_scripts', { path: p, n: scripts.length });
    });

    /* ---- Capa 5: bloques ---- */
    if (project.blocks && project.blocks.model) {
      const info = CS.blocks ? CS.blocks.referencedElements(project.blocks.model) : { ids: [], vars: [] };
      if (indexPath) {
        const ids = elementIds(project.files['index.html'].content);
        info.ids.forEach(function (id) {
          if (!ids.has(id)) add('warning', 'blocks', 'v_block_missing_el', { id: id });
        });
      }
      if (project.blocks.handEdited) add('info', 'blocks', 'v_blocks_hand_edited', { file: project.blocks.generatedFile });
      /* variables declared but never used in any block */
      const used = new Set();
      JSON.stringify(project.blocks.model, function (k, val) {
        if (k === 'into' || k === 'intoX' || k === 'intoY' || k === 'name' || k === 'a' || k === 'b' || k === 'x' || k === 'y') {
          if (val && typeof val === 'object' && val.kind === 'var') used.add(val.name);
        }
        if ((k === 'a' || k === 'b' || k === 'x' || k === 'y' || k === 'value' || k === 'text') && val && typeof val === 'object' && val.kind === 'var') used.add(val.name);
        return val;
      });
      (project.blocks.model.vars || []).forEach(function (vv) {
        if (used.has(vv.name)) return;
        /* uses outside its own declaration: at least 2 quoted name occurrences */
        const uses = JSON.stringify(project.blocks.model).split('"' + vv.name + '"').length - 1;
        if (uses < 2) add('info', 'blocks', 'v_var_unused', { name: vv.name });
      });

      /* incomplete blocks (required params empty) */
      if (CS.blocks && CS.blocks.DEFS) {
        function walkBlocks(list) {
          (list || []).forEach(function (b) {
            if (!b || !b.type) return;
            const def = CS.blocks.DEFS[b.type];
            if (def && def.params) {
              def.params.forEach(function (p) {
                if (p.optional) return;
                const v = b.params && b.params[p.key];
                const empty = v == null || v === '' ||
                  (typeof v === 'object' && v.kind === 'literal' && (v.value === '' || v.value == null));
                if (empty) add('warning', 'blocks', 'v_block_incomplete', { type: b.type, param: p.key });
              });
            }
            if (b.children) walkBlocks(b.children);
            if (b.childrenElse) walkBlocks(b.childrenElse);
          });
        }
        const ctx = project.blocks.model.contexts || {};
        Object.keys(ctx).forEach(function (k) {
          const node = ctx[k];
          if (Array.isArray(node)) walkBlocks(node);
          else if (node && Array.isArray(node.blocks)) walkBlocks(node.blocks);
          else if (Array.isArray(node)) walkBlocks(node);
          else if (node && typeof node === 'object') {
            Object.keys(node).forEach(function (sub) {
              if (Array.isArray(node[sub])) walkBlocks(node[sub]);
              else if (node[sub] && Array.isArray(node[sub].blocks)) walkBlocks(node[sub].blocks);
            });
          }
        });
      }
    }

    /* ---- Layer 8: nearly empty index.html / no useful content ---- */
    if (indexPath) {
      const html = String(project.files['index.html'].content || '');
      const stripped = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (stripped.length < 8) add('warning', 'structure', 'v_index_nearly_empty');
    }

    /* ---- Layer 9: orphan CSS/JS (referenced in index but unused? inverse already covered) ---- */
    /* detect .js/.css files not referenced by any HTML */
    if (indexPath) {
      const allHtml = paths.filter(function (p) { return U.extname(p) === 'html' && project.files[p].kind === 'text'; });
      const referenced = new Set();
      allHtml.forEach(function (hp) {
        extractRefs(project.files[hp].content).forEach(function (r) {
          if (isSkippableRef(r.src) || isExternal(r.src)) return;
          const resolved = U.resolveRelPath(U.dirname(hp), r.src);
          if (resolved) referenced.add(resolved);
        });
      });
      paths.forEach(function (p) {
        const ext = U.extname(p);
        if ((ext === 'js' || ext === 'css') && p !== 'webxdc.js' && !referenced.has(p)) {
          /* no marcar app generada por bloques ni archivos de sistema comunes */
          if (/^app\.js$|^style\.css$|^main\.js$|^index\.js$/i.test(p)) return;
          if (project.blocks && project.blocks.generatedFile === p) return;
          add('info', 'resources', 'v_orphan_asset', { path: p });
        }
      });
    }

    return order(results);
  }

  function order(results) {
    const rank = { error: 0, warning: 1, client: 2, info: 3 };
    return results.slice().sort(function (a, b) { return (rank[a.severity] || 9) - (rank[b.severity] || 9); });
  }

  function counts(results) {
    const c = { error: 0, warning: 0, client: 0, info: 0 };
    (results || []).forEach(function (r) { if (c[r.severity] != null) c[r.severity]++; });
    return c;
  }

  CS.validator = { validate, counts, extractRefs, elementIds, LIMITS, KNOWN_API };
  if (typeof module !== 'undefined' && module.exports) { module.exports = CS.validator; }
})();
