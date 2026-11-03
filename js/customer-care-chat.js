(() => {
  "use strict";
  if (window.__hfCustomerCareChatInitialized) return;
  window.__hfCustomerCareChatInitialized = true;

  const ASSET_BASE = "https://faysaltalukder.github.io/halalfood/";
  const CHAT_API = "https://qfwvrcfkrsydycbfjsxf.supabase.co/functions/v1/customer-care-chat";
  const style = document.createElement("link");
  style.id = "hf-customer-care-chat-styles";
  style.rel = "stylesheet";
  style.href = ASSET_BASE + "css/customer-care-chat.css?v=20261103-gemini-chat-v4";
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
      '<button class="hf-ai-chat-close" type="button" aria-label="Close chat">×</button>' +
    '</header>' +
    '<div class="hf-ai-chat-setup-note" role="status">AI সহকারীর সংযোগ যাচাই করা হচ্ছে…</div>' +
    '<div class="hf-ai-chat-age-gate" id="hf-ai-chat-age-gate">' +
      '<div class="hf-ai-age-icon" aria-hidden="true">18+</div>' +
      '<h3>প্রাপ্তবয়স্কদের জন্য AI সহায়তা</h3>' +
      '<p>AI চ্যাট ব্যবহার করতে নিশ্চিত করুন যে আপনার বয়স ১৮ বছর বা তার বেশি। এখানে ব্যক্তিগত, অর্ডার, পেমেন্ট বা OTP-সংক্রান্ত তথ্য লিখবেন না।</p>' +
      '<button class="hf-ai-age-confirm" type="button">আমি নিশ্চিত করছি, আমার বয়স ১৮ বছর বা তার বেশি</button>' +
      '<div class="hf-ai-age-support"><span>AI চ্যাট ব্যবহার করতে না চাইলে</span><div class="hf-ai-human-links">' +
        '<a href="tel:+8801842031164">ফোন করুন</a><a href="https://wa.me/8801842031164" target="_blank" rel="noopener noreferrer">WhatsApp</a>' +
      '</div></div>' +
    '</div>' +
    '<div class="hf-ai-chat-content" id="hf-ai-chat-content" hidden>' +
      '<div class="hf-ai-chat-messages" id="hf-ai-chat-messages" aria-live="polite">' +
        '<div class="hf-ai-message hf-ai-message-assistant"><p>আসসালামু আলাইকুম! আমি Halal Food-এর AI সহকারী। পণ্য, ওয়েবসাইট বা সাধারণ সেবা সম্পর্কে কী জানতে চান?</p><span class="hf-ai-message-time">Halal Food Assistant</span></div>' +
        '<div class="hf-ai-chat-prompts" aria-label="সাধারণ প্রশ্ন">' +
          '<button type="button" data-hf-chat-prompt="আমি কী কী পণ্য পেতে পারি?">কী কী পণ্য পাওয়া যায়?</button>' +
          '<button type="button" data-hf-chat-prompt="ডেলিভারি সম্পর্কে জানতে চাই।">ডেলিভারি সম্পর্কে জানতে চাই</button>' +
          '<button type="button" data-hf-chat-prompt="ওয়েবসাইটে কীভাবে অর্ডার করব?">কীভাবে অর্ডার করব?</button>' +
        '</div>' +
      '</div>' +
      '<form class="hf-ai-chat-composer" id="hf-ai-chat-form">' +
        '<label class="hf-ai-chat-input-wrap"><span class="hf-ai-visually-hidden">আপনার প্রশ্ন লিখুন</span><input id="hf-ai-chat-input" name="message" type="text" maxlength="1000" autocomplete="off" placeholder="আপনার প্রশ্ন লিখুন..." required></label>' +
        '<button class="hf-ai-chat-send" type="submit" aria-label="Send message"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 3-7.2 18-3.7-7.1L3 10.2 21 3Z"></path><path d="M10.1 13.9 21 3"></path></svg></button>' +
      '</form>' +
      '<div class="hf-ai-chat-footnote">AI উত্তর ভুল হতে পারে। বর্তমান মূল্য, স্টক, অর্ডার ও ডেলিভারি মানব সহায়তায় নিশ্চিত করুন। ব্যক্তিগত বা পেমেন্ট-সংক্রান্ত তথ্য পাঠাবেন না।</div>' +
    '</div>';
  document.body.appendChild(panel);

  const closeButton = panel.querySelector(".hf-ai-chat-close");
  const setupNote = panel.querySelector(".hf-ai-chat-setup-note");
  const ageGate = panel.querySelector("#hf-ai-chat-age-gate");
  const ageConfirm = panel.querySelector(".hf-ai-age-confirm");
  const chatContent = panel.querySelector("#hf-ai-chat-content");
  const messages = panel.querySelector("#hf-ai-chat-messages");
  const form = panel.querySelector("#hf-ai-chat-form");
  const input = panel.querySelector("#hf-ai-chat-input");
  const sendButton = panel.querySelector(".hf-ai-chat-send");
  const conversation = [];
  let ageConfirmed = false;
  let busy = false;

  function openChat() {
    panel.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    launcher.setAttribute("aria-label", "Close Halal Food AI chat");
    window.setTimeout(() => {
      if (!ageConfirmed) ageConfirm?.focus({ preventScroll: true });
      else input?.focus({ preventScroll: true });
    }, 50);
  }
  function closeChat() {
    panel.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("aria-label", "Open Halal Food AI chat");
  }
  function appendMessage(text, sender, extraClass) {
    const bubble = document.createElement("div");
    bubble.className = "hf-ai-message " + (sender === "user" ? "hf-ai-message-user" : "hf-ai-message-assistant") + (extraClass ? " " + extraClass : "");
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    bubble.appendChild(paragraph);
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
    return bubble;
  }
  function appendHumanSupport(bubble) {
    const copy = document.createElement("p");
    copy.textContent = "অবশ্যই। সরাসরি আমাদের টিমের সঙ্গে যোগাযোগ করতে পারেন:";
    bubble.appendChild(copy);
    const links = document.createElement("div");
    links.className = "hf-ai-human-links";
    const call = document.createElement("a");
    call.href = "tel:+8801842031164";
    call.textContent = "ফোন করুন · 01842-031164";
    const whatsapp = document.createElement("a");
    whatsapp.href = "https://wa.me/8801842031164";
    whatsapp.target = "_blank";
    whatsapp.rel = "noopener noreferrer";
    whatsapp.textContent = "WhatsApp-এ মেসেজ করুন";
    links.append(call, whatsapp);
    bubble.appendChild(links);
    messages.scrollTop = messages.scrollHeight;
  }
  function friendlyError(data, status) {
    const code = data && data.code;
    if (code === "RATE_LIMITED") return "চ্যাট সার্ভার সাময়িকভাবে অনুরোধ গ্রহণ করতে পারেনি। অনুগ্রহ করে আবার চেষ্টা করুন।";
    if (code === "AI_NOT_CONFIGURED") return "AI সার্ভারে API key সেট করা নেই। আমাদের টিমকে জানান।";
    if (code === "GEMINI_AUTH") return "Google AI সার্ভারের API key যাচাই হয়নি। সার্ভার কনফিগারেশন পরীক্ষা করা হচ্ছে।";
    if (code === "GEMINI_PERMISSION") return "Google AI প্রজেক্টে API ব্যবহারের অনুমতি বা billing/quota সেটিংসে সমস্যা আছে।";
    if (code === "GEMINI_MODEL" || code === "AI_MODEL_CONFIG_INVALID") return "AI মডেলের নাম বা কনফিগারেশনে সমস্যা আছে।";
    if (code === "GEMINI_QUOTA") return "Google AI-এর প্রকল্প-স্তরের API quota বা সাময়িক capacity সীমায় পৌঁছেছে। এটি আপনার প্রশ্নের সংখ্যার জন্য আমাদের চ্যাট-লক নয়। কিছুক্ষণ পরে আবার চেষ্টা করুন, অথবা WhatsApp-এ যোগাযোগ করুন।";
    if (code === "GEMINI_UNAVAILABLE") return "AI মডেলগুলো এই মুহূর্তে ব্যস্ত বা সাময়িকভাবে অনুপলব্ধ। আপনার প্রশ্ন সংরক্ষণ করা হয়নি—অনুগ্রহ করে আবার পাঠান বা WhatsApp-এ যোগাযোগ করুন।";
    if (code === "GEMINI_TIMEOUT") return "উত্তর পেতে বেশি সময় লাগছে। অনুগ্রহ করে আবার চেষ্টা করুন.";
    if (code === "INCOMPLETE_AI_RESPONSE") return "উত্তরটি সম্পূর্ণ তৈরি হয়নি। অনুগ্রহ করে প্রশ্নটি আরেকবার পাঠান।";
    return "দুঃখিত, AI সহকারীর সঙ্গে সাময়িক সংযোগ সমস্যা হয়েছে। আবার চেষ্টা করুন অথবা ফোন/WhatsApp-এ যোগাযোগ করুন।";
  }
  async function checkServer() {
    try {
      const response = await fetch(CHAT_API, { method: "GET", cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success || !data.configured) {
        setupNote.textContent = "AI সার্ভার প্রস্তুত নয়। ফোন বা WhatsApp-এ সহায়তা নিন।";
        return;
      }
      setupNote.textContent = "সংযুক্ত · " + (data.model || "Gemini AI") + " · ১৮+ ব্যবহারকারীদের জন্য";
    } catch (_error) {
      setupNote.textContent = "AI সার্ভারের সঙ্গে সংযোগ করা যাচ্ছে না। ফোন বা WhatsApp-এ সহায়তা নিন।";
    }
  }
  async function submitQuestion(question) {
    const text = String(question || "").trim();
    if (!text || busy || !ageConfirmed) return;
    appendMessage(text, "user");
    input.value = "";
    const humanRequest = /(মানুষ|মানব|প্রতিনিধি|কাস্টমার\s*কেয়ার|কাস্টমার\s*কেয়ার|সরাসরি\s*কথা|এজেন্ট|human|real person|representative|customer support|customer care|live agent|talk to (a )?person|speak to (a )?person|whatsapp|হোয়াটসঅ্যাপ|হোয়াটসঅ্যাপ|ফোনে কথা)/i.test(text);
    if (humanRequest) {
      appendHumanSupport(appendMessage("", "assistant"));
      return;
    }

    const pending = appendMessage("উত্তর তৈরি হচ্ছে…", "assistant", "hf-ai-message-pending");
    busy = true;
    input.disabled = true;
    sendButton.disabled = true;
    try {
      const response = await fetch(CHAT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          message: text,
          history: conversation.slice(-8),
          ageConfirmed: true
        })
      });
      let data = {};
      try { data = await response.json(); } catch (_parseError) {}
      pending.remove();
      if (!response.ok || !data.success || typeof data.reply !== "string") {
        appendMessage(friendlyError(data, response.status), "assistant");
      } else {
        const reply = data.reply.trim();
        appendMessage(reply || "দুঃখিত, এবার উত্তর তৈরি করা যায়নি। আবার চেষ্টা করুন।", "assistant");
        conversation.push({ role: "user", text: text });
        conversation.push({ role: "assistant", text: reply });
        if (conversation.length > 12) conversation.splice(0, conversation.length - 12);
      }
    } catch (_error) {
      pending.remove();
      appendMessage("সার্ভারের সঙ্গে সংযোগ বিচ্ছিন্ন হয়েছে। ইন্টারনেট পরীক্ষা করে আবার চেষ্টা করুন।", "assistant");
    } finally {
      busy = false;
      input.disabled = false;
      sendButton.disabled = false;
      input.focus();
    }
  }

  launcher.addEventListener("click", () => {
    if (panel.hidden) openChat();
    else closeChat();
  });
  closeButton.addEventListener("click", closeChat);
  ageConfirm.addEventListener("click", () => {
    ageConfirmed = true;
    ageGate.hidden = true;
    chatContent.hidden = false;
    setupNote.textContent = "AI সার্ভারের সঙ্গে সংযোগ করা হচ্ছে…";
    checkServer();
    input.focus();
  });
  panel.querySelectorAll("[data-hf-chat-prompt]").forEach(button => {
    button.addEventListener("click", () => submitQuestion(button.getAttribute("data-hf-chat-prompt")));
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    submitQuestion(input.value);
  });

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
      openChat();
      return;
    }
    if (!panel.hidden && !panel.contains(event.target) && !root.contains(event.target)) closeChat();
  }, true);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !panel.hidden) closeChat();
  });
})();