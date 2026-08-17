/* utter-office 原型交互 · 对齐实装手势语义 */
(function () {
  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $$(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  // Embed：讲解壳 iframe 内导航，不跳出到目录页
  var embed =
    /(?:^|[?&])embed=1(?:&|$)/.test(location.search) ||
    (window.parent && window.parent !== window);
  if (embed) {
    document.documentElement.classList.add("embed");
  }

  var TAB_FILES = {
    "02-home.html": 1,
    "03-board.html": 1,
    "04-voice.html": 1,
    "05-workbench.html": 1,
    "06-mine.html": 1,
  };

  var PAGE_TITLE = {
    "02-home.html": "首页",
    "03-board.html": "看板",
    "04-voice.html": "录音",
    "05-workbench.html": "工作台",
    "06-mine.html": "我的",
    "07-staff-roster.html": "数字员工",
    "08-staff-profile.html": "员工档案",
    "09-staff-picker.html": "选择员工",
    "10-assistant-settings.html": "秘书设置",
    "11-brief-detail.html": "简报",
    "12-voice-talk.html": "发语音",
    "13-voice-record.html": "录音",
    "14-voice-translate.html": "翻译",
    "15-inbox.html": "收件箱",
    "16-projects.html": "项目",
  };

  function currentFile() {
    try {
      return (location.pathname.split("/").pop() || "").split("?")[0];
    } catch (e) {
      return "";
    }
  }

  function isEmbed() {
    return /(?:^|[?&])embed=1(?:&|$)/.test(location.search) || embed;
  }

  /** 当前页的返回链（from / fromLabel / ret），换页时原样塞给下一页的 ret */
  function currentReturnChain() {
    var sp = new URLSearchParams(location.search);
    var ret = new URLSearchParams();
    if (sp.get("from")) ret.set("from", sp.get("from"));
    if (sp.get("fromLabel")) ret.set("fromLabel", sp.get("fromLabel"));
    if (sp.get("ret")) ret.set("ret", sp.get("ret"));
    return ret.toString();
  }

  function protoFileFromHref(href) {
    if (!href || href === "#" || href.indexOf("javascript:") === 0) return null;
    try {
      var u = new URL(href, location.href);
      var name = u.pathname.split("/").pop() || "";
      if (!/\.html$/i.test(name)) return null;
      if (/^00-index\.html$/i.test(name)) return null;
      return { file: name, hash: u.hash || "" };
    } catch (e) {
      return null;
    }
  }

  /**
   * 导航：from / fromLabel / ret 写在目标 URL 上（不依赖 sessionStorage，
   * 兼容 file:// 与 iframe 换 src）。
   * 首页 → staff?from=02-home&fromLabel=首页
   * 工作台 → staff?from=05-workbench&fromLabel=工作台
   * 我的 → staff?from=06-mine&fromLabel=我的
   */
  function navigateProto(file, hash, opts) {
    opts = opts || {};
    var cur = currentFile();
    var action = opts.action || "push";
    var qs = new URLSearchParams();
    if (isEmbed()) qs.set("embed", "1");

    if (action === "back") {
      var sp = new URLSearchParams(location.search);
      var from = sp.get("from") || opts.fallback || "06-mine.html";
      var fromLabel = sp.get("fromLabel") || "";
      var ret = sp.get("ret") || "";
      file = from;
      hash = hash || "";
      qs = new URLSearchParams();
      if (isEmbed()) qs.set("embed", "1");
      if (ret) {
        var nested = new URLSearchParams(ret);
        nested.forEach(function (v, k) {
          qs.set(k, v);
        });
      }
      // tab 页不带 from
      if (TAB_FILES[file]) {
        qs = new URLSearchParams();
        if (isEmbed()) qs.set("embed", "1");
      }
    } else if (TAB_FILES[file]) {
      // Tab 切换：清空返回链
      action = "replace";
    } else if (cur && cur !== file) {
      qs.set("from", cur);
      qs.set(
        "fromLabel",
        PAGE_TITLE[cur] || opts.fromLabel || "",
      );
      var chain = currentReturnChain();
      if (chain) qs.set("ret", chain);
    }

    if (!file) return;

    var query = qs.toString();
    var dest = file + (query ? "?" + query : "") + (hash || "");

    if (embed && window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: "proto-nav",
          file: file,
          hash: hash || "",
          query: query,
          action: action,
          title: PAGE_TITLE[file] || "",
        },
        "*",
      );
      return;
    }

    location.href = dest;
  }

  window.__protoNav = navigateProto;
  window.__protoPageTitle = PAGE_TITLE;

  // 返回按钮：优先读 URL ?from=&fromLabel=
  function applyBackChrome() {
    var sp = new URLSearchParams(location.search);
    var from = sp.get("from");
    var fromLabel = sp.get("fromLabel");
    $$("[data-back]").forEach(function (a) {
      var fallback =
        a.getAttribute("data-back-fallback") ||
        a.getAttribute("href") ||
        "06-mine.html";
      var fallbackLabel =
        a.getAttribute("data-back-fallback-label") ||
        PAGE_TITLE[fallback] ||
        "";
      var file = from || fallback;
      var label = fromLabel || PAGE_TITLE[file] || fallbackLabel || "";
      a.setAttribute("href", file);
      var lab = a.querySelector("[data-back-label]");
      if (lab) lab.textContent = label;
    });
  }
  applyBackChrome();

  document.addEventListener(
    "click",
    function (e) {
      var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
      if (!a) return;
      // 中央录音钮不是导航目标
      if (a.classList.contains("record-btn") || a.closest(".record-btn")) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (a.hasAttribute("data-back")) {
        e.preventDefault();
        navigateProto("", "", {
          action: "back",
          fallback:
            a.getAttribute("data-back-fallback") ||
            a.getAttribute("href") ||
            "06-mine.html",
        });
        return;
      }

      var raw = a.getAttribute("href") || "";
      var parsed = protoFileFromHref(raw);
      if (!parsed) {
        if (embed && (/00-index\.html/i.test(raw) || raw === "#" || raw === "")) {
          e.preventDefault();
        }
        return;
      }
      e.preventDefault();
      navigateProto(parsed.file, parsed.hash, { action: "push" });
    },
    true,
  );

  // 日/周/月 segmented
  $$("[data-period-seg]").forEach(function (seg) {
    var buttons = $$("button", seg);
    var panels = $$("[data-period-panel]");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) {
          b.classList.toggle("on", b === btn);
        });
        var p = btn.getAttribute("data-period");
        panels.forEach(function (panel) {
          panel.classList.toggle(
            "hidden",
            panel.getAttribute("data-period-panel") !== p,
          );
        });
      });
    });
  });

  // 看板模式
  $$("[data-mode-seg]").forEach(function (seg) {
    var buttons = $$("button", seg);
    var panels = $$("[data-mode-panel]");
    var chip = $("[data-project-chip]");
    var hint = $("[data-progress-hint]");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) {
          b.classList.toggle("on", b === btn);
        });
        var m = btn.getAttribute("data-mode");
        panels.forEach(function (panel) {
          panel.classList.toggle(
            "hidden",
            panel.getAttribute("data-mode-panel") !== m,
          );
        });
        if (chip) chip.classList.toggle("hidden", m === "progress");
        if (hint) hint.classList.toggle("hidden", m !== "progress");
        if (m === "columns" && typeof window.__protoColsGo === "function") {
          requestAnimationFrame(function () {
            window.__protoColsGo(window.__protoColsIdx || 0, false);
          });
        }
      });
    });
  });

  // 名册筛选
  $$("[data-filter-seg]").forEach(function (seg) {
    var buttons = $$("button", seg);
    var cards = $$("[data-staff-card]");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) {
          b.classList.toggle("on", b === btn);
        });
        var f = btn.getAttribute("data-filter");
        cards.forEach(function (card) {
          var tags = (card.getAttribute("data-tags") || "").split(/\s+/);
          var show = f === "all" || tags.indexOf(f) >= 0;
          card.classList.toggle("hidden", !show);
        });
      });
    });
  });

  // 档案 Tab
  $$("[data-profile-tabs]").forEach(function (bar) {
    var buttons = $$("button", bar);
    var panels = $$("[data-profile-panel]");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) {
          b.classList.toggle("on", b === btn);
        });
        var t = btn.getAttribute("data-tab");
        panels.forEach(function (panel) {
          panel.classList.toggle(
            "hidden",
            panel.getAttribute("data-profile-panel") !== t,
          );
        });
      });
    });
  });

  if (location.hash === "#default") {
    var note = $("[data-picker-intent]");
    var title = $("#picker-title");
    if (note) note.textContent = "选中后写回秘书设置的默认员工";
    if (title) title.textContent = "设为默认员工";
  }

  var scrim = $("#voice-scrim");
  var overlay = $("#voice-overlay");
  var toast = $("#proto-toast");
  var holdTimer = null;
  var holding = false;
  var recording = false;

  // 中央麦：短按 Sheet / 长按 Overlay（对齐 RecordButton，不 push 路由）
  function ensureVoiceChrome() {
    var host =
      document.querySelector(".screen") ||
      document.querySelector(".phone") ||
      document.body;
    if (!host) return;

    if (!$("#voice-scrim")) {
      var wrap = document.createElement("div");
      wrap.innerHTML =
        '<div class="scrim" id="voice-scrim">' +
        '<div class="sheet" data-voice-sheet>' +
        '<div class="grabber"></div>' +
        '<div style="font-size:13px;font-weight:600;text-align:center;margin-bottom:14px">选择语音方式</div>' +
        '<div style="display:flex;gap:10px;margin-bottom:14px">' +
        '<a href="13-voice-record.html" style="flex:1;background:#F7F8FC;border:1px solid var(--border);border-radius:16px;padding:16px 8px;text-align:center;text-decoration:none;color:inherit">' +
        '<div style="width:48px;height:48px;border-radius:16px;background:rgba(59,111,255,.12);color:var(--brand-hex);display:flex;align-items:center;justify-content:center;margin:0 auto 8px"><svg class="ic" style="width:22px;height:22px" viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg></div>' +
        '<div style="font-size:14px;font-weight:700">录音</div><div style="font-size:10px;color:var(--muted-fg);margin-top:2px">边录边转写</div>' +
        '<div style="font-size:9px;color:var(--muted-fg);background:var(--secondary);display:inline-block;margin-top:6px;padding:2px 6px;border-radius:4px">原型</div></a>' +
        '<a href="14-voice-translate.html" style="flex:1;background:#F7F8FC;border:1px solid var(--border);border-radius:16px;padding:16px 8px;text-align:center;text-decoration:none;color:inherit">' +
        '<div style="width:48px;height:48px;border-radius:16px;background:rgba(13,148,136,.12);color:var(--teal);display:flex;align-items:center;justify-content:center;margin:0 auto 8px"><svg class="ic" style="width:22px;height:22px" viewBox="0 0 24 24"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg></div>' +
        '<div style="font-size:14px;font-weight:700">翻译</div><div style="font-size:10px;color:var(--muted-fg);margin-top:2px">实时双语</div>' +
        '<div style="font-size:9px;color:var(--muted-fg);background:var(--secondary);display:inline-block;margin-top:6px;padding:2px 6px;border-radius:4px">原型</div></a>' +
        '<a href="12-voice-talk.html" style="flex:1;background:#F7F8FC;border:1px solid var(--border);border-radius:16px;padding:16px 8px;text-align:center;text-decoration:none;color:inherit">' +
        '<div style="width:48px;height:48px;border-radius:16px;background:rgba(245,158,11,.14);color:var(--priority);display:flex;align-items:center;justify-content:center;margin:0 auto 8px"><svg class="ic" style="width:22px;height:22px" viewBox="0 0 24 24"><path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/></svg></div>' +
        '<div style="font-size:14px;font-weight:700">发语音</div><div style="font-size:10px;color:var(--muted-fg);margin-top:2px">即时下达</div></a>' +
        "</div>" +
        '<button type="button" data-close-sheet style="width:100%;height:48px;border:none;border-radius:12px;background:var(--secondary);font-size:15px;font-weight:600;cursor:pointer">取消</button>' +
        "</div></div>";
      while (wrap.firstChild) host.appendChild(wrap.firstChild);
    }

    if (!$("#proto-toast")) {
      var t = document.createElement("div");
      t.className = "toast";
      t.id = "proto-toast";
      t.textContent = "原型示例 · 当前不会发送到对话";
      host.appendChild(t);
    }

    if (!$("#voice-overlay")) {
      var ov = document.createElement("div");
      ov.id = "voice-overlay";
      ov.className = "overlay-panel";
      ov.setAttribute(
        "style",
        "position:absolute;left:0;right:0;bottom:0;height:48%;min-height:320px;border-radius:28px 28px 0 0;background:rgba(28,36,64,.78);color:#fff;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;z-index:45;padding-bottom:40px",
      );
      ov.innerHTML =
        '<div style="font-size:15px;font-weight:500">正在说话（原型演示）</div>' +
        '<div style="font-size:13px;opacity:.62">手指上滑可取消</div>' +
        '<div style="width:84px;height:84px;border-radius:42px;background:rgba(255,255,255,.14);border:2px solid rgba(255,255,255,.55);display:flex;align-items:center;justify-content:center">' +
        '<svg class="ic" style="width:28px;height:28px;color:#fff" viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg></div>' +
        '<div style="font-size:15px;opacity:.92">松开结束</div>';
      host.appendChild(ov);
      if (!$("#proto-overlay-style")) {
        var st = document.createElement("style");
        st.id = "proto-overlay-style";
        st.textContent = ".overlay-panel.show{display:flex!important}";
        document.head.appendChild(st);
      }
    }

    scrim = $("#voice-scrim");
    overlay = $("#voice-overlay");
    toast = $("#proto-toast");
  }

  ensureVoiceChrome();

  // 把误写成跳转 04-voice 的中央钮改回按钮行为
  $$(".record-btn").forEach(function (btn) {
    if (btn.tagName === "A") {
      btn.removeAttribute("href");
      btn.setAttribute("role", "button");
      btn.style.cursor = "pointer";
    }
    if (!btn.id) btn.id = "record-btn";
  });

  var recordBtn = $("#record-btn") || $(".record-btn");

  function openSheet() {
    ensureVoiceChrome();
    if (scrim) scrim.classList.add("show");
  }
  function closeSheet() {
    if (scrim) scrim.classList.remove("show");
  }
  function openOverlay() {
    ensureVoiceChrome();
    recording = true;
    $$(".record-btn").forEach(function (b) {
      b.classList.add("recording");
    });
    if (overlay) overlay.classList.add("show");
    closeSheet();
  }
  function closeOverlay(cancelled) {
    recording = false;
    $$(".record-btn").forEach(function (b) {
      b.classList.remove("recording");
    });
    if (overlay) overlay.classList.remove("show");
    if (!cancelled && toast) {
      toast.classList.add("show");
      setTimeout(function () {
        toast.classList.remove("show");
      }, 2200);
    }
  }

  window.openSheet = openSheet;
  window.closeSheet = closeSheet;

  function wireRecordButton(btn) {
    if (!btn || btn.getAttribute("data-voice-wired")) return;
    btn.setAttribute("data-voice-wired", "1");
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
    });
    btn.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      e.stopPropagation();
      holding = true;
      holdTimer = setTimeout(function () {
        if (holding) openOverlay();
      }, 2000);
    });
    function endHold(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (!holding) return;
      holding = false;
      clearTimeout(holdTimer);
      if (recording) {
        var cancel = overlay && overlay.classList.contains("cancel");
        closeOverlay(cancel);
        if (overlay) overlay.classList.remove("cancel");
      } else {
        openSheet();
      }
    }
    btn.addEventListener("pointerup", endHold);
    btn.addEventListener("pointercancel", endHold);
    btn.addEventListener("pointerleave", function () {
      if (!recording) {
        holding = false;
        clearTimeout(holdTimer);
      }
    });
  }

  $$(".record-btn").forEach(wireRecordButton);

  // 拦截中央麦误链到 04-voice.html（capture，早于 proto-nav）
  document.addEventListener(
    "click",
    function (e) {
      var a = e.target && e.target.closest ? e.target.closest("a.record-btn, .record-btn") : null;
      if (!a) return;
      if (a.classList.contains("record-btn")) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  );

  if (scrim) {
    scrim.addEventListener("click", function (e) {
      if (e.target === scrim) closeSheet();
    });
  }
  var sheetEl = $("[data-voice-sheet]") || (scrim && scrim.querySelector(".sheet"));
  if (sheetEl) {
    sheetEl.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  }

  $$("[data-close-sheet]").forEach(function (el) {
    el.addEventListener("click", closeSheet);
  });
  // 动态注入的关闭钮：事件委托
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-close-sheet]") : null;
    if (t) {
      e.preventDefault();
      closeSheet();
    }
  });

  $$("[data-rail-agent]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      $$("[data-rail-agent]").forEach(function (a) {
        a.classList.toggle("sel", a === el);
      });
      var name = el.getAttribute("data-name") || "";
      var titleEl = $("[data-chat-agent]");
      if (titleEl) titleEl.textContent = name;
    });
  });

  // 按状态：transform 轮播 + 拖拽 / 底栏左右 / dots（对齐 column-board）
  var colViewport = $("[data-col-viewport]");
  var colTrack = $("[data-col-track]");
  var colPages = $$("[data-col-page]");
  var colDots = $$("[data-col-dot]");
  var colIdx = 0;
  var dragX = 0;
  var startX = 0;
  var dragging = false;

  function colLabels() {
    return colPages.map(function (p) {
      return p.getAttribute("data-name") || "";
    });
  }

  function pageStep() {
    if (!colViewport || !colPages.length) return 0;
    var w = colViewport.clientWidth;
    if (!w) return 0;
    // 右侧留 22px peek：每页略窄于 viewport
    var step = Math.max(1, w - 22);
    colPages.forEach(function (p) {
      p.style.flex = "0 0 " + step + "px";
      p.style.width = step + "px";
      p.style.boxSizing = "border-box";
      p.style.paddingLeft = "14px";
      p.style.paddingRight = "8px";
    });
    return step;
  }

  function updateColChrome(i) {
    colIdx = Math.max(0, Math.min(i, colPages.length - 1));
    window.__protoColsIdx = colIdx;
    colDots.forEach(function (d, idx) {
      d.classList.toggle("on", idx === colIdx);
    });
    var labels = colLabels();
    var meta = $("[data-col-label]");
    if (meta) {
      meta.textContent =
        (labels[colIdx] || "") + " · " + (colIdx + 1) + "/" + colPages.length;
    }
    var prevLab = $("[data-col-prev-label]");
    var nextLab = $("[data-col-next-label]");
    var prevBtn = $("[data-col-prev]");
    var nextBtn = $("[data-col-next]");
    if (prevLab) prevLab.textContent = colIdx > 0 ? labels[colIdx - 1] : "";
    if (nextLab)
      nextLab.textContent =
        colIdx < colPages.length - 1 ? labels[colIdx + 1] : "";
    if (prevBtn) {
      prevBtn.style.opacity = colIdx > 0 ? "1" : "0.28";
      prevBtn.disabled = colIdx <= 0;
    }
    if (nextBtn) {
      nextBtn.style.opacity = colIdx < colPages.length - 1 ? "1" : "0.28";
      nextBtn.disabled = colIdx >= colPages.length - 1;
    }
    var hint = $("[data-col-hint]");
    if (hint && colIdx > 0) hint.classList.add("hidden");
  }

  function applyColTransform(offsetPx, withTransition) {
    if (!colTrack) return;
    if (withTransition === false) colTrack.classList.add("dragging");
    else colTrack.classList.remove("dragging");
    colTrack.style.transform = "translate3d(" + offsetPx + "px,0,0)";
  }

  function goCol(i, smooth, retries) {
    if (!colTrack || !colPages.length) return;
    colIdx = Math.max(0, Math.min(i, colPages.length - 1));
    var step = pageStep();
    if (!step) {
      if ((retries || 0) < 12) {
        requestAnimationFrame(function () {
          goCol(colIdx, smooth, (retries || 0) + 1);
        });
      }
      return;
    }
    applyColTransform(-colIdx * step, smooth !== false);
    updateColChrome(colIdx);
  }

  window.__protoColsGo = goCol;
  window.__protoColsIdx = 0;

  if (colViewport && colTrack && colPages.length) {
    colPages.forEach(function (p) {
      p.classList.remove("hidden");
    });
    updateColChrome(0);
    applyColTransform(0, false);

    $$("[data-col-prev]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        goCol(colIdx - 1);
      });
    });
    $$("[data-col-next]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        goCol(colIdx + 1);
      });
    });
    colDots.forEach(function (d, idx) {
      d.addEventListener("click", function (e) {
        e.preventDefault();
        goCol(idx);
      });
    });

    var swiped = false;
    colViewport.addEventListener("pointerdown", function (e) {
      if (e.button != null && e.button !== 0) return;
      dragging = true;
      swiped = false;
      startX = e.clientX;
      dragX = 0;
      colTrack.classList.add("dragging");
      try {
        colViewport.setPointerCapture(e.pointerId);
      } catch (err) {}
    });
    colViewport.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      dragX = e.clientX - startX;
      if (Math.abs(dragX) > 10) swiped = true;
      var step = pageStep();
      applyColTransform(-colIdx * step + dragX, false);
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      colTrack.classList.remove("dragging");
      if (dragX < -48) goCol(colIdx + 1);
      else if (dragX > 48) goCol(colIdx - 1);
      else goCol(colIdx);
      dragX = 0;
    }
    colViewport.addEventListener("pointerup", endDrag);
    colViewport.addEventListener("pointercancel", endDrag);
    colViewport.addEventListener(
      "click",
      function (e) {
        if (swiped) {
          e.preventDefault();
          e.stopPropagation();
          swiped = false;
        }
      },
      true,
    );

    window.addEventListener("resize", function () {
      goCol(colIdx, false);
    });
  }

  $$("[data-pro-upsell]").forEach(function (el) {
    el.addEventListener("click", function () {
      alert(
        "专业版即将开放\n\n专业版将解锁更多数字员工席位、高级报表与审计能力。当前为展示入口，不产生扣费。",
      );
    });
  });
})();
