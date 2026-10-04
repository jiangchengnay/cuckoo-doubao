/**
 * 豆包（Doubao）平台 Provider —— 插件版
 * 由 Cuckoo Code 插件系统加载。hook 已内联，自包含，无外部依赖。
 */
var DOUBAO_HOOK = "\"use strict\";\n(() => {\n  // src/providers/hooks/shared/sse.ts\n  function createFrameDecoder() {\n    var buffer = \"\", scanFrom = 0;\n    return {\n      push: function(text) {\n        buffer += text;\n        var frames = [], re = /\\r?\\n\\r?\\n/g, offset = 0, m;\n        re.lastIndex = scanFrom;\n        while ((m = re.exec(buffer)) !== null) {\n          frames.push(buffer.slice(offset, m.index));\n          offset = m.index + m[0].length;\n        }\n        buffer = buffer.slice(offset);\n        scanFrom = Math.max(0, buffer.length - 3);\n        return frames;\n      },\n      finish: function() {\n        var frames = [];\n        if (buffer) frames.push(buffer);\n        buffer = \"\";\n        scanFrom = 0;\n        return frames;\n      }\n    };\n  }\n  function extractData(block) {\n    if (!block || !block.trim()) return null;\n    var data = null;\n    var lines = block.split(/\\r\\n|\\r|\\n/);\n    for (var i = 0; i < lines.length; i++) {\n      var line = lines[i];\n      if (line.indexOf(\"data:\") === 0) {\n        var d = line.slice(5).trim();\n        data = data == null ? d : data + \"\\n\" + d;\n      }\n    }\n    return data;\n  }\n  function createIdleWatcher() {\n    var lastActiveAt = Date.now();\n    var timer = null;\n    var stopped = false;\n    function readTimeout() {\n      try {\n        var v = parseInt(localStorage.getItem(\"cuckoo-xhr-idle-timeout\") || \"\", 10);\n        if (isFinite(v)) return v;\n      } catch (e) {\n      }\n      return 3e5;\n    }\n    function sessionId() {\n      try {\n        var m = String(location.href).match(/\\/chat\\/s\\/([a-f0-9-]+)/i) || String(location.href).match(/\\/chat\\/([a-zA-Z0-9_-]+)/i);\n        return m ? m[1] : null;\n      } catch (e) {\n        return null;\n      }\n    }\n    function start() {\n      var timeout = readTimeout();\n      if (timeout <= 0) return;\n      timer = setInterval(function() {\n        if (stopped) {\n          stop();\n          return;\n        }\n        if (Date.now() - lastActiveAt > timeout) {\n          lastActiveAt = Date.now();\n          try {\n            window.dispatchEvent(new CustomEvent(\"cuckoo-stream-idle\", { detail: { sessionId: sessionId() } }));\n          } catch (e) {\n          }\n        }\n      }, 5e3);\n    }\n    function touch() {\n      lastActiveAt = Date.now();\n    }\n    function stop() {\n      stopped = true;\n      if (timer) {\n        clearInterval(timer);\n        timer = null;\n      }\n    }\n    return { start, touch, stop };\n  }\n\n  // src/providers/hooks/doubao.ts\n  function install() {\n    var MARKER = \"__cuckooDoubaoHookInstalled__\";\n    if (window[MARKER]) return;\n    window[MARKER] = true;\n    window.__ckDoubaoRaw = [];\n    function recRaw(ev, data) {\n      try {\n        var arr = window.__ckDoubaoRaw;\n        arr.push({ ev, data: String(data).slice(0, 800) });\n        if (arr.length > 80) arr.shift();\n      } catch (e) {\n      }\n    }\n    function isCompletion(url, method) {\n      if (!url) return false;\n      if (String(method || \"GET\").toUpperCase() !== \"POST\") return false;\n      try {\n        var u = new URL(url, document.baseURI);\n        if (u.hostname.indexOf(\"doubao.com\") === -1) return false;\n        return u.pathname.indexOf(\"/chat/completion\") >= 0;\n      } catch (e) {\n        return String(url).indexOf(\"/chat/completion\") !== -1;\n      }\n    }\n    var lastStreamAt = 0;\n    function dispatchStream(text, finished) {\n      var now = Date.now();\n      if (!finished && now - lastStreamAt < 80) return;\n      lastStreamAt = now;\n      try {\n        window.dispatchEvent(new CustomEvent(\"cuckoo-ai-stream\", { detail: { think: \"\", text: text || \"\", finished: !!finished } }));\n      } catch (e) {\n      }\n    }\n    function dispatch(text, finished) {\n      try {\n        if (finished && !(text && text.trim())) {\n          window.dispatchEvent(new CustomEvent(\"cuckoo-ai-error\", { detail: { text: \"\", status: \"error\", reason: \"empty\" } }));\n          return;\n        }\n        window.dispatchEvent(new CustomEvent(\"cuckoo-ai-response\", { detail: { text: text || \"\", finished: !!finished } }));\n      } catch (e) {\n      }\n    }\n    function observeBody(body) {\n      if (!body) return;\n      var reader = body.getReader();\n      var decoder = new TextDecoder();\n      var frameDecoder = createFrameDecoder();\n      var body = \"\";\n      var brief = \"\";\n      var dispatched = false;\n      var idle = createIdleWatcher();\n      idle.start();\n      function appendBody(frag) {\n        if (!frag) return;\n        if (body.length >= frag.length && body.slice(-frag.length) === frag) return;\n        body += frag;\n      }\n      function finalize() {\n        if (dispatched) return;\n        dispatched = true;\n        idle.stop();\n        var finalText = body || brief;\n        console.log(\"[Cuckoo Code][hook][doubao] \\u56DE\\u590D\\u5B8C\\u6210 body=\" + body.length + \" brief=\" + brief.length + \" => \" + finalText.length);\n        try {\n          console.log(\"[Cuckoo Code][hook][doubao] \\u6B63\\u6587b64: \" + btoa(unescape(encodeURIComponent(String(finalText).slice(0, 3e3)))));\n        } catch (e) {\n        }\n        dispatchStream(finalText, true);\n        dispatch(finalText, true);\n      }\n      function scanText(obj, sink) {\n        if (!obj || typeof obj !== \"object\") return;\n        for (var k in obj) {\n          if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;\n          var v = obj[k];\n          if (typeof v === \"string\" && (k === \"text\" || k === \"content\")) {\n            sink(v);\n          } else if (v && typeof v === \"object\") scanText(v, sink);\n        }\n      }\n      function handleFrame(block) {\n        if (!block) return;\n        idle.touch();\n        var lines = block.split(/\\r\\n|\\r|\\n/);\n        var eventName = \"\";\n        for (var i = 0; i < lines.length; i++) {\n          if (lines[i].indexOf(\"event:\") === 0) eventName = lines[i].slice(6).trim();\n        }\n        var data = extractData(block);\n        if (!data) return;\n        var json = null;\n        try {\n          json = JSON.parse(data);\n        } catch (e) {\n          return;\n        }\n        recRaw(eventName, data);\n        if (eventName === \"CHUNK_DELTA\" && typeof json.text === \"string\") {\n          appendBody(json.text);\n          dispatchStream(body, false);\n          return;\n        }\n        if (eventName === \"STREAM_CHUNK\" && json.patch_op && json.patch_op.length) {\n          for (var a = 0; a < json.patch_op.length; a++) {\n            var op = json.patch_op[a];\n            var pv = op && op.patch_value;\n            if (!pv) continue;\n            if (pv.content_block && pv.content_block.length) {\n              for (var b = 0; b < pv.content_block.length; b++) {\n                var cb = pv.content_block[b];\n                if (cb && cb.content && cb.content.text_block && typeof cb.content.text_block.text === \"string\") appendBody(cb.content.text_block.text);\n              }\n            }\n          }\n          dispatchStream(body, false);\n          return;\n        }\n        if (eventName === \"STREAM_MSG_NOTIFY\" && json.content) {\n          var cbs = json.content.content_block;\n          if (cbs && cbs.length) {\n            for (var c = 0; c < cbs.length; c++) {\n              var cb2 = cbs[c];\n              if (cb2 && cb2.content && cb2.content.text_block && typeof cb2.content.text_block.text === \"string\") appendBody(cb2.content.text_block.text);\n            }\n          }\n          dispatchStream(body, false);\n          return;\n        }\n        if (eventName === \"SSE_REPLY_END\") {\n          if (json.end_type === 1) {\n            if (json.msg_finish_attr && typeof json.msg_finish_attr.brief === \"string\") brief = json.msg_finish_attr.brief;\n            finalize();\n          }\n          return;\n        }\n      }\n      function pump() {\n        reader.read().then(function(res) {\n          if (res.done) {\n            var rest = frameDecoder.finish();\n            for (var i = 0; i < rest.length; i++) handleFrame(rest[i]);\n            if (body) finalize();\n            return;\n          }\n          var chunk = decoder.decode(res.value, { stream: true });\n          var frames = frameDecoder.push(chunk);\n          for (var j = 0; j < frames.length; j++) handleFrame(frames[j]);\n          pump();\n        }).catch(function() {\n        });\n      }\n      pump();\n    }\n    var origFetch = window.fetch;\n    window.fetch = function(input, init) {\n      var url = typeof input === \"string\" ? input : input && input.url;\n      var method = init && init.method || input && input.method || \"GET\";\n      var p = origFetch.apply(this, arguments);\n      try {\n        if (isCompletion(url, method)) {\n          p.then(function(resp) {\n            try {\n              if (resp && resp.body) {\n                console.log(\"[Cuckoo Code][hook][doubao] \\u547D\\u4E2D completion\");\n                observeBody(resp.clone().body);\n              }\n            } catch (e) {\n            }\n          }).catch(function() {\n          });\n        }\n      } catch (e) {\n      }\n      return p;\n    };\n  }\n  install();\n})();\n";

