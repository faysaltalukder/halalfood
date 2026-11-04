(() => {
  "use strict";
  if (window.__hfCustomerCareChatInitialized) return;
  window.__hfCustomerCareChatInitialized = true;

  const ASSET_BASE = "https://faysaltalukder.github.io/halalfood/";
  const CHAT_API = "https://qfwvrcfkrsydycbfjsxf.supabase.co/functions/v1/customer-care-chat";
  const style = document.createElement("link");
  style.id = "hf-customer-care-chat-styles";
  style.rel = "stylesheet";
  style.href = ASSET_BASE + "css/customer-care-chat.css?v=20261103-ai-feedback-v1";
  document.head.appendChild(style);

  let root = document.getElementById("hf-contact-widget");
  if (!root) {
    root = document.createElement("div");
    root.className = "hf-contact-widget";
    root.id = "hf-contact-widget";
    document.body.appendChild(root);
  }

  let originalLauncher = root.querySelector(".hf-contact-launcher");
  if (!originalLauncher) {
    originalLauncher = document.createElement("button");
    originalLauncher.className = "hf-contact-launcher";
    originalLauncher.type = "button";
    originalLauncher.innerHTML = '<svg class="hf-contact-chat-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v12H9l-5 4z"></path></svg><svg class="hf-contact-close-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg>';
    root.appendChild(originalLauncher);
  }

  const launcher = originalLauncher.cloneNode(true);
  launcher.id = "hf-contact-launcher";
  launcher.setAttribute("aria-label", "Open Halal Food AI chat");
  launcher.setAttribute("aria-expanded", "false");
  launcher.removeAttribute("data-bound");
  originalLauncher.replaceWith(launcher);
  root.querySelector(".hf-contact-options")?.remove();

  const panel = document.createElement("section");
  panel.className = "hf-ai-chat-panel";
  panel.id = "hf-ai-chat-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Halal Food AI Customer Care");
  panel.innerHTML =
    '<header class="hf-ai-chat-header">' +
      '<div class="hf-ai-chat-brand">' +
        '<span class="hf-ai-chat-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-5.5 4v-4.6A2.5 2.5 0 0 1 4 13.5z"></path><path d="M8 8h8M8 11.5h5"></path></svg></span>' +
        '<span class="hf-ai-chat-brand-copy"><strong>Halal Food AI</strong><small>Customer Care Assistant</small></span>' +
      '</div>' +
      '<div class="hf-ai-chat-actions"><button class="hf-ai-chat-action hf-ai-chat-new" type="button" aria-label="নতুন কথোপকথন" title="নতুন কথোপকথন"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg></button><button class="hf-ai-chat-action hf-ai-chat-minimize" type="button" aria-label="চ্যাট ছোট করুন" title="ছোট করুন"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"></path></svg></button><button class="hf-ai-chat-action hf-ai-chat-close" type="button" aria-label="চ্যাট বন্ধ করুন" title="বন্ধ করুন">×</button></div>' +
    '</header>' +
    '<div class="hf-ai-chat-content" id="hf-ai-chat-content">' +
      '<div class="hf-ai-chat-context"><span class="hf-ai-chat-context-dot"></span><span>পণ্য, অর্ডার ও ডেলিভারি সহায়তা</span><span class="hf-ai-chat-context-separator">•</span><span>বাংলা / English</span><button class="hf-ai-chat-cart-link" type="button" data-hf-chat-cart>কার্ট <b id="hf-ai-cart-count">0</b></button><button class="hf-ai-chat-human-link" type="button" data-hf-human-support>মানব সহায়তা</button></div><section class="hf-ai-chat-view" id="hf-ai-chat-view" role="region" aria-label="পণ্য ও অর্ডার" aria-live="polite" hidden></section><div class="hf-ai-chat-messages" id="hf-ai-chat-messages" aria-live="polite" aria-relevant="additions text">' +
        '<div class="hf-ai-chat-day-divider"><span>কথোপকথন শুরু</span></div><div class="hf-ai-message-group hf-ai-message-group-assistant"><div class="hf-ai-message-avatar" aria-hidden="true">H</div><div class="hf-ai-message hf-ai-message-assistant"><p>আসসালামু আলাইকুম! Halal Food-এ স্বাগতম। কী খুঁজছেন বা কীভাবে সাহায্য করতে পারি?</p><span class="hf-ai-message-time">Halal Food Assistant</span></div></div>' +
        '<div class="hf-ai-chat-prompts" aria-label="সাধারণ প্রশ্ন">' +
          '<button type="button" data-hf-chat-prompt="আমি কী কী পণ্য পেতে পারি?">কী কী পণ্য পাওয়া যায়?</button>' +
          '<button type="button" data-hf-chat-prompt="ডেলিভারি সম্পর্কে জানতে চাই।">ডেলিভারি সম্পর্কে জানতে চাই</button>' +
          '<button type="button" data-hf-chat-prompt="ওয়েবসাইটে কীভাবে অর্ডার করব?">কীভাবে অর্ডার করব?</button>' +
        '</div>' +
      '</div>' +
      '<form class="hf-ai-chat-composer" id="hf-ai-chat-form">' +
        '<div class="hf-ai-chat-attachment-preview" id="hf-ai-chat-attachment-preview" hidden><img id="hf-ai-chat-attachment-image" alt="আপলোড করা ছবির প্রিভিউ"><span id="hf-ai-chat-attachment-name"></span><button type="button" id="hf-ai-chat-remove-image" aria-label="ছবি সরান">×</button></div>' +
        '<div class="hf-ai-chat-composer-row">' +
          '<button class="hf-ai-chat-tool hf-ai-chat-attach" id="hf-ai-chat-attach" type="button" aria-label="ছবি যোগ করুন" title="ছবি দিয়ে পণ্য খুঁজুন"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg></button>' +
          '<input id="hf-ai-chat-image-file" type="file" accept="image/jpeg,image/png,image/webp" hidden>' +
          '<label class="hf-ai-chat-input-wrap"><span class="hf-ai-visually-hidden">আপনার প্রশ্ন লিখুন</span><textarea id="hf-ai-chat-input" name="message" rows="1" autocomplete="off" placeholder="লিখুন বা ছবি যোগ করুন..."></textarea></label>' +
          '<button class="hf-ai-chat-tool hf-ai-chat-mic" id="hf-ai-chat-mic" type="button" aria-label="ভয়েসে প্রশ্ন করুন" title="ভয়েসে প্রশ্ন করুন"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"></path></svg></button>' +
          '<button class="hf-ai-chat-send" type="submit" aria-label="মেসেজ পাঠান"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 3-7.2 18-3.7-7.1L3 10.2 21 3Z"></path><path d="M10.1 13.9 21 3"></path></svg></button>' +
        '</div>' +
        '<span class="hf-ai-chat-input-hint" id="hf-ai-chat-input-hint" aria-live="polite">ছবি বা ভয়েস—দুটিই ঐচ্ছিক</span>' +
      '</form>' +
      '<div class="hf-ai-chat-footnote"><span>Powered by Halal Food AI</span><span>Enter পাঠান · Shift + Enter নতুন লাইন</span></div>' +
    '</div>';
  document.body.appendChild(panel);

  const closeButton = panel.querySelector(".hf-ai-chat-close");
  const minimizeButton = panel.querySelector(".hf-ai-chat-minimize");
  const newChatButton = panel.querySelector(".hf-ai-chat-new");
  const chatContent = panel.querySelector("#hf-ai-chat-content");
  const messages = panel.querySelector("#hf-ai-chat-messages");
  const chatView = panel.querySelector("#hf-ai-chat-view");
  const cartCount = panel.querySelector("#hf-ai-cart-count");
  const cartButton = panel.querySelector("[data-hf-chat-cart]");
  const form = panel.querySelector("#hf-ai-chat-form");
  const input = panel.querySelector("#hf-ai-chat-input");
  const sendButton = panel.querySelector(".hf-ai-chat-send");
  const attachButton = panel.querySelector("#hf-ai-chat-attach");
  const imageInput = panel.querySelector("#hf-ai-chat-image-file");
  const imagePreview = panel.querySelector("#hf-ai-chat-attachment-preview");
  const previewImage = panel.querySelector("#hf-ai-chat-attachment-image");
  const previewName = panel.querySelector("#hf-ai-chat-attachment-name");
  const removeImageButton = panel.querySelector("#hf-ai-chat-remove-image");
  const micButton = panel.querySelector("#hf-ai-chat-mic");
  const inputHint = panel.querySelector("#hf-ai-chat-input-hint");
  let selectedImageFile = null, selectedImageUrl = "", speechRecognition = null, speechActive = false;
  const conversation = [];
  const CHAT_VISITOR_STORAGE_KEY = "hf_ai_visitor_id_v1";
  const CHAT_CONVERSATION_STORAGE_KEY = "hf_ai_conversation_id_v1";
  function readOrCreateChatId(key) {
    try {
      let value = localStorage.getItem(key) || "";
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
        value = makeChatUuid();
        localStorage.setItem(key, value);
      }
      return value;
    } catch (_) { return makeChatUuid(); }
  }
  let visitorId = readOrCreateChatId(CHAT_VISITOR_STORAGE_KEY);
  let currentConversationId = readOrCreateChatId(CHAT_CONVERSATION_STORAGE_KEY);
  let historyLoadSequence = 0;
  let historyLoaded = false;
  let historyReady = Promise.resolve();
  const productCatalog = new Map();
  const shoppingCart = [];
  let currentProduct = null, detailQuantity = 1, activeView = "conversation";
  let checkoutValues = {}, checkoutQuote = null, pendingOrderId = "", orderSubmitting = false, chatCheckoutStartedAt = 0;
  let turnstileWidgetId = null, turnstileToken = "", turnstileScriptPromise = null;
  let busy = false, minimized = false, savedScrollY = 0;
  let previousBodyOverflow = "", previousHtmlOverflow = "", previousBodyPosition = "", previousBodyTop = "", previousBodyWidth = "";
  function isMobileChat() { return window.matchMedia("(max-width: 900px)").matches; }
  function lockMobilePage() {
    if (!isMobileChat()) return;
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    previousBodyOverflow = document.body.style.overflow; previousHtmlOverflow = document.documentElement.style.overflow;
    previousBodyPosition = document.body.style.position; previousBodyTop = document.body.style.top; previousBodyWidth = document.body.style.width;
    document.documentElement.classList.add("hf-ai-chat-open"); document.body.classList.add("hf-ai-chat-open");
    document.body.style.overflow = "hidden"; document.documentElement.style.overflow = "hidden";
    document.body.style.position = "fixed"; document.body.style.top = "-" + savedScrollY + "px"; document.body.style.width = "100%";
  }
  function unlockMobilePage() {
    document.documentElement.classList.remove("hf-ai-chat-open"); document.body.classList.remove("hf-ai-chat-open");
    document.body.style.overflow = previousBodyOverflow; document.documentElement.style.overflow = previousHtmlOverflow;
    document.body.style.position = previousBodyPosition; document.body.style.top = previousBodyTop; document.body.style.width = previousBodyWidth;
    window.scrollTo({ top: savedScrollY, behavior: "auto" });
  }
  function ensureConversationReady() {
    if (!historyLoaded) {
      historyLoaded = true;
      historyReady = restoreConversation();
    }
    return historyReady;
  }
  function openChat() {
    ensureConversationReady();
    panel.hidden = false; minimized = false; panel.classList.remove("is-minimized"); lockMobilePage();
    launcher.setAttribute("aria-expanded", "true"); launcher.setAttribute("aria-label", "Close Halal Food AI chat");
    window.setTimeout(() => input?.focus({ preventScroll: true }), 80);
  }
  function closeChat() {
    panel.hidden = true; panel.classList.remove("is-minimized"); minimized = false; unlockMobilePage();
    launcher.setAttribute("aria-expanded", "false"); launcher.setAttribute("aria-label", "Open Halal Food AI chat");
  }
  function minimizeChat() {
    if (isMobileChat()) { closeChat(); return; }
    minimized = true; panel.classList.add("is-minimized"); input.blur();
    minimizeButton.setAttribute("aria-label", "চ্যাট আবার বড় করুন"); minimizeButton.title = "আবার বড় করুন";
  }
  function restoreChat() {
    minimized = false; panel.classList.remove("is-minimized");
    minimizeButton.setAttribute("aria-label", "চ্যাট ছোট করুন"); minimizeButton.title = "ছোট করুন"; input.focus({ preventScroll: true });
  }
  function cleanAssistantText(value) {
    return String(value || "")
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      .replace(/^\s*[-*•]+\s+/gm, "")
      .replace(/^\s*\d+[.)]\s+/gm, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/(?<!\*)\*(?!\s)(.*?)(?<!\s)\*(?!\*)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^\s*[-_]{3,}\s*$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+([,;:!?।])/g, "$1")
      .replace(/([.!?।])(?:\s*[.!?।])+/g, "$1")
      .trim();
  }
  function scrollToLatest(force) { const distance = messages.scrollHeight - messages.scrollTop - messages.clientHeight; if (force || distance < 100) messages.scrollTo({ top: messages.scrollHeight, behavior: "smooth" }); }
  function appendMessage(text, sender, extraClass) {
    const wasNearBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 100;
    const shouldStickToBottom = sender === "user" || wasNearBottom;
    const group = document.createElement("div");
    group.className = "hf-ai-message-group " + (sender === "user" ? "hf-ai-message-group-user" : "hf-ai-message-group-assistant");
    if (sender === "assistant") { const avatar = document.createElement("div"); avatar.className = "hf-ai-message-avatar"; avatar.setAttribute("aria-hidden", "true"); avatar.textContent = "H"; group.appendChild(avatar); }
    const bubble = document.createElement("div");
    bubble.className = "hf-ai-message " + (sender === "user" ? "hf-ai-message-user" : "hf-ai-message-assistant") + (extraClass ? " " + extraClass : "");
    const paragraph = document.createElement("p"); paragraph.textContent = sender === "assistant" ? cleanAssistantText(text) : text; bubble.appendChild(paragraph);
    const time = document.createElement("span"); time.className = "hf-ai-message-time";
    time.textContent = (sender === "user" ? "আপনি · " : "Halal Food AI · ") + new Intl.DateTimeFormat("bn-BD", {hour:"2-digit",minute:"2-digit"}).format(new Date());
    bubble.appendChild(time); group.appendChild(bubble); messages.appendChild(group); if (shouldStickToBottom) scrollToLatest(true); return bubble;
  }

  async function restoreConversation() {
    const conversationId = currentConversationId;
    const sequence = ++historyLoadSequence;
    try {
      const response = await fetch(CHAT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          action: "conversation_history",
          conversationId,
          visitorId
        }),
        signal: AbortSignal.timeout(12000)
      });
      const data = await response.json().catch(function () { return {}; });
      if (!response.ok || data.success !== true || !Array.isArray(data.rows)) return;
      if (sequence !== historyLoadSequence || conversationId !== currentConversationId || !data.rows.length) return;

      messages.innerHTML = '<div class="hf-ai-chat-day-divider"><span>আগের কথোপকথন</span></div>';
      conversation.length = 0;
      data.rows.forEach(function (row) {
        if (!row || !["user", "assistant"].includes(row.role) || typeof row.content !== "string") return;
        const sender = row.role === "user" ? "user" : "assistant";
        const bubble = appendMessage(row.content, sender);
        const time = bubble.querySelector(".hf-ai-message-time");
        if (time && row.created_at) {
          const date = new Date(row.created_at);
          if (!Number.isNaN(date.getTime())) {
            time.textContent = (sender === "user" ? "আপনি · " : "Halal Food AI · ") +
              new Intl.DateTimeFormat("bn-BD", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }).format(date);
          }
        }
        const names = Array.isArray(row.product_names) ? row.product_names.map(function (name) { return String(name || "").trim(); }).filter(Boolean).slice(0, 8) : [];
        const historyText = sender === "assistant" && names.length
          ? row.content + "\\n[Products shown: " + names.join(", ") + "]"
          : row.content;
        conversation.push({ role: sender, text: historyText });
      });
      if (conversation.length > 40) conversation.splice(0, conversation.length - 40);
      const prompts = document.createElement("div");
      prompts.className = "hf-ai-chat-prompts";
      prompts.setAttribute("aria-label", "সাধারণ প্রশ্ন");
      prompts.innerHTML =
        '<button type="button" data-hf-chat-prompt="আমি কী কী পণ্য পেতে পারি?">কী কী পণ্য পাওয়া যায়?</button>' +
        '<button type="button" data-hf-chat-prompt="ডেলিভারি সম্পর্কে জানতে চাই।">ডেলিভারি সম্পর্কে জানতে চাই</button>' +
        '<button type="button" data-hf-chat-prompt="ওয়েবসাইটে কীভাবে অর্ডার করব?">কীভাবে অর্ডার করব?</button>';
      messages.appendChild(prompts);
      bindPromptButtons();
      scrollToLatest(true);
    } catch (_) {
      // A history restore failure must never prevent a customer from starting a fresh chat.
    }
  }

  async function saveAssistantFeedback(payload, rating, reason, controls) {
    controls.querySelectorAll("button").forEach(function (button) { button.disabled = true; });
    const status = controls.querySelector(".hf-ai-feedback-status");
    if (status) status.textContent = "মতামত সংরক্ষণ হচ্ছে…";
    try {
      const response = await fetch(CHAT_API, { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ action: "feedback", requestId: payload.requestId, rating: rating, reason: reason || null,
          question: payload.question, answer: payload.answer, productIds: payload.products.map(function (item) { return item.id; }),
          productNames: payload.products.map(function (item) { return item.name; }), model: payload.model }),
        signal: AbortSignal.timeout(10000) });
      const data = await response.json().catch(function () { return {}; });
      if (!response.ok || data.success !== true) throw new Error(data.code || "FEEDBACK_SAVE_FAILED");
      controls.innerHTML = '<span class="hf-ai-feedback-thanks" role="status">ধন্যবাদ! আপনার মতামত সংরক্ষণ করা হয়েছে।</span>';
    } catch (_) {
      if (status) status.textContent = "মতামত সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।";
      controls.querySelectorAll("button").forEach(function (button) { button.disabled = false; });
    }
  }
  function appendFeedbackControls(bubble, payload) {
    if (!payload.requestId) return;
    const controls = document.createElement("div");
    controls.className = "hf-ai-feedback-controls";
    const prompt = document.createElement("span"); prompt.className = "hf-ai-feedback-prompt"; prompt.textContent = "উত্তরটি কেমন হলো?";
    const actions = document.createElement("div"); actions.className = "hf-ai-feedback-actions";
    const like = document.createElement("button"); like.type = "button"; like.className = "hf-ai-feedback-button"; like.textContent = "👍 ভালো হয়েছে";
    const dislike = document.createElement("button"); dislike.type = "button"; dislike.className = "hf-ai-feedback-button"; dislike.textContent = "👎 একমত নই";
    const status = document.createElement("span"); status.className = "hf-ai-feedback-status"; status.setAttribute("aria-live", "polite");
    actions.append(like, dislike); controls.append(prompt, actions, status); bubble.appendChild(controls);
    like.addEventListener("click", function () { saveAssistantFeedback(payload, "helpful", null, controls); });
    dislike.addEventListener("click", function () {
      actions.innerHTML = "";
      const reasons = [
        ["wrong_product", "ভুল পণ্য"], ["misunderstood", "প্রশ্ন বোঝেনি"],
        ["incorrect_information", "ভুল তথ্য"], ["irrelevant", "অপ্রাসঙ্গিক"], ["unclear", "অস্পষ্ট উত্তর"], ["other", "অন্য কারণ"]
      ];
      reasons.forEach(function (entry) {
        const button = document.createElement("button"); button.type = "button"; button.className = "hf-ai-feedback-reason"; button.textContent = entry[1];
        button.addEventListener("click", function () { saveAssistantFeedback(payload, "not_helpful", entry[0], controls); });
        actions.appendChild(button);
      });
      status.textContent = "কী সমস্যা হয়েছে? একটি কারণ বেছে নিন।";
    });
  }
  function bindPromptButtons() { panel.querySelectorAll("[data-hf-chat-prompt]").forEach(button => button.addEventListener("click", () => submitQuestion(button.getAttribute("data-hf-chat-prompt")))); }
  function resetConversation() {
    if (busy) return;
    conversation.length = 0;
    currentConversationId = makeChatUuid();
    try { localStorage.setItem(CHAT_CONVERSATION_STORAGE_KEY, currentConversationId); } catch (_) {}
    historyLoadSequence++;
    historyLoaded = true;
    historyReady = Promise.resolve();
    messages.innerHTML = '<div class="hf-ai-chat-day-divider"><span>নতুন কথোপকথন</span></div><div class="hf-ai-message-group hf-ai-message-group-assistant"><div class="hf-ai-message-avatar" aria-hidden="true">H</div><div class="hf-ai-message hf-ai-message-assistant"><p>আসসালামু আলাইকুম! Halal Food-এ স্বাগতম। কীভাবে সাহায্য করতে পারি?</p><span class="hf-ai-message-time">Halal Food Assistant</span></div></div><div class="hf-ai-chat-prompts" aria-label="সাধারণ প্রশ্ন"><button type="button" data-hf-chat-prompt="আমি কী কী পণ্য পেতে পারি?">কী কী পণ্য পাওয়া যায়?</button><button type="button" data-hf-chat-prompt="ডেলিভারি সম্পর্কে জানতে চাই।">ডেলিভারি সম্পর্কে জানতে চাই</button><button type="button" data-hf-chat-prompt="ওয়েবসাইটে কীভাবে অর্ডার করব?">কীভাবে অর্ডার করব?</button></div>';
    bindPromptButtons(); messages.scrollTop = 0;
  }
  function resizeComposer() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 112) + "px"; input.style.overflowY = input.scrollHeight > 112 ? "auto" : "hidden"; }
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[ch];
    });
  }
  function money(value) {
    const amount = Number(value);
    return "৳ " + (Number.isFinite(amount) ? amount : 0).toLocaleString("en-BD", { maximumFractionDigits: 2 });
  }
  function productImageUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      const url = new URL(raw, ASSET_BASE);
      return (url.protocol === "https:" || url.origin === new URL(ASSET_BASE).origin) ? url.href : "";
    } catch (_) { return ""; }
  }
  function trackChatEvent(eventName, items, value, extra) {
    const rows = (Array.isArray(items) ? items : []).map(function (item) {
      return {
        item_id: String(item.slug || item.id || ""),
        item_name: String(item.name || ""),
        item_category: String(item.category || ""),
        price: Number(item.unitPrice != null ? item.unitPrice : item.price_value != null ? item.price_value : item.price) || 0,
        quantity: Math.max(1, Number(item.quantity != null ? item.quantity : item.qty) || 1)
      };
    });
    const params = {
      currency: "BDT", items: rows,
      first_party_metadata: Object.assign({ interaction_source: "ai_chat" }, extra || {})
    };
    if (typeof value === "number" && Number.isFinite(value)) params.value = value;
    try { window.halalTrack?.(eventName, params); } catch (_) {}
  }
  function cartSubtotal() {
    return shoppingCart.reduce(function (sum, item) {
      return sum + (Number(item.unitPrice) || 0) * Math.max(1, Number(item.qty) || 1);
    }, 0);
  }
  function cartItemsForTracking() {
    return shoppingCart.map(function (item) {
      return { id:item.id, slug:item.slug, name:item.name, category:item.category, unitPrice:item.unitPrice, qty:item.qty };
    });
  }
  function updateCartBadge() {
    const count = shoppingCart.reduce(function (sum, item) { return sum + item.qty; }, 0);
    if (cartCount) cartCount.textContent = String(count);
    if (cartButton) {
      cartButton.setAttribute("aria-label", "কার্টে " + count + "টি পণ্য");
      cartButton.classList.toggle("has-items", count > 0);
    }
  }
  function setView(name) {
    activeView = name;
    const conversationMode = name === "conversation";
    messages.hidden = !conversationMode;
    chatView.hidden = conversationMode;
    form.hidden = !conversationMode;
    panel.classList.toggle("has-shopping-view", !conversationMode);
    if (conversationMode) window.setTimeout(function () { input.focus({ preventScroll: true }); }, 30);
    else {
      chatView.scrollTop = 0;
      window.setTimeout(function () { chatView.querySelector("button, input, textarea")?.focus({ preventScroll: true }); }, 30);
    }
  }
  function viewHeader(title, backLabel) {
    return '<div class="hf-ai-view-header"><button type="button" class="hf-ai-view-back" data-hf-view-back>← ' +
      escapeHtml(backLabel || "চ্যাটে ফিরুন") + '</button><strong>' + escapeHtml(title) + '</strong></div>';
  }
  function appendProductCards(bubble, products, maxCards, matchType) {
    const safeLimit = Math.min(4, Math.max(0, Math.floor(Number(maxCards) || 0)));
    if (!Array.isArray(products) || !products.length || safeLimit < 1) return;
    const wrap = document.createElement("div");
    wrap.className = "hf-ai-product-cards";
    const shownItems = [];
    products.slice(0, safeLimit).forEach(function (product, index) {
      if (!product || typeof product.id !== "string" || typeof product.slug !== "string" || !product.name) return;
      productCatalog.set(product.id, product);
      const card = document.createElement("article");
      card.className = "hf-ai-product-card";
      const imageUrl = productImageUrl(product.image_url);
      if (imageUrl) {
        const image = document.createElement("img");
        image.className = "hf-ai-product-card-image";
        image.src = imageUrl;
        image.alt = product.name + " — Halal Food";
        image.loading = "eager";
        image.decoding = "async";
        image.referrerPolicy = "no-referrer";
        image.onerror = function () {
          const placeholder = document.createElement("span");
          placeholder.className = "hf-ai-product-image-placeholder";
          placeholder.textContent = "এই পণ্যের ছবি পাওয়া যায়নি";
          image.replaceWith(placeholder);
        };
        card.appendChild(image);
      } else {
        const placeholder = document.createElement("span");
        placeholder.className = "hf-ai-product-image-placeholder";
        placeholder.textContent = "এই পণ্যের ছবি পাওয়া যায়নি";
        card.appendChild(placeholder);
      }
      const copy = document.createElement("span"); copy.className = "hf-ai-product-card-copy";
      const name = document.createElement("strong"); name.textContent = product.name;
      const price = document.createElement("span"); price.textContent = String(product.price || (product.price_value != null ? money(product.price_value) : "দাম যাচাই প্রয়োজন"));
      const meta = document.createElement("small");
      meta.textContent = [product.category, product.availability === "available" ? "স্টকে আছে" : product.availability === "unavailable" ? "স্টকে নেই" : "স্টক নিশ্চিত করতে হবে"].filter(Boolean).join(" · ");
      copy.append(name, price, meta);
      const actions = document.createElement("span"); actions.className = "hf-ai-product-card-actions";
      const details = document.createElement("button"); details.type = "button"; details.textContent = "বিস্তারিত"; details.dataset.hfProductView = product.id;
      const order = document.createElement("button"); order.type = "button"; order.innerHTML = "অর্ডার<br>করুন"; order.setAttribute("aria-label", "অর্ডার করুন"); order.dataset.hfProductOrder = product.id; order.disabled = product.availability === "unavailable";
      actions.append(details, order);
      card.append(copy, actions);
      wrap.appendChild(card);
      shownItems.push(product);
    });
    if (wrap.children.length) {
      const shouldStick = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 100;
      bubble.appendChild(wrap);
      trackChatEvent("view_item_list", shownItems, null, { list_name:"ai_chat_recommendations" });
      shownItems.forEach(function (item) { trackChatEvent("ai_product_card_shown", [item], null, { match_type:matchType || item.match_type || "unknown", confidence_level:item.confidence_level || "unknown", interaction_source:"ai_chat" }); });
      if (shouldStick) scrollToLatest(true);
    }
  }
  function openProduct(product, orderNow) {
    if (!product) return;
    currentProduct = product; detailQuantity = 1;
    const viewedItem = { id:product.id, slug:product.slug, name:product.name, category:product.category, unitPrice:product.price_value, qty:1 };
    trackChatEvent("select_item", [viewedItem], Number(product.price_value) || 0, { view:"product_card" });
    trackChatEvent("view_item", [viewedItem], Number(product.price_value) || 0, { interaction_source:"ai_chat" });
    trackChatEvent("ai_product_clicked", [viewedItem], Number(product.price_value) || 0, { view:"product_card", match_type:product.match_type || "unknown", confidence_level:product.confidence_level || "unknown" });
    renderProductDetail(); setView("product");
    if (orderNow) addCurrentProductToCart(true);
  }
  function renderProductDetail() {
    if (!currentProduct) return;
    const p = currentProduct, image = productImageUrl(p.image_url);
    const summary = p.full_description || p.short_description || p.description || p.verified_summary || "এই পণ্যের অতিরিক্ত যাচাইকৃত বিবরণ এখনো যোগ করা হয়নি।";
    const availability = p.availability === "available" ? "স্টকে আছে" : p.availability === "unavailable" ? "এই মুহূর্তে স্টকে নেই" : "স্টক নিশ্চিত করতে হবে";
    chatView.innerHTML = viewHeader("পণ্যের বিস্তারিত", "কথোপকথনে ফিরুন") +
      '<div class="hf-ai-product-detail">' +
      (image ? '<img class="hf-ai-product-detail-image" src="' + escapeHtml(image) + '" alt="' + escapeHtml(p.name) + '">' : '<div class="hf-ai-product-detail-placeholder">ছবি পাওয়া যায়নি</div>') +
      '<div class="hf-ai-product-detail-copy"><span class="hf-ai-product-category">' + escapeHtml(p.category || "Halal Food") + '</span><h3>' + escapeHtml(p.name) + '</h3>' +
      '<strong class="hf-ai-product-detail-price">' + escapeHtml(p.price || money(p.price_value)) + '</strong><p>' + escapeHtml(summary) + '</p>' +
      '<small>' + escapeHtml(availability) + (p.unit_type ? " · " + escapeHtml(p.unit_type) : "") + '</small></div>' +
      '<div class="hf-ai-detail-quantity"><span>পরিমাণ</span><div><button type="button" data-hf-detail-minus aria-label="পরিমাণ কমান">−</button><output>' + detailQuantity + '</output><button type="button" data-hf-detail-plus aria-label="পরিমাণ বাড়ান">+</button></div></div>' +
      '<div class="hf-ai-view-actions"><button type="button" class="hf-ai-secondary-button" data-hf-add-current>কার্টে যোগ করুন</button><button type="button" class="hf-ai-primary-button" data-hf-order-current ' + (p.availability === "unavailable" ? "disabled" : "") + '>এখনই অর্ডার করুন</button></div></div>';
  }
  function addCurrentProductToCart(orderNow) {
    if (!currentProduct || currentProduct.availability === "unavailable") return;
    const p = currentProduct, qty = Math.max(1, Math.min(1000, Math.floor(Number(detailQuantity) || 1)));
    const existing = shoppingCart.find(function (item) { return item.id === p.id; });
    if (existing) existing.qty = Math.min(1000, existing.qty + qty);
    else shoppingCart.push({ id:p.id, slug:p.slug, name:p.name, category:p.category, unitPrice:Number(p.price_value) || 0,
      displayPrice:p.price, image_url:p.image_url || "", unit_type:p.unit_type || "piece", qty:qty });
    updateCartBadge();
    trackChatEvent("add_to_cart", [{ id:p.id, slug:p.slug, name:p.name, category:p.category, unitPrice:p.price_value, qty:qty }], (Number(p.price_value) || 0) * qty, { action:"product_detail" });
    if (orderNow) openCheckout();
    else {
      chatView.innerHTML = viewHeader("কার্টে যোগ হয়েছে", "পণ্যে ফিরুন") +
        '<div class="hf-ai-inline-success"><strong>' + escapeHtml(p.name) + '</strong><p>পণ্যটি আপনার কার্টে যোগ করা হয়েছে। চাইলে আরও পণ্য দেখতে পারেন অথবা অর্ডার সম্পন্ন করতে পারেন।</p>' +
        '<div class="hf-ai-view-actions"><button type="button" class="hf-ai-secondary-button" data-hf-view-back>আরও পণ্য দেখুন</button><button type="button" class="hf-ai-primary-button" data-hf-open-cart>কার্ট দেখুন</button></div></div>';
      setView("product");
    }
  }
  function renderCart(trackView) {
    updateCartBadge();
    if (trackView !== false) trackChatEvent("view_cart", cartItemsForTracking(), cartSubtotal(), { cart_source:"ai_chat" });
    let body = "";
    if (!shoppingCart.length) body = '<div class="hf-ai-empty-state"><strong>আপনার কার্ট এখন খালি</strong><p>কথোপকথন থেকে পছন্দের পণ্য বেছে নিতে পারেন।</p><button type="button" class="hf-ai-primary-button" data-hf-view-back>পণ্য খুঁজুন</button></div>';
    else {
      body = '<div class="hf-ai-cart-items">' + shoppingCart.map(function (item, index) {
        const image = productImageUrl(item.image_url);
        return '<article class="hf-ai-cart-item">' + (image ? '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(item.name) + '">' : '<span class="hf-ai-cart-image-empty">HF</span>') +
          '<div class="hf-ai-cart-item-copy"><strong>' + escapeHtml(item.name) + '</strong><small>' + money(item.unitPrice) + (item.unit_type ? " / " + escapeHtml(item.unit_type) : "") + '</small>' +
          '<div class="hf-ai-cart-quantity"><button type="button" data-hf-cart-minus="' + index + '" aria-label="পরিমাণ কমান">−</button><output>' + item.qty + '</output>' +
          '<button type="button" data-hf-cart-plus="' + index + '" aria-label="পরিমাণ বাড়ান">+</button><button type="button" class="hf-ai-remove-item" data-hf-cart-remove="' + index + '">সরান</button></div></div>' +
          '<strong class="hf-ai-cart-line-total">' + money(item.unitPrice * item.qty) + '</strong></article>';
      }).join("") + '</div><div class="hf-ai-cart-total"><span>পণ্যের মোট</span><strong>' + money(cartSubtotal()) + '</strong></div>' +
      '<div class="hf-ai-view-actions"><button type="button" class="hf-ai-secondary-button" data-hf-view-back>আরও পণ্য যোগ করুন</button><button type="button" class="hf-ai-primary-button" data-hf-checkout>অর্ডার সম্পন্ন করুন</button></div>';
    }
    chatView.innerHTML = viewHeader("আপনার কার্ট", "কথোপকথনে ফিরুন") + body; setView("cart");
  }
  function openCheckout() {
    if (!shoppingCart.length) { renderCart(); return; }
    if (!chatCheckoutStartedAt) chatCheckoutStartedAt = Date.now();
    trackChatEvent("begin_checkout", cartItemsForTracking(), cartSubtotal(), { step:"customer_details" });
    renderCheckout(); setView("checkout");
  }
  function renderCheckout() {
    const v = checkoutValues || {};
    chatView.innerHTML = viewHeader("অর্ডারের তথ্য", "কার্টে ফিরুন") +
      '<form class="hf-ai-checkout-form" id="hf-ai-checkout-form"><div class="hf-ai-checkout-intro"><strong>আপনার অর্ডার</strong><span>' +
      shoppingCart.reduce(function (n,item) { return n + item.qty; },0) + 'টি পণ্য · ' + money(cartSubtotal()) + '</span></div>' +
      '<label>আপনার নাম *<input name="name" type="text" autocomplete="name" required maxlength="80" value="' + escapeHtml(v.name || "") + '" placeholder="সম্পূর্ণ নাম লিখুন"></label>' +
      '<label>মোবাইল নম্বর *<input name="phone" type="tel" inputmode="numeric" autocomplete="tel" required maxlength="11" pattern="01[0-9]{9}" value="' + escapeHtml(v.phone || "") + '" placeholder="01XXXXXXXXX"><small>১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর</small></label>' +
      '<label>ইমেইল <span>(ঐচ্ছিক)</span><input name="email" type="email" autocomplete="email" maxlength="120" value="' + escapeHtml(v.email || "") + '" placeholder="example@gmail.com"></label>' +
      '<label>ডেলিভারি ঠিকানা *<textarea name="address" autocomplete="street-address" required minlength="5" maxlength="300" placeholder="বাড়ি, রোড, এলাকা, উপজেলা ও জেলা লিখুন">' + escapeHtml(v.address || "") + '</textarea></label>' +
      '<fieldset class="hf-ai-delivery-options"><legend>ডেলিভারি এলাকা নির্বাচন করুন *</legend>' +
      '<label><input type="radio" name="deliveryZone" value="inside_dhaka" required ' + (v.deliveryZone === "inside_dhaka" ? "checked" : "") + '><span>ঢাকার ভেতরে</span><strong>৳ ৭০</strong></label>' +
      '<label><input type="radio" name="deliveryZone" value="outside_dhaka" required ' + (v.deliveryZone === "outside_dhaka" ? "checked" : "") + '><span>ঢাকার বাইরে</span><strong>৳ ১২০</strong></label></fieldset>' +
      '<div class="hf-ai-payment-choice"><strong>পেমেন্ট: Cash on Delivery</strong><span>পণ্য হাতে পেয়ে নগদ মূল্য পরিশোধ করবেন।</span></div>' +
      '<p class="hf-ai-form-note">অর্ডার নিশ্চিত করার আগে পণ্য ও ডেলিভারি চার্জের সর্বশেষ হিসাব দেখানো হবে। আপনার তথ্য অর্ডার প্রক্রিয়া ও প্রয়োজনীয় যোগাযোগের জন্য ব্যবহৃত হবে। <a href="https://faysaltalukder.github.io/halalfood/privacy.html" target="_blank" rel="noopener noreferrer">গোপনীয়তা নীতি</a></p>' +
      '<div class="hf-ai-form-error" id="hf-ai-checkout-error" role="alert" hidden></div><button type="submit" class="hf-ai-primary-button">হিসাব দেখুন</button></form>';
  }
  async function requestChatQuote(deliveryZone) {
    const response = await fetch(CHAT_API, { method:"POST", headers:{"Content-Type":"application/json"}, cache:"no-store",
      body:JSON.stringify({ action:"quote", deliveryZone:deliveryZone, items:shoppingCart.map(function (item) { return { id:item.id, quantity:item.qty }; }) }),
      signal:AbortSignal.timeout(12000) });
    const data = await response.json().catch(function () { return {}; });
    if (!response.ok || data.success !== true) {
      const error = new Error(data.error || "পণ্যের বর্তমান হিসাব যাচাই করা যায়নি।"); error.code = data.code || "QUOTE_FAILED"; throw error;
    }
    checkoutQuote = data;
    (data.items || []).forEach(function (fresh) {
      const item = shoppingCart.find(function (row) { return row.id === fresh.id; });
      if (!item) return;
      item.name = fresh.name; item.slug = fresh.slug; item.category = fresh.category; item.unitPrice = Number(fresh.unitPrice) || 0;
      item.displayPrice = fresh.displayPrice || money(item.unitPrice); item.image_url = fresh.image_url || item.image_url;
      item.unit_type = fresh.unit_type || item.unit_type; item.qty = Number(fresh.quantity) || item.qty;
    });
    updateCartBadge(); return data;
  }
  function renderReview(message) {
    const quote = checkoutQuote; if (!quote) return;
    try { if (turnstileWidgetId !== null) window.turnstile?.remove?.(turnstileWidgetId); } catch (_) {}
    turnstileWidgetId = null; turnstileToken = "";
    const items = (quote.items || []).map(function (item) {
      return '<div class="hf-ai-review-item"><span>' + escapeHtml(item.name) + ' × ' + item.quantity + '</span><strong>' + money(item.lineTotal) + '</strong></div>';
    }).join("");
    chatView.innerHTML = viewHeader("অর্ডার যাচাই করুন", "তথ্য পরিবর্তন করুন") +
      '<div class="hf-ai-order-review">' + (message ? '<div class="hf-ai-review-notice">' + escapeHtml(message) + '</div>' : "") +
      '<div class="hf-ai-review-products">' + items + '</div><div class="hf-ai-review-row"><span>পণ্যের মূল্য</span><strong>' + money(quote.subtotal) + '</strong></div>' +
      '<div class="hf-ai-review-row"><span>ডেলিভারি চার্জ</span><strong>' + money(quote.deliveryCharge) + '</strong></div>' +
      '<div class="hf-ai-review-total"><span>সর্বমোট</span><strong>' + money(quote.total) + '</strong></div>' +
      '<div class="hf-ai-payment-choice"><strong>Cash on Delivery</strong><span>ডেলিভারির সময় নগদ পরিশোধ</span></div>' +
      '<p class="hf-ai-review-customer">' + escapeHtml(checkoutValues.name || "") + ' · ' + escapeHtml(checkoutValues.phone || "") + '<br>' + escapeHtml(checkoutValues.address || "") + '</p>' +
      '<div class="hf-ai-turnstile-wrap"><span>অর্ডার নিরাপদ রাখতে যাচাই সম্পন্ন করুন</span><div id="hf-ai-chat-turnstile"></div><small id="hf-ai-turnstile-status">নিরাপত্তা যাচাই লোড হচ্ছে...</small></div>' +
      '<div class="hf-ai-form-error" id="hf-ai-review-error" role="alert" hidden></div>' +
      '<div class="hf-ai-view-actions"><button type="button" class="hf-ai-secondary-button" data-hf-edit-checkout>তথ্য পরিবর্তন</button><button type="button" class="hf-ai-primary-button" id="hf-ai-confirm-order" data-hf-confirm-order disabled>অর্ডার নিশ্চিত করুন</button></div></div>';
    setView("review"); mountChatTurnstile();
  }
  function ensureTurnstileScript() {
    if (window.turnstile && typeof window.turnstile.render === "function") return Promise.resolve();
    if (turnstileScriptPromise) return turnstileScriptPromise;
    turnstileScriptPromise = new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; script.async = true; script.defer = true;
      script.onload = function () { if (window.turnstile && typeof window.turnstile.render === "function") resolve(); else reject(new Error("নিরাপত্তা যাচাই লোড করা যায়নি।")); };
      script.onerror = function () { reject(new Error("নিরাপত্তা যাচাই সেবা পাওয়া যাচ্ছে না।")); };
      document.head.appendChild(script);
    }).catch(function (error) { turnstileScriptPromise = null; throw error; });
    return turnstileScriptPromise;
  }
  async function mountChatTurnstile() {
    const status = chatView.querySelector("#hf-ai-turnstile-status");
    try {
      await ensureTurnstileScript();
      const container = chatView.querySelector("#hf-ai-chat-turnstile");
      if (!container || !window.turnstile) return;
      turnstileToken = "";
      turnstileWidgetId = window.turnstile.render(container, {
        sitekey:"0x4AAAAAAFsNc-yUtV-ZzFfd", theme:"light", size:"normal", appearance:"interaction-only", action:"checkout",
        callback:function (token) {
          turnstileToken = String(token || "");
          const button = chatView.querySelector("#hf-ai-confirm-order");
          if (button) button.disabled = !turnstileToken || orderSubmitting;
          if (status) status.textContent = turnstileToken ? "নিরাপত্তা যাচাই সম্পন্ন হয়েছে" : "যাচাই সম্পন্ন করুন";
        },
        "expired-callback":function () {
          turnstileToken = ""; const button = chatView.querySelector("#hf-ai-confirm-order"); if (button) button.disabled = true;
          if (status) status.textContent = "যাচাইয়ের সময় শেষ হয়েছে। আবার যাচাই করুন।";
        },
        "error-callback":function () { turnstileToken = ""; if (status) status.textContent = "যাচাইয়ে সমস্যা হয়েছে। আবার চেষ্টা করুন।"; }
      });
      if (status) status.textContent = "প্রয়োজনে নিরাপত্তা যাচাই সম্পন্ন করুন";
    } catch (error) {
      if (status) status.textContent = error.message || "নিরাপত্তা যাচাই লোড করা যায়নি।";
      const box = chatView.querySelector("#hf-ai-review-error");
      if (box) { box.hidden = false; box.textContent = "নিরাপত্তা যাচাই লোড হয়নি। পেজ রিফ্রেশ করে আবার চেষ্টা করুন।"; }
    }
  }
  function readCookie(name) {
    try { const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)")); return match ? decodeURIComponent(match[1]).slice(0,180) : ""; }
    catch (_) { return ""; }
  }
  function makeChatOrderId() {
    const a = new Uint32Array(1); crypto.getRandomValues(a); return "HF-" + String(100000 + (a[0] % 900000));
  }
  function makeChatUuid() {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16)); bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes).map(function (value) { return value.toString(16).padStart(2,"0"); }).join("");
    return hex.slice(0,8)+"-"+hex.slice(8,12)+"-"+hex.slice(12,16)+"-"+hex.slice(16,20)+"-"+hex.slice(20,32);
  }
  async function backupChatOrder(payload, result) {
    const backup = Object.assign({}, payload);
    backup.subtotal = String(Number(result.subtotal) || Number(checkoutQuote?.subtotal) || 0);
    backup.deliveryCharge = String(Number(result.deliveryCharge) || Number(checkoutQuote?.deliveryCharge) || 0);
    backup.total = String(Number(result.orderTotal) || Number(checkoutQuote?.total) || 0);
    backup.orderTotal = backup.total; backup.price = backup.total;
    backup.product = shoppingCart.map(function (item) { return item.name + " × " + item.qty; }).join(" | ");
    backup.items = shoppingCart.map(function (item) { return { product:item.name, slug:item.slug, quantity:String(item.qty), price:String(item.unitPrice), image:String(item.image_url || "") }; });
    backup.quantity = String(shoppingCart.reduce(function (n,item) { return n + item.qty; },0));
    backup.mobile = checkoutValues.phone; backup.name = checkoutValues.name; backup.email = checkoutValues.email || ""; backup.address = checkoutValues.address;
    backup.notes = [backup.notes, result.heldForReview ? "SECURITY REVIEW PENDING — please verify the customer before processing." : "Order placed through Halal Food AI chat."].filter(Boolean).join(" | ").slice(0,500);
    delete backup.turnstileToken; delete backup.expectedSubtotal; delete backup.expectedDeliveryCharge;
    try {
      const response = await fetch("https://script.google.com/macros/s/AKfycbzSf6OzjwGNBSmaZBNxBf5zL8z5wkf3tY7QtSqRUGrjZj2eWLN4DsGw1WQwkPhTqmSzrw/exec", {
        method:"POST", headers:{"Content-Type":"text/plain;charset=utf-8"}, body:JSON.stringify(backup), keepalive:true
      });
      const result = await response.json().catch(function () { return null; });
      if (!response.ok || result?.success === false) throw new Error("Google Sheets backup was not accepted.");
    } catch (error) { console.warn("Chat order saved in Supabase, but its Google Sheets backup did not complete.", error); }
  }
  async function submitChatOrder() {
    if (orderSubmitting) return;
    const errorBox = chatView.querySelector("#hf-ai-review-error"), submitButton = chatView.querySelector("#hf-ai-confirm-order");
    if (!turnstileToken) { if (errorBox) { errorBox.hidden = false; errorBox.textContent = "অর্ডার নিশ্চিত করার আগে নিরাপত্তা যাচাই সম্পন্ন করুন।"; } return; }
    if (!checkoutQuote || !shoppingCart.length) return;
    orderSubmitting = true;
    if (submitButton) { submitButton.disabled = true; submitButton.textContent = "অর্ডার পাঠানো হচ্ছে..."; }
    if (errorBox) errorBox.hidden = true;
    try {
      const previousQuote = checkoutQuote, refreshed = await requestChatQuote(checkoutValues.deliveryZone);
      const changed = Math.abs(Number(refreshed.subtotal) - Number(previousQuote.subtotal)) > 0.01 ||
        Math.abs(Number(refreshed.deliveryCharge) - Number(previousQuote.deliveryCharge)) > 0.01;
      if (changed) {
        try { if (turnstileWidgetId !== null) window.turnstile?.remove?.(turnstileWidgetId); } catch (_) {}
        turnstileWidgetId = null; turnstileToken = "";
        renderReview("পণ্যের মূল্য বা ডেলিভারি চার্জ আপডেট হয়েছে। নতুন হিসাবটি দেখে আবার নিশ্চিত করুন।"); return;
      }
      pendingOrderId = pendingOrderId || makeChatOrderId();
      const items = shoppingCart.map(function (item) { return { product:item.slug, quantity:String(item.qty), image:String(item.image_url || "") }; });
      const deviceId = (function () {
        try {
          let value = localStorage.getItem("hf_checkout_device_id_v1") || "";
          if (!/^[a-f0-9-]{20,80}$/i.test(value)) { value = makeChatUuid(); localStorage.setItem("hf_checkout_device_id_v1", value); }
          return value;
        } catch (_) { return ""; }
      })();
      const payload = {
        name:checkoutValues.name, mobile:checkoutValues.phone, email:checkoutValues.email || "", address:checkoutValues.address,
        notes:"Order placed through Halal Food AI chat.", deliveryZone:checkoutValues.deliveryZone, paymentMethod:"cash_on_delivery",
        orderId:pendingOrderId, items:items, checkoutSessionId:makeChatUuid(), honeypot:"", formStartedAt:String(chatCheckoutStartedAt || Date.now()),
        deviceId:deviceId, turnstileToken:turnstileToken, expectedSubtotal:Number(checkoutQuote.subtotal),
        expectedDeliveryCharge:Number(checkoutQuote.deliveryCharge), fbp:readCookie("_fbp"), fbc:readCookie("_fbc")
      };
      trackChatEvent("add_shipping_info", cartItemsForTracking(), Number(checkoutQuote.total), { delivery_zone:checkoutValues.deliveryZone });
      trackChatEvent("order_submit", cartItemsForTracking(), Number(checkoutQuote.total), { order_channel:"ai_chat" });
      const response = await fetch("https://qfwvrcfkrsydycbfjsxf.supabase.co/functions/v1/order-sync", {
        method:"POST", headers:{"Content-Type":"application/json"}, cache:"no-store", body:JSON.stringify(payload)
      });
      const result = await response.json().catch(function () { return {}; });
      if (!response.ok || result.success !== true) { const error = new Error(result.error || "অর্ডার নিশ্চিত করা যায়নি।"); error.code = result.code || "ORDER_FAILED"; throw error; }
      await backupChatOrder(payload, result);
      const confirmedOrderId = String(result.orderId || pendingOrderId);
      const total = Number(result.orderTotal != null ? result.orderTotal : checkoutQuote.total);
      if (result.heldForReview !== true) {
        trackChatEvent("order_success", cartItemsForTracking(), total, { order_channel:"ai_chat", order_number:confirmedOrderId });
        const pixelItems = shoppingCart.map(function (item) { return { id:item.slug, quantity:item.qty, item_price:item.unitPrice }; });
        const purchaseItems = shoppingCart.map(function (item) { return { item_id:item.slug, item_name:item.name, item_category:item.category, price:item.unitPrice, quantity:item.qty }; });
        if (result.purchaseEventId && typeof window.halalFireConfirmedMetaPurchase === "function") {
          window.halalFireConfirmedMetaPurchase({ transaction_id:confirmedOrderId, value:total, currency:"BDT", items:purchaseItems },
            { value:total, currency:"BDT", content_ids:pixelItems.map(function (item) { return item.id; }), contents:pixelItems, content_type:"product" }, result.purchaseEventId);
        }
      }
      renderOrderConfirmation(confirmedOrderId, total, result.heldForReview === true);
      // A saved order or manual-review queue entry has already consumed this checkout.
      // Clear the chat cart in both cases so a second click cannot create a duplicate order.
      shoppingCart.length = 0;
      updateCartBadge();
      pendingOrderId = ""; checkoutQuote = null; checkoutValues = {}; chatCheckoutStartedAt = 0;
    } catch (error) {
      if (error.code === "PRICE_CHANGED" || error.code === "DELIVERY_CHANGED") {
        try {
          checkoutQuote = await requestChatQuote(checkoutValues.deliveryZone);
          try { if (turnstileWidgetId !== null) window.turnstile?.remove?.(turnstileWidgetId); } catch (_) {}
          turnstileWidgetId = null; turnstileToken = "";
          renderReview("পণ্যের মূল্য বা ডেলিভারি চার্জ আপডেট হয়েছে। নতুন মোট মূল্য দেখে আবার নিশ্চিত করুন।");
        } catch (refreshError) {
          checkoutQuote = null;
          try { if (turnstileWidgetId !== null) window.turnstile?.remove?.(turnstileWidgetId); } catch (_) {}
          turnstileWidgetId = null; turnstileToken = "";
          renderCheckout();
          setView("checkout");
          renderCheckoutError("বর্তমান মূল্য যাচাই করা যাচ্ছে না। আপনার তথ্য রাখা হয়েছে। আবার হিসাব যাচাই করুন।");
        }
      } else {
        if (errorBox) { errorBox.hidden = false; errorBox.textContent = error.message || "অর্ডার পাঠাতে সমস্যা হয়েছে। তথ্য ঠিক রেখে আবার চেষ্টা করতে পারেন।"; }
        try { window.turnstile?.reset?.(turnstileWidgetId); } catch (_) {}
        turnstileToken = "";
        const status = chatView.querySelector("#hf-ai-turnstile-status"); if (status) status.textContent = "আবার নিরাপত্তা যাচাই করুন";
        if (submitButton) { submitButton.disabled = true; submitButton.textContent = "আবার চেষ্টা করুন"; }
      }
    } finally {
      orderSubmitting = false;
      const button = chatView.querySelector("#hf-ai-confirm-order");
      if (button && activeView === "review" && turnstileToken) { button.disabled = false; button.textContent = "অর্ডার নিশ্চিত করুন"; }
    }
  }
  function renderOrderConfirmation(orderId, total, heldForReview) {
    chatView.innerHTML = viewHeader(heldForReview ? "অর্ডার পর্যালোচনায়" : "অর্ডার গ্রহণ করা হয়েছে", "কথোপকথনে ফিরুন") +
      '<div class="hf-ai-order-confirmation"><div class="hf-ai-confirmation-icon">' + (heldForReview ? "!" : "✓") + '</div>' +
      '<h3>' + (heldForReview ? "আপনার অনুরোধটি নিরাপত্তা যাচাইয়ের জন্য রাখা হয়েছে" : "আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে") + '</h3>' +
      '<span>অর্ডার নম্বর</span><strong class="hf-ai-order-number">' + escapeHtml(orderId) + '</strong>' +
      '<div class="hf-ai-review-total"><span>সর্বমোট</span><strong>' + money(total) + '</strong></div>' +
      '<p>' + (heldForReview ? "নিরাপত্তা যাচাই শেষ না হওয়া পর্যন্ত অর্ডারটি নিশ্চিত হিসেবে গণ্য হবে না। প্রয়োজন হলে Halal Food টিম আপনার সঙ্গে যোগাযোগ করবে।" : "পেমেন্ট: Cash on Delivery। ধন্যবাদ, Halal Food-এর সঙ্গে থাকার জন্য।") + '</p>' +
      '<div class="hf-ai-view-actions"><button type="button" class="hf-ai-primary-button" data-hf-view-back>কথোপকথনে ফিরুন</button><button type="button" class="hf-ai-secondary-button" data-hf-chat-new>নতুন চ্যাট</button></div></div>';
    setView("confirmation");
  }
  function renderCheckoutError(message) {
    const errorBox = chatView.querySelector("#hf-ai-checkout-error");
    if (errorBox) { errorBox.hidden = false; errorBox.textContent = message; }
  }
  chatView.addEventListener("submit", async function (event) {
    if (event.target.id !== "hf-ai-checkout-form") return;
    event.preventDefault();
    const formElement = event.target;
    if (!formElement.reportValidity()) return;
    const data = new FormData(formElement);
    checkoutValues = { name:String(data.get("name") || "").trim(), phone:String(data.get("phone") || "").replace(/\D/g,""),
      email:String(data.get("email") || "").trim(), address:String(data.get("address") || "").trim(), deliveryZone:String(data.get("deliveryZone") || "") };
    if (!/^01[0-9]{9}$/.test(checkoutValues.phone)) { renderCheckoutError("সঠিক ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর লিখুন।"); return; }
    try {
      const button = formElement.querySelector('button[type="submit"]');
      if (button) { button.disabled = true; button.textContent = "হিসাব যাচাই হচ্ছে..."; }
      const quote = await requestChatQuote(checkoutValues.deliveryZone);
      trackChatEvent("add_payment_info", cartItemsForTracking(), Number(quote.total), { payment_method:"cash_on_delivery" });
      renderReview("");
    } catch (error) {
      const button = formElement.querySelector('button[type="submit"]');
      if (button) { button.disabled = false; button.textContent = "হিসাব দেখুন"; }
      renderCheckoutError(error.message || "পণ্যের বর্তমান মূল্য যাচাই করা যায়নি। আবার চেষ্টা করুন।");
    }
  });
  chatView.addEventListener("click", function (event) {
    const target = event.target, back = target.closest("[data-hf-view-back]");
    if (back) { setView("conversation"); return; }
    if (target.closest("[data-hf-open-cart]")) { renderCart(); return; }
    if (target.closest("[data-hf-add-current]")) { addCurrentProductToCart(false); return; }
    if (target.closest("[data-hf-order-current]")) { addCurrentProductToCart(true); return; }
    if (target.closest("[data-hf-detail-minus]")) { detailQuantity = Math.max(1, detailQuantity - 1); renderProductDetail(); return; }
    if (target.closest("[data-hf-detail-plus]")) { detailQuantity = Math.min(1000, detailQuantity + 1); renderProductDetail(); return; }
    if (target.closest("[data-hf-checkout]")) { openCheckout(); return; }
    if (target.closest("[data-hf-edit-checkout]")) { renderCheckout(); setView("checkout"); return; }
    if (target.closest("[data-hf-confirm-order]")) { submitChatOrder(); return; }
    if (target.closest("[data-hf-chat-new]")) { setView("conversation"); resetConversation(); return; }
    const remove = target.closest("[data-hf-cart-remove]");
    if (remove) {
      const item = shoppingCart[Number(remove.dataset.hfCartRemove)];
      if (item) trackChatEvent("remove_from_cart", [{ id:item.id, slug:item.slug, name:item.name, category:item.category, unitPrice:item.unitPrice, qty:item.qty }], item.unitPrice * item.qty, { action:"remove_item" });
      shoppingCart.splice(Number(remove.dataset.hfCartRemove),1); renderCart(false); return;
    }
    const dec = target.closest("[data-hf-cart-minus]");
    if (dec) { const item = shoppingCart[Number(dec.dataset.hfCartMinus)]; if (item) { item.qty = Math.max(1,item.qty-1); trackChatEvent("remove_from_cart", [{ id:item.id, slug:item.slug, name:item.name, category:item.category, unitPrice:item.unitPrice, qty:1 }], item.unitPrice, { action:"decrease_quantity" }); } renderCart(false); return; }
    const inc = target.closest("[data-hf-cart-plus]");
    if (inc) { const item = shoppingCart[Number(inc.dataset.hfCartPlus)]; if (item) { item.qty = Math.min(1000,item.qty+1); trackChatEvent("add_to_cart", [{ id:item.id, slug:item.slug, name:item.name, category:item.category, unitPrice:item.unitPrice, qty:1 }], item.unitPrice, { action:"increase_quantity" }); } renderCart(false); return; }
  });
  messages.addEventListener("click", function (event) {
    const detail = event.target.closest("[data-hf-product-view]");
    if (detail) { openProduct(productCatalog.get(detail.dataset.hfProductView), false); return; }
    const order = event.target.closest("[data-hf-product-order]");
    if (order) { openProduct(productCatalog.get(order.dataset.hfProductOrder), true); return; }
  });
  document.addEventListener("click", function (event) {
    const human = event.target.closest("[data-hf-human-support]");
    if (!human) return;
    const text = "আসসালামু আলাইকুম, Halal Food AI চ্যাট থেকে একজন কাস্টমার কেয়ার প্রতিনিধির সহায়তা চাই।";
    trackChatEvent("whatsapp_click", [], null, { contact_method:"whatsapp", interaction_source:"ai_chat" });
    window.open("https://wa.me/8801842031164?text=" + encodeURIComponent(text), "_blank", "noopener");
  });
  function preventViewScrollChain(event, area) {
    const max = area.scrollHeight - area.clientHeight;
    if (max <= 0 || (event.deltaY < 0 && area.scrollTop <= 0) || (event.deltaY > 0 && area.scrollTop >= max - 1)) event.preventDefault();
  }
  chatView.addEventListener("wheel", function (event) { preventViewScrollChain(event, chatView); }, { passive:false });
  let viewTouchStartY = 0;
  chatView.addEventListener("touchstart", function (event) { viewTouchStartY = event.touches[0]?.clientY || 0; }, { passive:true });
  chatView.addEventListener("touchmove", function (event) {
    const max = chatView.scrollHeight - chatView.clientHeight, y = event.touches[0]?.clientY || viewTouchStartY;
    if (max <= 0 || (y > viewTouchStartY && chatView.scrollTop <= 0) || (y < viewTouchStartY && chatView.scrollTop >= max - 1)) event.preventDefault();
  }, { passive:false });
  updateCartBadge();
  function friendlyError(data, status) {
    const code = data && data.code;
    if (code === "AI_NOT_CONFIGURED") return "AI সার্ভারে API key সেট করা নেই। আমাদের টিমকে জানান।";
    if (code === "GEMINI_AUTH") return "এই মুহূর্তে উত্তর তৈরি করতে সমস্যা হচ্ছে। অনুগ্রহ করে একটু পরে আবার চেষ্টা করুন।";
    if (code === "GEMINI_PERMISSION") return "এই মুহূর্তে উত্তর তৈরি করতে সমস্যা হচ্ছে। অনুগ্রহ করে একটু পরে আবার চেষ্টা করুন।";
    if (code === "GEMINI_MODEL" || code === "AI_MODEL_CONFIG_INVALID") return "এই মুহূর্তে সহকারী উত্তর দিতে পারছে না। একটু পরে আবার চেষ্টা করুন।";
    if (code === "GEMINI_QUOTA") return "এই মুহূর্তে উত্তর তৈরি করতে সাময়িক সমস্যা হচ্ছে। পণ্যের সাধারণ তথ্য জানতে চাইলে প্রশ্নটি আরেকভাবে লিখে দেখতে পারেন।";
    if (code === "GEMINI_UNAVAILABLE") return "এই মুহূর্তে উত্তর তৈরি করতে সাময়িক সমস্যা হচ্ছে। অনুগ্রহ করে একটু পরে আবার চেষ্টা করুন।";
    if (code === "GEMINI_TIMEOUT") return "উত্তর পেতে বেশি সময় লাগছে। অনুগ্রহ করে আবার চেষ্টা করুন.";
    if (code === "INCOMPLETE_AI_RESPONSE") return "উত্তরটি সম্পূর্ণ তৈরি হয়নি। অনুগ্রহ করে প্রশ্নটি আরেকবার পাঠান।";
    return "দুঃখিত, এই মুহূর্তে উত্তর তৈরি করতে সমস্যা হচ্ছে। অনুগ্রহ করে আবার চেষ্টা করুন।";
  }
  function clearSelectedImage() {
    selectedImageFile = null;
    if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
    selectedImageUrl = "";
    imageInput.value = "";
    imagePreview.hidden = true;
    previewImage.removeAttribute("src");
    previewName.textContent = "";
  }
  function setSelectedImage(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      appendMessage("অনুগ্রহ করে JPG, PNG অথবা WebP ছবি নির্বাচন করুন।", "assistant");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      appendMessage("ছবির আকার ৮ MB-এর মধ্যে রাখুন।", "assistant");
      return;
    }
    clearSelectedImage();
    selectedImageFile = file;
    selectedImageUrl = URL.createObjectURL(file);
    previewImage.src = selectedImageUrl;
    previewName.textContent = file.name || "আপলোড করা ছবি";
    imagePreview.hidden = false;
    inputHint.textContent = "ছবির সঙ্গে কী জানতে চান লিখুন, অথবা শুধু ছবিটিই পাঠান";
    input.focus({ preventScroll: true });
  }
  async function prepareImageForUpload(file) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1100 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("IMAGE_PROCESSING_FAILED");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    for (const quality of [0.78, 0.68, 0.58, 0.48]) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      const base64 = dataUrl.split(",")[1] || "";
      if (base64.length <= 190000) return { mimeType: "image/jpeg", data: base64 };
    }
    throw new Error("IMAGE_TOO_LARGE");
  }
  function appendUserImage(bubble, file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const image = document.createElement("img");
    image.className = "hf-ai-user-image";
    image.alt = "আপনার পাঠানো পণ্যের ছবি";
    image.src = url;
    image.onload = () => URL.revokeObjectURL(url);
    bubble.appendChild(image);
  }
  async function submitQuestion(question, options) {
    await ensureConversationReady();
    const text = String(question || "").trim();
    const imageFile = options?.image || selectedImageFile;
    if ((!text && !imageFile) || busy) return;
    const userText = text || "এই ছবির মতো বা ছবিতে থাকা পণ্যটি কি Halal Food-এ পাওয়া যায়? ছবিটি দেখে কাছাকাছি পণ্য খুঁজে দিন।";
    const userBubble = appendMessage(userText, "user");
    appendUserImage(userBubble, imageFile);
    input.value = ""; resizeComposer();
    clearSelectedImage();
    const pending = appendMessage("উত্তর তৈরি হচ্ছে", "assistant", "hf-ai-message-pending");
    busy = true;
    input.disabled = true;
    sendButton.disabled = true;
    attachButton.disabled = true;
    micButton.disabled = true;
    const requestController = new AbortController();
    const requestTimeout = window.setTimeout(() => requestController.abort(), 52000);
    try {
      const requestBody = {
        message: userText,
        conversationId: currentConversationId,
        visitorId,
        history: imageFile ? [] : conversation.slice(-20)
      };
      if (imageFile) requestBody.image = await prepareImageForUpload(imageFile);
      const response = await fetch(CHAT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: requestController.signal,
        body: JSON.stringify(requestBody)
      });
      let data = {};
      try { data = await response.json(); } catch (_parseError) {}
      pending.remove();
      if (!response.ok || !data.success || typeof data.reply !== "string") {
        appendMessage(friendlyError(data, response.status), "assistant");
      } else {
        const reply = data.reply.trim();
        const answerBubble = appendMessage(reply || "দুঃখিত, এবার উত্তর তৈরি করা যায়নি। আবার চেষ্টা করুন।", "assistant");
        appendProductCards(answerBubble, data.products, data.recommendation && data.recommendation.max_product_cards, data.recommendation && data.recommendation.match_type);
        appendFeedbackControls(answerBubble, { requestId: data.requestId, question: userText, answer: reply,
          products: Array.isArray(data.products) ? data.products : [], model: data.model || "unknown" });
        conversation.push({ role: "user", text: userText });
        conversation.push({ role: "assistant", text: reply + (Array.isArray(data.products) && data.products.length ? "\\n[Products shown: " + data.products.map(function (item) { return String(item.name || ""); }).filter(Boolean).join(", ") + "]" : "") });
        if (conversation.length > 40) conversation.splice(0, conversation.length - 40);
      }
    } catch (_error) {
      pending.remove();
      appendMessage(requestController.signal.aborted
        ? "উত্তর পেতে বেশি সময় লাগছে। সংযোগটি বন্ধ করেছি, আপনি আবার প্রশ্নটি পাঠাতে পারেন।"
        : "এই মুহূর্তে সংযোগে সমস্যা হচ্ছে। একটু পর আবার চেষ্টা করবেন?", "assistant");
    } finally {
      window.clearTimeout(requestTimeout);
      busy = false;
      input.disabled = false;
      sendButton.disabled = false;
      attachButton.disabled = false;
      micButton.disabled = false;
      resizeComposer();
      if (!panel.hidden && !minimized) input.focus({ preventScroll: true });
    }
  }

  launcher.addEventListener("click", () => {
    if (panel.hidden) openChat();
    else if (minimized) restoreChat();
    else closeChat();
  });
  closeButton.addEventListener("click", closeChat);
  minimizeButton.addEventListener("click", () => minimized ? restoreChat() : minimizeChat());
  newChatButton.addEventListener("click", () => { setView("conversation"); resetConversation(); }); bindPromptButtons();
  cartButton?.addEventListener("click", () => renderCart());
  input.addEventListener("input", resizeComposer);
  input.addEventListener("keydown", event => { if (event.key === "Enter" && !event.shiftKey && !event.isComposing) { event.preventDefault(); form.requestSubmit(); } });
  form.addEventListener("submit", event => { event.preventDefault(); submitQuestion(input.value); });
  attachButton.addEventListener("click", () => imageInput.click());
  imageInput.addEventListener("change", () => setSelectedImage(imageInput.files?.[0]));
  removeImageButton.addEventListener("click", clearSelectedImage);
  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognitionAPI) {
    speechRecognition = new SpeechRecognitionAPI();
    speechRecognition.lang = "bn-BD";
    speechRecognition.continuous = false;
    speechRecognition.interimResults = false;
    speechRecognition.onstart = () => {
      speechActive = true;
      micButton.classList.add("is-listening");
      micButton.setAttribute("aria-label", "ভয়েস রেকর্ডিং বন্ধ করুন");
      inputHint.textContent = "শুনছি... কথা শেষ হলে মাইক্রোফোনে আবার চাপ দিন";
    };
    speechRecognition.onresult = event => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index++) transcript += event.results[index][0]?.transcript || "";
      input.value = transcript.trim();
      resizeComposer();
    };
    speechRecognition.onerror = event => {
      speechActive = false;
      micButton.classList.remove("is-listening");
      inputHint.textContent = event.error === "not-allowed"
        ? "মাইক্রোফোন ব্যবহারের অনুমতি দিন, তারপর আবার চেষ্টা করুন"
        : "ভয়েস শনাক্ত করা যায়নি। আবার চেষ্টা করুন";
    };
    speechRecognition.onend = () => {
      const shouldSubmit = speechActive;
      speechActive = false;
      micButton.classList.remove("is-listening");
      micButton.setAttribute("aria-label", "ভয়েসে প্রশ্ন করুন");
      if (shouldSubmit && input.value.trim()) {
        inputHint.textContent = "আপনার কথাটি পাঠানো হচ্ছে";
        submitQuestion(input.value);
      } else if (!selectedImageFile) inputHint.textContent = "ছবি বা ভয়েস—দুটিই ঐচ্ছিক";
    };
    micButton.addEventListener("click", () => {
      if (speechActive) {
        speechRecognition.stop();
        return;
      }
      try { speechRecognition.start(); }
      catch (_) { inputHint.textContent = "মাইক্রোফোন চালু করা যাচ্ছে না। আবার চেষ্টা করুন"; }
    });
  } else {
    micButton.disabled = true;
    micButton.title = "এই ব্রাউজারে ভয়েস ইনপুট সমর্থিত নয়";
    micButton.setAttribute("aria-label", "এই ব্রাউজারে ভয়েস ইনপুট সমর্থিত নয়");
    inputHint.textContent = "ছবি বা ভয়েস ব্যবহার ঐচ্ছিক · ভয়েস ইনপুটের জন্য Chrome ব্যবহার করুন";
  }
  messages.addEventListener("wheel", event => {
    const max = messages.scrollHeight - messages.clientHeight;
    if (max <= 0 || (event.deltaY < 0 && messages.scrollTop <= 0) || (event.deltaY > 0 && messages.scrollTop >= max - 1)) event.preventDefault();
  }, { passive: false });
  panel.addEventListener("wheel", event => {
    if (event.target.closest("#hf-ai-chat-messages,#hf-ai-chat-view")) return;
    const editor = event.target.closest("#hf-ai-chat-input");
    if (editor && editor.scrollHeight > editor.clientHeight && ((event.deltaY < 0 && editor.scrollTop > 0) || (event.deltaY > 0 && editor.scrollTop < editor.scrollHeight - editor.clientHeight))) return;
    event.preventDefault();
  }, { passive: false });
  let touchStartY = 0;
  messages.addEventListener("touchstart", event => { touchStartY = event.touches[0]?.clientY || 0; }, { passive: true });
  messages.addEventListener("touchmove", event => {
    const max = messages.scrollHeight - messages.clientHeight, y = event.touches[0]?.clientY || touchStartY;
    if (max <= 0 || (y > touchStartY && messages.scrollTop <= 0) || (y < touchStartY && messages.scrollTop >= max - 1)) event.preventDefault();
  }, { passive: false });

  // Mobile bottom-dock Contact now opens the same AI chat panel.
  document.querySelectorAll('.mobile-bottom-nav a[aria-label="Contact"]').forEach(link => {
    link.dataset.hfAiChatLink = "true";
    link.href = "#hf-ai-chat-panel";
    link.setAttribute("aria-label", "Open AI chat");
    const label = link.querySelector("span:last-child");
    if (label) label.textContent = "Chat";
  });

  document.addEventListener("click", event => {
    const mobileChatLink = event.target.closest("[data-hf-ai-chat-link]");
    if (mobileChatLink) {
      event.preventDefault();
      event.stopPropagation();
      if (minimized) restoreChat(); else openChat();
      return;
    }
    if (!panel.hidden && !panel.contains(event.target) && !root.contains(event.target)) closeChat();
  }, true);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !panel.hidden) closeChat();
  });
})();