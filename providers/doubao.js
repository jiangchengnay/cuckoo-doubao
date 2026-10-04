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
};