module.exports = {
  id: 'doubao',
  name: '豆包',
  useIntercept: true,
  homeUrl: 'https://www.doubao.com/chat/',
  sessionUrlBase: 'https://www.doubao.com/chat/',

  findInput: function () {
    var sels = ["textarea[placeholder*=\"发消息\"]","textarea[placeholder*=\"消息\"]","textarea[placeholder*=\"输入\"]","textarea[data-testid*=\"input\"]","textarea","div[contenteditable=\"true\"]","[role=\"textbox\"]"];
    for (var i = 0; i < sels.length; i++) {
      try { var el = document.querySelector(sels[i]); if (this.isElementVisible(el)) return el; } catch (e) {}
    }
    return null;
  },

  findSendButton: function () {
    var sels = ["button[data-testid*=\"send\"]","button[aria-label*=\"发送\"]","button[aria-label*=\"send\"]","button[type=\"submit\"]","button:has(svg)"];
    for (var i = 0; i < sels.length; i++) {
      try { var b = document.querySelector(sels[i]); if (this.isElementVisible(b) && !b.disabled) return b; } catch (e) {}
    }
    return null;
  },

  homeUrlPattern: /^https:\/\/www\.doubao\.com\/chat\/?(\?.*)?$/,

  extractSessionId: function (url) {
    if (!url) return null;
    var m = String(url).match(/\/chat\/(\d{6,})/);
    return m ? m[1] : null;
  },

  matchesUrl: function (url) { return String(url).indexOf("doubao.com") !== -1; },

  isElementVisible: function (el) { return !!el && el.offsetWidth > 0 && el.offsetHeight > 0; },

  extractUserInfo: function () {
    var sels = ["[class*=\"user-name\"]", "[class*=\"nickname\"]", "[data-testid*=\"user\"]"];
    for (var i = 0; i < sels.length; i++) {
      try { var el = document.querySelector(sels[i]); if (el) { var t = (el.textContent || "").trim(); if (t && t.length <= 24) return t; } } catch (e) {}
    }
    return "";
  },

  getHookSource: function () { return DOUBAO_HOOK; },

  triggerSend: function (input) {
    try {
      if (input && input.focus) input.focus();
      var o = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true, isComposing: false };
      input.dispatchEvent(new KeyboardEvent("keydown", o));
      input.dispatchEvent(new KeyboardEvent("keypress", o));
      input.dispatchEvent(new KeyboardEvent("keyup", o));
      return true;
    } catch (e) { return false; }
  },

  // ===== 纯净模式「暂停」：精确定位站点的「停止」按钮 =====
  // 关键：只认「停止/stop」文本或「stop/abort」类名，并显式排除「音乐生成/生成图片」等
  // 易被通用启发式误点的按钮（群友反馈：点暂停会点开音乐生成）。
  // 取面积最小的匹配元素（叶子才是按钮本体）。
  getStopFn: function () {
    return function doubaoStopLocator(doc, win) {
      var out = { found: false, cands: [], api: 'none' };
      try {
        var STOP = /(停止生成|停止回答|停止输出|停止|stop|abort|中断生成|结束生成)/i;
        var EXCLUDE = /(音乐|生成图片|图片生成|生成视频|视频生成|上传|附件|语音|朗读|复制|分享|重试|重新生成|点赞|点踩|反馈|深度思考|联网搜索)/i;
        var best = null;
        var all = doc.querySelectorAll('button,[role="button"],div[role="button"],span[role="button"],a');
        for (var i = 0; i < all.length; i++) {
          var el = all[i];
          try { if (el.closest && (el.closest('#cuckoo-overlay') || el.closest('.cuckoo-overlay') || el.closest('[class*="cuckoo-"]'))) continue; } catch (e) {}
          var cls = (typeof el.className === 'string') ? el.className : '';
          if (/cuckoo/i.test(cls)) continue;
          var txt = (el.textContent || '').trim();
          var aria = (el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('title'))) || '';
          var sig = (txt + ' ' + aria + ' ' + cls).trim();
          if (EXCLUDE.test(sig)) continue;
          var hitText = STOP.test(txt + ' ' + aria);
          var hitClass = /(^|[\s_-])(stop|abort)([\s_-]|$)/i.test(cls);
          if (!hitText && !hitClass) continue;
          var r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
          if (!r || r.width === 0 || r.height === 0) continue;
          var area = r.width * r.height;
          var score = area - (hitText ? 100000 : 0); // 文本命中优先，其次面积最小
          if (!best || score < best.score) best = { el: el, score: score, r: r, sig: (txt || aria || cls).slice(0, 40) };
        }
        if (best) {
          var cx = Math.round(best.r.left + best.r.width / 2);
          var cy = Math.round(best.r.top + best.r.height / 2);
          try { best.el.click(); out.api = 'clicked'; } catch (e) { out.api = 'click-error'; }
          out.found = true; out.x = cx; out.y = cy; out.tag = best.sig;
          out.cands.push('stop:' + best.sig + '@' + cx + ',' + cy);
        }
        try {
          var diag = [];
          var btns = doc.querySelectorAll('button,[role="button"]');
          var vh = win.innerHeight || 800;
          for (var j = 0; j < btns.length && diag.length < 8; j++) {
            var b = btns[j];
            try { if (b.closest && b.closest('[class*="cuckoo-"]')) continue; } catch (e) {}
            var br = b.getBoundingClientRect ? b.getBoundingClientRect() : null;
            if (!br || br.width === 0 || br.top < vh * 0.5) continue;
            var t = (b.textContent || '').trim().slice(0, 10);
            var a = (b.getAttribute && (b.getAttribute('aria-label') || b.getAttribute('title'))) || '';
            diag.push((t || a || '?') + '@' + Math.round(br.left) + ',' + Math.round(br.top));
          }
          out.cands = out.cands.concat(diag);
        } catch (e) {}
        console.log('[doubao-stop] found=' + out.found + ' api=' + out.api + ' ' + JSON.stringify(out.cands));
        return out;
      } catch (e) {
        return { found: false, error: String(e && e.message) };
      }
    };
  },

  // ===== harness 附件上传：上传入口探测（保守，避免通用启发式乱点）=====
  // 优先隐藏 input[type=file]；其次文本/aria 明确含"上传/附件/文件/图片"的可见按钮；
  // 找不到返回 found:false（不瞎点，避免误触"音乐生成"等）。
  getAttachProbeSource: function () {
    return '(' + function doubaoAttachProbe(doc, win, fileInfo) {
      try {
        var vh = win.innerHeight || 800;
        var vw = win.innerWidth || 1200;
        function visible(el) {
          var r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
          if (!r || r.width === 0 || r.height === 0) return null;
          if (r.left < 0 || r.top < 0 || r.left > vw || r.top > vh) return null;
          return r;
        }
        function own(el) { try { return !!(el.closest && el.closest('[class*="cuckoo-"]')); } catch (e) { return false; } }
        function pick(el, tag) {
          var r = el.getBoundingClientRect();
          return { found: true, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), tag: tag };
        }
        // ① 隐藏 file input（豆包上传可能用它）
        try {
          var fi = doc.querySelector('input[type=file]');
          if (fi) {
            var rf = fi.getBoundingClientRect ? fi.getBoundingClientRect() : null;
            if (rf && rf.width > 0 && rf.height > 0) return pick(fi, 'file-input');
            // 隐藏的：返回其附近"上传/附件"按钮，否则直接返回 input 自身坐标(0,0)不可点 → 交给调用方
            return { found: false, reason: 'file-input-hidden', hasFileInput: true };
          }
        } catch (e) {}
        // ② 明确的上传/附件按钮（文本/aria/title）
        var KEY = /^(上传|上传文件|上传附件|附件|添加附件|选择文件|本地文件|图片|相册)$/;
        var EXCL = /(音乐|生成|视频|语音|朗读|发送|停止|搜索|联网)/i;
        var best = null;
        var all = doc.querySelectorAll('button,[role="button"],[class*="upload"],[class*="attach"],[class*="file"]');
        for (var i = 0; i < all.length; i++) {
          var el = all[i];
          if (own(el)) continue;
          var cls = (typeof el.className === 'string') ? el.className : '';
          if (/cuckoo/i.test(cls)) continue;
          var txt = (el.textContent || '').trim();
          var aria = (el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('title'))) || '';
          var sig = (txt + ' ' + aria).trim();
          if (EXCL.test(sig)) continue;
          var hit = KEY.test(txt) || KEY.test(aria) || /upload|attach|paperclip/i.test(cls);
          if (!hit) continue;
          var r = visible(el);
          if (!r) continue;
          var area = r.width * r.height;
          if (!best || area < best.area) best = { el: el, area: area, r: r, sig: (txt || aria || cls).slice(0, 30) };
        }
        if (best) return pick(best.el, 'attach-btn:' + best.sig);
        return { found: false, reason: 'no-attach-candidate' };
      } catch (e) {
        return { found: false, reason: 'error:' + (e && e.message) };
      }
    }.toString() + ')';
  },
};
