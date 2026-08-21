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
    "04-voice.html": "Context",
    "05-workbench.html": "工作台",
    "06-mine.html": "我的",
    "07-staff-roster.html": "数字员工",
    "08-staff-profile.html": "员工档案",
    "09-staff-picker.html": "指派",
    "10-assistant-settings.html": "助理与自动化",
    "11-brief-detail.html": "简报",
    "12-voice-talk.html": "即时下达",
    "13-voice-record.html": "录音捕捉",
    "14-voice-translate.html": "翻译",
    "15-inbox.html": "待我处理",
    "16-projects.html": "项目",
    "17-settings.html": "设置",
    "18-briefs.html": "新闻简报",
    "19-recordings.html": "录音",
    "20-skills.html": "技能",
    "21-sop.html": "SOP",
    "22-knowledge.html": "知识库",
    "23-runtime.html": "Runtime",
    "24-handover.html": "交接与审计",
    "25-squads.html": "切换小队",
    "26-watch-topics.html": "关注类别",
    "27-onboarding.html": "启动设置",
    "28-industry-brief.html": "行业与简报",
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
      return { file: name, hash: u.hash || "", search: u.search || "" };
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
    // 保留来源链接上的业务参数（如 issue=）
    if (opts.extraSearch) {
      var extra = new URLSearchParams(
        opts.extraSearch.charAt(0) === "?"
          ? opts.extraSearch.slice(1)
          : opts.extraSearch,
      );
      extra.forEach(function (v, k) {
        if (k !== "embed" && k !== "from" && k !== "fromLabel" && k !== "ret") {
          qs.set(k, v);
        }
      });
    }

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
      // Tab 切换：清空返回链，但保留业务 query（issue 等）
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
  /** 子页脚本跳转（兼容 embed / from 链） */
  window.__protoGo = function (file, search, hash) {
    navigateProto(file, hash || "", {
      action: "push",
      extraSearch: search || "",
    });
  };

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
      if (parsed.file === "13-voice-record.html") {
        if (sessionStorage.getItem("proto-mic") !== "1") {
          if (!window.confirm("Utter Office 需要麦克风来录制会议。允许吗？")) {
            return;
          }
          sessionStorage.setItem("proto-mic", "1");
        }
      }
      navigateProto(parsed.file, parsed.hash, {
        action: "push",
        extraSearch: parsed.search || "",
      });
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
        if (chip) chip.classList.toggle("hidden", m === "progress" || m === "overview");
        if (hint) hint.classList.toggle("hidden", m !== "columns" && m !== "status");
        if ((m === "columns" || m === "status") && typeof window.__protoColsGo === "function") {
          requestAnimationFrame(function () {
            window.__protoColsGo(window.__protoColsIdx || 0, false);
          });
        }
      });
    });
  });

  // ========== ISSUE_DB：原型 mock 状态机（一期流程闭环）==========
  var STATUS_META = {
    queued: { label: "排队", chip: "queued", panel: "doing" },
    claimed: { label: "已认领", chip: "claimed", panel: "doing" },
    running: { label: "小队在跑", chip: "running", panel: "doing" },
    blocked: { label: "阻塞", chip: "blocked", panel: "doing" },
    review: { label: "待验收", chip: "review", panel: "review" },
    todo: { label: "待接活", chip: "queued", panel: "todo" },
    done: { label: "完成", chip: "done", panel: "done" },
  };

  var SQUAD_PRESETS = {
    squad: {
      name: "产品小队",
      assignees: ["Alex", "mika", "kai"],
      step: "产品小队执行中",
    },
    "squad-customer": {
      name: "客户跟进小队",
      assignees: ["nova", "Alex"],
      step: "客户跟进小队执行中",
    },
  };

  var PHASE_HINTS = {
    todo: "",
    doing: "",
    review: "",
  };

  var ISSUE_SEED = {
    "UO-09": {
      id: "UO-09",
      title: "选择发布窗口方案",
      status: "review",
      assignees: ["kai"],
      progress: 90,
      tools: 4,
      duration: "交付就绪",
      step: "等人拍板 A/B/C 三方案",
      blockReason: "",
      lifecycle: [
        { when: "昨天", what: "Enqueue", detail: "洞察建议生成", dot: "ok" },
        { when: "昨天", what: "Claim", detail: "kai 认领分析", dot: "ok" },
        { when: "今天", what: "Start", detail: "产出三方案对照", dot: "ok" },
        { when: "今天", what: "Review", detail: "等你选窗口", dot: "warn" },
        { when: "—", what: "Complete", detail: "拍板后关闭", dot: "muted" },
      ],
      stepsHtml:
        '<div class="dim"># analysis done</div><div class="ok">✓ 方案 A 本周</div><div class="ok">✓ 方案 B 下周</div><div class="ok">✓ 方案 C 延后</div><div class="dim">… awaiting decision</div>',
      deliverables: [
        { name: "方案对照表", desc: "A/B/C 风险与成本" },
      ],
    },
    "UO-12": {
      id: "UO-12",
      title: "补全验收口径后继续",
      status: "blocked",
      assignees: ["mika"],
      progress: 55,
      tools: 6,
      duration: "等待 18m",
      step: "等人补充「是否保留 409」",
      blockReason: "缺「错误码是否保留 409」——需你补充后继续",
      lifecycle: [
        { when: "今天 13:40", what: "Enqueue", detail: "鉴权重构子任务", dot: "ok" },
        { when: "13:41", what: "Claim", detail: "mika 认领", dot: "ok" },
        { when: "13:50", what: "Blocked", detail: "缺验收口径", dot: "warn" },
        { when: "—", what: "Resume", detail: "补充后继续", dot: "muted" },
      ],
      stepsHtml:
        '<div class="dim"># blocked · waiting human</div><div class="run">? 409 是否保留</div><div class="dim">… paused</div>',
      deliverables: [],
    },
    "UO-18": {
      id: "UO-18",
      title: "鉴权重构 PR 待验收",
      status: "review",
      assignees: ["mika", "Alex"],
      squad: "产品小队",
      progress: 92,
      tools: 10,
      duration: "7m 17s",
      step: "等人验收 PR #43",
      blockReason: "",
      lifecycle: [
        { when: "今天 14:02", what: "Enqueue", detail: "Alex 创建并指派 mika", dot: "ok" },
        { when: "14:02", what: "Claim", detail: "mika 自动认领", dot: "ok" },
        { when: "14:03–14:11", what: "Start", detail: "14 handlers · 8 tool calls", dot: "ok" },
        { when: "14:12", what: "Review", detail: "PR #43 就绪", dot: "warn" },
        { when: "—", what: "Complete", detail: "验收通过后关闭", dot: "muted" },
      ],
      stepsHtml:
        '<div class="dim"># agent working · 7m 17s · 10 tool calls</div><div class="run">→ Read handler/issue.go</div><div class="ok">✓ 统一 writeError() 3 处</div><div class="run">→ Read handler/comment.go</div><div class="ok">✓ 迁移评论错误响应</div><div class="run">→ Bash go test</div><div class="ok">✓ ok 0.847s</div><div class="dim">… awaiting human review</div>',
      deliverables: [
        { name: "PR #43", desc: "鉴权重构 · 错误码统一" },
        { name: "测试报告", desc: "TestErrorResponses 通过" },
      ],
    },
    "UO-21": {
      id: "UO-21",
      title: "客户纪要：下周试点范围",
      status: "done",
      assignees: ["nova"],
      progress: 100,
      tools: 3,
      duration: "已交付",
      step: "纪要已整理可拿走",
      blockReason: "",
      lifecycle: [
        { when: "今天上午", what: "Enqueue", detail: "会议录音进队", dot: "ok" },
        { when: "上午", what: "Complete", detail: "纪要交付", dot: "ok" },
      ],
      stepsHtml: '<div class="ok">✓ 纪要已生成</div>',
      deliverables: [{ name: "试点范围纪要", desc: "口头拍板落清单" }],
    },
    "UO-24": {
      id: "UO-24",
      title: "迁移评论 handler 错误响应",
      status: "running",
      assignees: ["mika"],
      progress: 72,
      tools: 8,
      duration: "6m 17s",
      step: "校验 TestErrorResponses",
      blockReason: "",
      lifecycle: [
        { when: "今天 15:01", what: "Enqueue", detail: "从 UO-18 拆出", dot: "ok" },
        { when: "15:01", what: "Claim", detail: "mika", dot: "ok" },
        { when: "15:02", what: "Start", detail: "迁移中", dot: "ok" },
        { when: "—", what: "Review", detail: "自检后提交", dot: "muted" },
      ],
      stepsHtml:
        '<div class="dim"># running · 6m · 8 tools</div><div class="run">→ 迁移 comment handler</div><div class="run">→ 跑单测…</div>',
      deliverables: [],
    },
    "UO-27": {
      id: "UO-27",
      title: "整理本周客户跟进清单",
      status: "claimed",
      assignees: ["nova"],
      progress: 18,
      tools: 1,
      duration: "刚认领",
      step: "写入 SOP「客户跟进」节点",
      blockReason: "",
      lifecycle: [
        { when: "刚刚", what: "Enqueue", detail: "待办落地", dot: "ok" },
        { when: "刚刚", what: "Claim", detail: "nova 认领", dot: "ok" },
        { when: "—", what: "Start", detail: "待开始", dot: "muted" },
      ],
      stepsHtml: '<div class="dim"># claimed · writing SOP node</div>',
      deliverables: [],
    },
    "UO-30": {
      id: "UO-30",
      title: "联调 Staging 部署检查",
      status: "queued",
      assignees: ["Alex"],
      progress: 8,
      tools: 0,
      duration: "排队",
      step: "等 Runtime 空闲",
      blockReason: "",
      lifecycle: [
        { when: "今天", what: "Enqueue", detail: "Alex 自建", dot: "ok" },
        { when: "—", what: "Claim", detail: "待认领执行", dot: "muted" },
      ],
      stepsHtml: '<div class="dim"># queued</div>',
      deliverables: [],
    },
    "UO-31": {
      id: "UO-31",
      title: "同步知识库「计费口径」",
      status: "queued",
      assignees: ["kai"],
      progress: 5,
      tools: 0,
      duration: "排队",
      step: "待 Runtime",
      blockReason: "",
      lifecycle: [{ when: "今天", what: "Enqueue", detail: "知识同步", dot: "ok" }],
      stepsHtml: '<div class="dim"># queued</div>',
      deliverables: [],
    },
    "UO-28": {
      id: "UO-28",
      title: "写迁移 skill 草案",
      status: "running",
      assignees: ["kai"],
      progress: 40,
      tools: 5,
      duration: "执行中",
      step: "起草 SKILL.md",
      blockReason: "",
      lifecycle: [
        { when: "今天", what: "Start", detail: "kai 执行", dot: "ok" },
      ],
      stepsHtml: '<div class="run">→ drafting skill</div>',
      deliverables: [],
    },
    "UO-19": {
      id: "UO-19",
      title: "等待设计确认文案",
      status: "blocked",
      assignees: ["nova"],
      progress: 30,
      tools: 2,
      duration: "阻塞",
      step: "等人确认文案",
      blockReason: "设计文案未确认",
      lifecycle: [{ when: "昨天", what: "Blocked", detail: "等人", dot: "warn" }],
      stepsHtml: '<div class="dim"># blocked</div>',
      deliverables: [],
    },
    "UO-15": {
      id: "UO-15",
      title: "错误响应单测补齐",
      status: "done",
      assignees: ["mika"],
      progress: 100,
      tools: 4,
      duration: "已完成",
      step: "已交付",
      blockReason: "",
      lifecycle: [{ when: "今天", what: "Complete", detail: "单测通过", dot: "ok" }],
      stepsHtml: '<div class="ok">✓ done</div>',
      deliverables: [{ name: "单测报告", desc: "错误响应覆盖" }],
    },
    "UO-11": {
      id: "UO-11",
      title: "Runtime 用量周报",
      status: "done",
      assignees: ["kai"],
      progress: 100,
      tools: 2,
      duration: "已完成",
      step: "已交付",
      blockReason: "",
      lifecycle: [{ when: "今天", what: "Complete", detail: "周报", dot: "ok" }],
      stepsHtml: '<div class="ok">✓ done</div>',
      deliverables: [{ name: "周报", desc: "Runtime 用量" }],
    },
    "UO-32": {
      id: "UO-32",
      title: "把试点名单落成事项并跟踪",
      status: "todo",
      assignees: [],
      progress: 0,
      tools: 0,
      duration: "待接活",
      step: "建议指派 nova",
      blockReason: "",
      lifecycle: [{ when: "刚刚", what: "Enqueue", detail: "来自洞察·待办落地", dot: "ok" }],
      stepsHtml: '<div class="dim"># awaiting assign</div>',
      deliverables: [],
    },
    "UO-33": {
      id: "UO-33",
      title: "竞品小队模板对照一页纸",
      status: "todo",
      assignees: [],
      progress: 0,
      tools: 0,
      duration: "待接活",
      step: "建议 kai + 产品小队",
      blockReason: "",
      lifecycle: [{ when: "刚刚", what: "Enqueue", detail: "来自洞察·商机", dot: "ok" }],
      stepsHtml: '<div class="dim"># awaiting assign</div>',
      deliverables: [],
    },
    "UO-34": {
      id: "UO-34",
      title: "Runtime 错峰 / 扩容避免挤兑",
      status: "todo",
      assignees: [],
      progress: 0,
      tools: 0,
      duration: "待接活",
      step: "建议运维席位",
      blockReason: "",
      lifecycle: [{ when: "刚刚", what: "Enqueue", detail: "来自洞察·风险", dot: "ok" }],
      stepsHtml: '<div class="dim"># awaiting assign</div>',
      deliverables: [],
    },
    "UO-35": {
      id: "UO-35",
      title: "对齐零信任内控口径",
      status: "todo",
      assignees: [],
      progress: 0,
      tools: 0,
      duration: "待接活",
      step: "建议产品小队",
      blockReason: "",
      lifecycle: [{ when: "刚刚", what: "Enqueue", detail: "来自洞察·对齐", dot: "ok" }],
      stepsHtml: '<div class="dim"># awaiting assign</div>',
      deliverables: [],
    },
  };

  var AVATAR_COLOR = {
    mika: "#F87171",
    nova: "#34D399",
    kai: "#A78BFA",
    Alex: "#60A5FA",
    tina: "#FBBF24",
  };

  function issueStoreKey() {
    return "proto-issue-db-v2";
  }

  function cloneIssueDb(src) {
    return JSON.parse(JSON.stringify(src));
  }

  function loadIssueDb() {
    try {
      var raw = sessionStorage.getItem(issueStoreKey());
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return cloneIssueDb(ISSUE_SEED);
  }

  function saveIssueDb(db) {
    try {
      sessionStorage.setItem(issueStoreKey(), JSON.stringify(db));
    } catch (e) {}
  }

  var ISSUE_DB = loadIssueDb();

  function getIssue(id) {
    return ISSUE_DB[id] || null;
  }

  function updateIssue(id, patch) {
    if (!ISSUE_DB[id]) return null;
    Object.keys(patch).forEach(function (k) {
      ISSUE_DB[id][k] = patch[k];
    });
    saveIssueDb(ISSUE_DB);
    return ISSUE_DB[id];
  }

  function addIssue(issue) {
    ISSUE_DB[issue.id] = issue;
    saveIssueDb(ISSUE_DB);
    return issue;
  }

  function protoToast(msg) {
    var t = $("#proto-toast");
    if (!t) {
      var host =
        document.querySelector(".screen") ||
        document.querySelector(".phone") ||
        document.body;
      t = document.createElement("div");
      t.className = "toast";
      t.id = "proto-toast";
      t.setAttribute(
        "style",
        "position:absolute;left:50%;bottom:calc(var(--safe-bottom) + 72px);transform:translateX(-50%);background:rgba(28,36,64,.92);color:#fff;font-size:12px;padding:10px 16px;border-radius:20px;z-index:60;white-space:nowrap;display:none",
      );
      host.appendChild(t);
    }
    t.textContent = msg;
    t.style.display = "block";
    t.classList.add("show");
    setTimeout(function () {
      t.classList.remove("show");
      t.style.display = "none";
    }, 2200);
  }

  function statusChipHtml(status) {
    var m = STATUS_META[status] || STATUS_META.queued;
    return '<span class="life-chip ' + m.chip + '">' + m.label + "</span>";
  }

  function panelForStatus(status) {
    var m = STATUS_META[status];
    return (m && m.panel) || "todo";
  }

  function assigneesHtml(list, squadName) {
    list = list || [];
    if (!list.length) {
      return '<span style="font-size:11px;color:var(--muted-fg)">未指派 · 待小队接活</span>';
    }
    var stack =
      '<div class="squad-stack">' +
      list
        .map(function (n) {
          var c = AVATAR_COLOR[n] || "#64748B";
          var letter = n.charAt(0);
          return '<span class="av" style="background:' + c + '">' + letter + "</span>";
        })
        .join("") +
      "</div>";
    var label = squadName
      ? '<span class="squad-tag" style="margin-left:8px">' + squadName + "</span>"
      : '<span style="margin-left:8px;font-size:12px;font-weight:700">' +
        list.join(" · ") +
        "</span>";
    return (
      '<div style="display:flex;align-items:center;flex-wrap:wrap">' +
      stack +
      label +
      "</div>"
    );
  }

  function firstTodoIssueId() {
    var prefer = ["UO-33", "UO-32", "UO-34", "UO-35"];
    var i;
    for (i = 0; i < prefer.length; i++) {
      var iss = ISSUE_DB[prefer[i]];
      if (iss && panelForStatus(iss.status) === "todo") return prefer[i];
    }
    var ids = Object.keys(ISSUE_DB);
    for (i = 0; i < ids.length; i++) {
      if (panelForStatus(ISSUE_DB[ids[i]].status) === "todo") return ids[i];
    }
    return "UO-33";
  }

  function resolveAssign(assignTo) {
    if (SQUAD_PRESETS[assignTo]) {
      var p = SQUAD_PRESETS[assignTo];
      return {
        team: true,
        assignees: p.assignees.slice(),
        squad: p.name,
        step: p.step,
        toast: "「" + p.name + "」已接",
      };
    }
    return {
      team: false,
      assignees: [assignTo],
      squad: "",
      step: assignTo + " 执行中",
      toast: "已指派 " + assignTo,
    };
  }

  function renderLifecycle(list) {
    return (list || [])
      .map(function (n) {
        return (
          '<div class="node"><div class="dot ' +
          (n.dot || "muted") +
          '"></div><div class="body"><div class="when">' +
          n.when +
          '</div><div class="what">' +
          n.what +
          '</div><div class="detail">' +
          n.detail +
          "</div></div></div>"
        );
      })
      .join("");
  }

  function renderDeliverables(list) {
    if (!list || !list.length) {
      return '<div class="row"><span style="color:var(--muted-fg)">暂无交付物</span></div>';
    }
    return list
      .map(function (d) {
        return (
          '<div class="row"><span style="font-weight:700">' +
          d.name +
          '</span><span style="color:var(--muted-fg);flex:1">' +
          d.desc +
          '</span><span style="color:var(--brand-hex);font-weight:700;font-size:12px">打开</span></div>'
        );
      })
      .join("");
  }

  var currentDetailId = null;

  function showWorkbenchDetail(show) {
    var board = $("[data-wb-board]");
    var detail = $("[data-wb-detail]");
    if (!board || !detail) return;
    board.classList.toggle("hidden", !!show);
    detail.classList.toggle("hidden", !show);
  }
  window.__protoWbDetail = showWorkbenchDetail;

  function setWbTab(tab) {
    var buttons = $$("[data-wb-seg] button");
    var panels = $$("[data-wb-panel]");
    buttons.forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-wb") === tab);
    });
    panels.forEach(function (p) {
      p.classList.toggle("hidden", p.getAttribute("data-wb-panel") !== tab);
    });
    var hint = $("[data-wb-phase-hint]");
    if (hint && PHASE_HINTS[tab]) hint.innerHTML = PHASE_HINTS[tab];
  }

  function cardHtml(issue) {
    var as = issue.assignees || [];
    var isTeam = !!(issue.squad || as.length > 1);
    var isOpen = !as.length;
    var cls =
      "wb-issue-card" +
      (isOpen ? " is-open" : isTeam ? " is-squad" : " is-solo");
    var stack = "";
    if (as.length) {
      stack =
        '<div class="squad-stack">' +
        as
          .slice(0, 3)
          .map(function (n) {
            var c = AVATAR_COLOR[n] || "#64748B";
            return (
              '<span class="av" style="background:' +
              c +
              '">' +
              n.charAt(0) +
              "</span>"
            );
          })
          .join("") +
        "</div>";
    }
    var whoBit = isOpen
      ? '<span class="who-tag">未指派</span>'
      : issue.squad
        ? '<span class="squad-tag">' + issue.squad + "</span>"
        : '<span class="who-tag">' + as.join(" · ") + "</span>";
    var extra = "";
    if (issue.status === "blocked" && issue.blockReason) {
      extra =
        '<span style="color:var(--destructive)">' +
        (issue.blockReason.length > 22
          ? issue.blockReason.slice(0, 22) + "…"
          : issue.blockReason) +
        "</span>";
    } else if (issue.status === "running" || issue.status === "claimed") {
      extra =
        '<span>' +
        (issue.progress || 0) +
        "%" +
        (issue.duration ? " · " + issue.duration : "") +
        "</span>";
    } else if (issue.status === "review") {
      extra = '<span>等人拍板</span>';
    }
    return (
      '<a class="' +
      cls +
      '" href="#" data-open-issue="' +
      issue.id +
      '" data-issue-title="' +
      issue.title.replace(/"/g, "&quot;") +
      '" data-assignees="' +
      as.join(" ") +
      '" data-wb-local>' +
      '<div class="card-top"><div class="t">' +
      issue.title +
      "</div>" +
      (stack || "") +
      "</div>" +
      '<div class="m">' +
      statusChipHtml(issue.status) +
      whoBit +
      extra +
      "</div></a>"
    );
  }

  function currentLaborFilter() {
    var el = $("[data-labor].on") || $("[data-labor].sel");
    return (el && el.getAttribute("data-name")) || "all";
  }

  function setLaborFilterUi(name) {
    $$("[data-labor]").forEach(function (a) {
      var on = a.getAttribute("data-name") === name;
      a.classList.toggle("on", on);
      a.classList.toggle("sel", on);
    });
  }

  function refreshWorkbenchBoard(filterName) {
    if (!$("[data-wb-board]")) return;
    filterName = filterName || "all";
    var buckets = { todo: [], doing: [], review: [], done: [] };
    Object.keys(ISSUE_DB).forEach(function (id) {
      var iss = ISSUE_DB[id];
      if (filterName !== "all") {
        var as = iss.assignees || [];
        if (as.indexOf(filterName) < 0) return;
      }
      var p = panelForStatus(iss.status);
      if (p === "done") return;
      buckets[p].push(iss);
    });
    var emptyCopy = {
      doing: '<div class="empty-state"><div class="glyph"><svg class="ic" style="width:22px;height:22px" viewBox="0 0 24 24"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/></svg></div><div class="t">暂无在跑</div></div>',
      todo: '<div class="empty-state"><div class="glyph"><svg class="ic" style="width:22px;height:22px" viewBox="0 0 24 24"><path d="M12 5v14"/><path d="M5 12h14"/></svg></div><div class="t">暂无待接活</div></div>',
      review: '<div class="empty-state"><div class="glyph"><svg class="ic" style="width:22px;height:22px" viewBox="0 0 24 24"><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div><div class="t">暂无待验收</div></div>',
    };
    ["todo", "doing", "review"].forEach(function (key) {
      var panel = $('[data-wb-panel="' + key + '"]');
      if (!panel) return;
      var html = buckets[key].map(cardHtml).join("");
      if (!html) html = emptyCopy[key];
      panel.innerHTML = html;
    });
    $$("[data-wb-seg] button").forEach(function (btn) {
      var t = btn.getAttribute("data-wb");
      var n = btn.querySelector(".n");
      if (n && buckets[t]) n.textContent = String(buckets[t].length);
    });
    var stats = $("[data-squad-stats]");
    if (stats) {
      stats.innerHTML =
        '<span class="stat">待接活 <em>' +
        buckets.todo.length +
        '</em></span><span class="stat">小队在跑 <em>' +
        buckets.doing.length +
        '</em></span><span class="stat">待验收 <em>' +
        buckets.review.length +
        "</em></span>";
    }
    var short = $("[data-squad-stats-short]");
    if (short) {
      short.textContent =
        "在跑 " + buckets.doing.length + " · 待验 " + buckets.review.length;
    }
    $$("[data-open-issue]", document).forEach(bindOpenIssueOnce);
  }

  function renderIssueDetail(id) {
    var issue = getIssue(id);
    if (!issue) {
      protoToast("事项不存在：" + id);
      showWorkbenchDetail(false);
      return false;
    }
    currentDetailId = id;
    var titleEl = $("[data-detail-title]");
    var idEl = $("[data-detail-id]");
    var chipWrap = $("[data-detail-chip]");
    var squadEl = $("[data-detail-squad]");
    var lifeEl = $("[data-detail-lifecycle]");
    var stepsEl = $("[data-detail-steps]");
    var delEl = $("[data-detail-deliverables]");
    var actsEl = $("[data-detail-acts]");
    var hintEl = $("[data-detail-composer-hint]");
    var blockEl = $("[data-detail-block]");

    if (titleEl) titleEl.textContent = issue.title;
    if (idEl) idEl.textContent = issue.id;
    if (chipWrap) chipWrap.innerHTML = statusChipHtml(issue.status);
    var headerAssign = $(".wb-detail [data-assign-issue]");
    if (headerAssign) headerAssign.setAttribute("data-assign-issue", issue.id);
    if (squadEl) squadEl.innerHTML = assigneesHtml(issue.assignees, issue.squad);
    if (lifeEl) lifeEl.innerHTML = renderLifecycle(issue.lifecycle);
    if (stepsEl) stepsEl.innerHTML = issue.stepsHtml || "";
    if (delEl) delEl.innerHTML = renderDeliverables(issue.deliverables);
    if (hintEl) {
      var who =
        issue.squad ||
        (issue.assignees && issue.assignees[0]) ||
        "小队";
      hintEl.textContent = "补充指令给 " + who + "…（下达通道，非主舞台）";
    }
    if (blockEl) {
      if (issue.blockReason) {
        blockEl.classList.remove("hidden");
        blockEl.textContent = issue.blockReason;
      } else {
        blockEl.classList.add("hidden");
      }
    }
    if (actsEl) {
      var html = "";
      if (issue.status === "review") {
        html =
          '<button type="button" class="btn pri" data-act-approve>验收通过</button>' +
          '<button type="button" class="btn ghost" data-act-reject>回退修改</button>';
      } else if (issue.status === "blocked") {
        html =
          '<button type="button" class="btn pri" data-act-unblock>补充口径并继续</button>' +
          '<button type="button" class="btn ghost" data-act-reject>仍阻塞</button>';
      } else if (issue.status === "todo") {
        html =
          '<a class="btn pri" href="09-staff-picker.html#squad" data-assign-issue="' +
          issue.id +
          '" data-assign-mode="squad">组队接活</a>' +
          '<a class="btn ghost" href="09-staff-picker.html#dispatch" data-assign-issue="' +
          issue.id +
          '" data-assign-mode="person">派单人</a>';
      } else if (issue.status === "done") {
        html =
          '<button type="button" class="btn pri" disabled style="opacity:.5">已完成</button>' +
          '<button type="button" class="btn ghost" data-wb-back>返回编排台</button>';
      } else {
        html =
          '<button type="button" class="btn pri" data-act-to-review>标记待验收</button>' +
          '<a class="btn ghost" href="09-staff-picker.html#squad" data-assign-issue="' +
          issue.id +
          '" data-assign-mode="squad">改派/组队</a>';
      }
      actsEl.innerHTML = html;
      wireDetailActs();
    }
    showWorkbenchDetail(true);
    return true;
  }

  function wireDetailActs() {
    var approve = $("[data-act-approve]");
    if (approve) {
      approve.addEventListener("click", function () {
        if (!currentDetailId) return;
        updateIssue(currentDetailId, {
          status: "done",
          progress: 100,
          step: "已验收完成",
        });
        protoToast("已验收");
        refreshWorkbenchBoard(currentLaborFilter());
        showWorkbenchDetail(false);
        setWbTab("review");
      });
    }
    var reject = $("[data-act-reject]");
    if (reject) {
      reject.addEventListener("click", function () {
        if (!currentDetailId) return;
        var iss = getIssue(currentDetailId);
        if (iss && iss.status === "blocked") {
          protoToast("仍阻塞");
          return;
        }
        updateIssue(currentDetailId, {
          status: "running",
          step: "按回退意见修改中",
          progress: Math.min((iss && iss.progress) || 70, 85),
        });
        protoToast("已回退");
        refreshWorkbenchBoard("all");
        renderIssueDetail(currentDetailId);
      });
    }
    var unblock = $("[data-act-unblock]");
    if (unblock) {
      unblock.addEventListener("click", function () {
        if (!currentDetailId) return;
        updateIssue(currentDetailId, {
          status: "running",
          blockReason: "",
          step: "口径已补 · 继续执行",
          progress: 60,
        });
        protoToast("已补充");
        refreshWorkbenchBoard("all");
        renderIssueDetail(currentDetailId);
      });
    }
    var toReview = $("[data-act-to-review]");
    if (toReview) {
      toReview.addEventListener("click", function () {
        if (!currentDetailId) return;
        updateIssue(currentDetailId, {
          status: "review",
          progress: 95,
          step: "等人验收",
        });
        protoToast("已标记待验收");
        refreshWorkbenchBoard("all");
        renderIssueDetail(currentDetailId);
      });
    }
    $$("[data-assign-issue]").forEach(function (a) {
      a.addEventListener("click", function () {
        var id = a.getAttribute("data-assign-issue") || currentDetailId || "";
        var mode = a.getAttribute("data-assign-mode") || "person";
        try {
          if (id) sessionStorage.setItem("proto-assign-issue", id);
          sessionStorage.setItem("proto-assign-mode", mode);
        } catch (e) {}
      });
    });
    $$("[data-wb-back]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        showWorkbenchDetail(false);
      });
    });
  }

  function bindOpenIssueOnce(el) {
    if (el.getAttribute("data-open-bound")) return;
    el.setAttribute("data-open-bound", "1");
    el.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var id = el.getAttribute("data-open-issue") || "";
      if (!id) return;
      if ($("[data-wb-detail]")) {
        renderIssueDetail(id);
      } else {
        navigateProto("05-workbench.html", "", {
          action: "push",
          extraSearch: "issue=" + encodeURIComponent(id),
        });
      }
    });
  }

  // 工作台：编排台三段板
  $$("[data-wb-seg]").forEach(function (seg) {
    var buttons = $$("button", seg);
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        setWbTab(btn.getAttribute("data-wb"));
      });
    });
  });

  $$("[data-wb-back]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      showWorkbenchDetail(false);
    });
  });

  // 深链 + 初始化工作台
  (function initWorkbenchFlow() {
    if (!$("[data-wb-board]") && !$("[data-wb-detail]")) return;

    var sp = new URLSearchParams(location.search);
    var issue = sp.get("issue");
    var tab = sp.get("tab");
    var intent = sp.get("intent");
    var labor = sp.get("labor");

    // 派活 / 组队回写：?assign=mika|squad|squad-customer&issue=UO-33
    var assignTo = sp.get("assign");
    if (assignTo && issue && getIssue(issue)) {
      var resolved = resolveAssign(assignTo);
      var life = (getIssue(issue).lifecycle || []).slice();
      life.push({
        when: "刚刚",
        what: resolved.team ? "Squad" : "Assign",
        detail: resolved.team
          ? resolved.squad + " 接活"
          : "指派 " + resolved.assignees[0],
        dot: "ok",
      });
      updateIssue(issue, {
        status: "running",
        assignees: resolved.assignees,
        squad: resolved.squad || "",
        progress: 15,
        step: resolved.step,
        duration: "刚指派",
        lifecycle: life,
        stepsHtml: resolved.team
          ? '<div class="dim"># squad claimed</div><div class="run">→ ' +
            resolved.squad +
            " 开工</div>"
          : '<div class="dim"># assigned</div><div class="run">→ ' +
            resolved.assignees[0] +
            " 开工</div>",
      });
      protoToast(resolved.toast);
      tab = "doing";
    }

    // 录音候选入队
    var fromVoice = sp.get("fromVoice");
    if (fromVoice === "1") {
      try {
        var cand = sessionStorage.getItem("proto-voice-candidates");
        if (cand) {
          var list = JSON.parse(cand);
          list.forEach(function (c) {
            if (!ISSUE_DB[c.id]) {
              addIssue({
                id: c.id,
                title: c.title,
                status: "todo",
                assignees: [],
                progress: 0,
                tools: 0,
                duration: "待接活",
                step: "来自录音 Context",
                blockReason: "",
                lifecycle: [
                  {
                    when: "刚刚",
                    what: "Enqueue",
                    detail: "录音行动信号",
                    dot: "ok",
                  },
                ],
                stepsHtml: '<div class="dim"># from voice context</div>',
                deliverables: [],
              });
            }
          });
          sessionStorage.removeItem("proto-voice-candidates");
          protoToast("已加入待接活 " + list.length + " 项");
          tab = "todo";
        }
      } catch (e) {}
    }

    if (labor && labor !== "all") {
      setLaborFilterUi(labor);
    }
    refreshWorkbenchBoard(labor || currentLaborFilter());

    if (intent === "dispatch") setWbTab("todo");
    else if (tab) setWbTab(tab);
    else setWbTab("doing");

    if (issue) {
      if (!getIssue(issue)) {
        protoToast("事项不存在：" + issue);
        showWorkbenchDetail(false);
      } else {
        renderIssueDetail(issue);
      }
    }
  })();

  // 一句话派活 / 组队
  (function wireWbDispatch() {
    if (!$("[data-wb-board]")) return;
    var input = $("#wb-dispatch-input");
    var go = $("#wb-dispatch-go");
    if (!input || !go) return;

    var KNOWN = ["Alex", "mika", "nova", "kai"];

    function parseDispatch(text) {
      var raw = (text || "").trim();
      var found = [];
      KNOWN.forEach(function (n) {
        if (raw.toLowerCase().indexOf(n.toLowerCase()) >= 0) found.push(n);
      });
      var wantSquad =
        /产品小队|整队|组队/.test(raw) ||
        (found.length === 0 && /小队/.test(raw));
      var assignees = wantSquad
        ? ["Alex", "mika", "kai"]
        : found.length
          ? found
          : ["mika"];
      var squad = "";
      if (wantSquad || assignees.length > 1) {
        squad =
          wantSquad ||
          (assignees.indexOf("Alex") >= 0 &&
            assignees.indexOf("mika") >= 0 &&
            assignees.indexOf("kai") >= 0)
            ? "产品小队"
            : "";
      }
      var title = raw
        .replace(/产品小队|整队|组队/g, "")
        .replace(/让|请|去|帮我/g, "")
        .replace(
          new RegExp("(" + KNOWN.join("|") + ")(\\s*[+和与、]\\s*)?", "gi"),
          "",
        )
        .replace(/[+和与、]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!title) title = raw.slice(0, 28) || "新事项";
      if (title.length > 36) title = title.slice(0, 36) + "…";
      return { title: title, assignees: assignees, squad: squad };
    }

    function runDispatch(text) {
      var parsed = parseDispatch(text);
      if (!parsed.title) {
        protoToast("先说事项");
        return;
      }
      var id = "UO-" + (40 + Math.floor(Math.random() * 50));
      while (ISSUE_DB[id]) id = "UO-" + (40 + Math.floor(Math.random() * 90));
      addIssue({
        id: id,
        title: parsed.title,
        status: "running",
        assignees: parsed.assignees,
        squad: parsed.squad,
        progress: 8,
        tools: 0,
        duration: "刚派发",
        step: (parsed.squad || parsed.assignees.join(" · ")) + " 执行中",
        blockReason: "",
        lifecycle: [
          {
            when: "刚刚",
            what: "Dispatch",
            detail: "一句话派活",
            dot: "ok",
          },
          {
            when: "刚刚",
            what: "Start",
            detail: parsed.assignees.join(" + "),
            dot: "ok",
          },
        ],
        stepsHtml:
          '<div class="dim"># from one-liner</div><div class="run">→ ' +
          parsed.assignees.join(" + ") +
          " 开工</div>",
        deliverables: [],
      });
      input.value = "";
      protoToast(
        (parsed.squad ? "「" + parsed.squad + "」" : parsed.assignees.join("+")) +
          " 已接活 · " +
          id,
      );
      refreshWorkbenchBoard(currentLaborFilter());
      setWbTab("doing");
      renderIssueDetail(id);
    }

    go.addEventListener("click", function () {
      runDispatch(input.value);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") runDispatch(input.value);
    });
    $$("[data-quick]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var q = btn.getAttribute("data-quick") || "";
        input.value = q;
        runDispatch(q);
      });
    });
  })();

  // 劳动力条：真过滤（chip 用 .on，兼容旧 .sel）
  $$("[data-labor]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      if (el.tagName === "A" && el.getAttribute("href") && el.getAttribute("href") !== "#") {
        return;
      }
      e.preventDefault();
      var name = el.getAttribute("data-name") || "all";
      setLaborFilterUi(name);
      refreshWorkbenchBoard(name);
    });
  });

  // 当前小队名写回 header
  (function () {
    var squadLink = $("[data-squad-label]");
    if (!squadLink) return;
    try {
      var sq = sessionStorage.getItem("proto-squad");
      if (sq) squadLink.textContent = sq + " ›";
    } catch (e) {}
  })();

  // 详情 Composer 发送
  var sendBtn = $(".composer-slim .send");
  if (sendBtn && $("[data-wb-detail]")) {
    sendBtn.addEventListener("click", function () {
      protoToast("已入队");
    });
  }

  // 派活 / 组队入口：预写 assign issue + mode
  $$("[data-prep-assign]").forEach(function (el) {
    el.addEventListener("click", function () {
      var raw = el.getAttribute("data-prep-assign") || "UO-33";
      var id = raw === "auto" ? firstTodoIssueId() : raw;
      var mode = el.getAttribute("data-assign-mode") || "person";
      try {
        sessionStorage.setItem("proto-assign-issue", id);
        sessionStorage.setItem("proto-assign-mode", mode);
      } catch (e) {}
    });
  });

  // 全局：首页/看板等深链打开事项（工作台本地卡由 refresh 再绑）
  $$("[data-open-issue]").forEach(bindOpenIssueOnce);

  window.__protoGetIssue = getIssue;
  window.__protoUpdateIssue = updateIssue;
  window.__protoAddIssue = addIssue;
  window.__protoIssueDb = function () {
    return ISSUE_DB;
  };
  window.__protoToast = protoToast;
  window.__protoRenderIssue = renderIssueDetail;
  window.__protoRefreshWb = refreshWorkbenchBoard;

  var range = $("#range-seg");
  if (range) {
    $$("button", range).forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$("button", range).forEach(function (b) {
          b.classList.toggle("on", b === btn);
        });
      });
    });
  }

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
    if (note) note.textContent = "默认员工";
    if (title) title.textContent = "默认员工";
  }
  if (location.hash === "#dispatch") {
    var note2 = $("[data-picker-intent]");
    var title2 = $("#picker-title");
    if (note2) note2.textContent = "";
    if (title2) title2.textContent = "指派";
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
        '<div class="ctx-title">Context</div>' +
        '<div class="ctx-sub" data-teach></div>' +
        '<div style="display:flex;gap:10px;margin-bottom:14px">' +
        '<a href="13-voice-record.html" style="flex:1;background:var(--well);border:1px solid var(--hairline);border-radius:12px;padding:14px 8px;text-align:center;text-decoration:none;color:inherit">' +
        '<div style="width:44px;height:44px;border-radius:10px;background:rgba(59,111,255,.12);color:var(--brand-hex);display:flex;align-items:center;justify-content:center;margin:0 auto 8px"><svg class="ic" style="width:22px;height:22px" viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg></div>' +
        '<div style="font-size:13px;font-weight:800">录音</div></a>' +
        '<a href="14-voice-translate.html" style="flex:1;background:var(--well);border:1px solid var(--hairline);border-radius:12px;padding:14px 8px;text-align:center;text-decoration:none;color:inherit">' +
        '<div style="width:44px;height:44px;border-radius:10px;background:rgba(13,148,136,.12);color:var(--teal);display:flex;align-items:center;justify-content:center;margin:0 auto 8px"><svg class="ic" style="width:22px;height:22px" viewBox="0 0 24 24"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg></div>' +
        '<div style="font-size:13px;font-weight:800">翻译</div></a>' +
        '<a href="12-voice-talk.html" style="flex:1;background:var(--well);border:1px solid var(--hairline);border-radius:12px;padding:14px 8px;text-align:center;text-decoration:none;color:inherit">' +
        '<div style="width:44px;height:44px;border-radius:10px;background:rgba(245,158,11,.14);color:var(--priority);display:flex;align-items:center;justify-content:center;margin:0 auto 8px"><svg class="ic" style="width:22px;height:22px" viewBox="0 0 24 24"><path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/></svg></div>' +
        '<div style="font-size:13px;font-weight:800">下达</div></a>' +
        "</div>" +
        '<button type="button" data-close-sheet style="width:100%;height:48px;border:none;border-radius:12px;background:var(--secondary);font-size:15px;font-weight:600;cursor:pointer">取消</button>' +
        "</div></div>";
      while (wrap.firstChild) host.appendChild(wrap.firstChild);
    }

    if (!$("#proto-toast")) {
      var t = document.createElement("div");
      t.className = "toast";
      t.id = "proto-toast";
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
        '<div style="width:84px;height:84px;border-radius:42px;background:rgba(255,255,255,.14);border:2px solid rgba(255,255,255,.55);display:flex;align-items:center;justify-content:center">' +
        '<svg class="ic" style="width:28px;height:28px;color:#fff" viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg></div>' +
        '<div style="font-size:13px;opacity:.7">松开结束 · 上滑取消</div>';
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
