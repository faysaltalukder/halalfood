(() => {
  "use strict";
  if (window.__hfCustomerCareChatInitialized) return;
  window.__hfCustomerCareChatInitialized = true;

  const ASSET_BASE = "https://faysaltalukder.github.io/halalfood/";
  const CHAT_API = "https://qfwvrcfkrsydycbfjsxf.supabase.co/functions/v1/customer-care-chat";
  const style = document.createElement("link");
  style.id = "hf-customer-care-chat-styles";
  style.rel = "stylesheet";
  style.href = ASSET_BASE + "css/customer-care-chat.css?v=20261103-ai-chat-friendly-v1";
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
    '<div class="hf-ai-chat-content" id="hf-ai-chat-content">' +
      '<div class="hf-ai-chat-messages" id="hf-ai-chat-messages" aria-live="polite">' +
        '<div class="hf-ai-message hf-ai-message-assistant"><p>আসসালামু আলাইকুম! Halal Food-এ স্বাগতম। কী খুঁজছেন বা কীভাবে সাহায্য করতে পারি?</p><span class="hf-ai-message-time">Halal Food Assistant</span></div>' +
        '<div class="hf-ai-chat-prompts" aria-label="সাধারণ প্রশ্ন">' +
          '<button type="button" data-hf-chat-prompt="আমি কী কী পণ্য পেতে পারি?">কী কী পণ্য পাওয়া যায়?</button>' +
          '<button type="button" data-hf-chat-prompt="ডেলিভারি সম্পর্কে জানতে চাই।">ডেলিভারি সম্পর্কে জানতে চাই</button>' +
          '<button type="button" data-hf-chat-prompt="ওয়েবসাইটে কীভাবে অর্ডার করব?">কীভাবে অর্ডার করব?</button>' +
        '</div>' +
      '</div>' +
      '<form class="hf-ai-chat-composer" id="hf-ai-chat-form">' +
        '<label class="hf-ai-chat-input-wrap"><span class="hf-ai-visually-hidden">আপনার প্রশ্ন লিখুন</span><input id="hf-ai-chat-input" name="message" type="text" autocomplete="off" placeholder="আপনার প্রশ্ন লিখুন..." required></label>' +
        '<button class="hf-ai-chat-send" type="submit" aria-label="Send message"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 3-7.2 18-3.7-7.1L3 10.2 21 3Z"></path><path d="M10.1 13.9 21 3"></path></svg></button>' +
      '</form>' +
      '<div class="hf-ai-chat-footnote">পণ্য, মূল্য, স্টক ও সেবা সম্পর্কে যেকোনো প্রশ্ন করুন।</div>' +
    '</div>';
  document.body.appendChild(panel);

  const closeButton = panel.querySelector(".hf-ai-chat-close");
  const chatContent = panel.querySelector("#hf-ai-chat-content");
  const messages = panel.querySelector("#hf-ai-chat-messages");
  const form = panel.querySelector("#hf-ai-chat-form");
  const input = panel.querySelector("#hf-ai-chat-input");
  const sendButton = panel.querySelector(".hf-ai-chat-send");
  const conversation = [];
  let busy = false;

  function openChat() {
    panel.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    launcher.setAttribute("aria-label", "Close Halal Food AI chat");
    window.setTimeout(() => input?.focus({ preventScroll: true }), 50);
  }
  function closeChat() {
    panel.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("aria-label", "Open Halal Food AI chat");
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
  function appendMessage(text, sender, extraClass) {
    const bubble = document.createElement("div");
    bubble.className = "hf-ai-message " + (sender === "user" ? "hf-ai-message-user" : "hf-ai-message-assistant") + (extraClass ? " " + extraClass : "");
    const paragraph = document.createElement("p");
    paragraph.textContent = sender === "assistant" ? cleanAssistantText(text) : text;
    bubble.appendChild(paragraph);
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
    return bubble;
  }
  function appendProductCards(bubble, products) {
    if (!Array.isArray(products) || !products.length) return;
    const wrap = document.createElement("div");
    wrap.className = "hf-ai-product-cards";
    products.slice(0, 3).forEach(product => {
      if (!product || typeof product.name !== "string" || typeof product.product_url !== "string") return;
      let url;
      try { url = new URL(product.product_url, ASSET_BASE); } catch (_) { return; }
      const site = new URL(ASSET_BASE);
      if (url.origin !== site.origin || !url.pathname.startsWith("/halalfood/")) return;
      const link = document.createElement("a");
      link.className = "hf-ai-product-card";
      link.href = url.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      const imageUrl = typeof product.image_url === "string" ? product.image_url : "";
      if (/^https:\/\//i.test(imageUrl)) {
        const image = document.createElement("img");
        image.src = imageUrl;
        image.alt = "";
        image.loading = "lazy";
        image.referrerPolicy = "no-referrer";
        link.appendChild(image);
      }
      const copy = document.createElement("span");
      copy.className = "hf-ai-product-card-copy";
      const name = document.createElement("strong");
      name.textContent = product.name;
      const price = document.createElement("span");
      price.textContent = String(product.price || "দাম যাচাই প্রয়োজন");
      const meta = document.createElement("small");
      meta.textContent = [product.category, product.availability === "available" ? "তালিকায় উপলভ্য" : product.availability === "unavailable" ? "বর্তমানে অনুপলব্ধ" : "স্টক নিশ্চিত করতে হবে"].filter(Boolean).join(", ");
      copy.append(name, price, meta);
      link.appendChild(copy);
      wrap.appendChild(link);
    });
    if (wrap.children.length) {
      bubble.appendChild(wrap);
      messages.scrollTop = messages.scrollHeight;
    }
  }

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
  async function submitQuestion(question) {
    const text = String(question || "").trim();
    if (!text || busy) return;
    appendMessage(text, "user");
    input.value = "";
    const pending = appendMessage("একটু দেখছি", "assistant", "hf-ai-message-pending");
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
          history: conversation.slice(-20)
        })
      });
      let data = {};
      try { data = await response.json(); } catch (_parseError) {}
      pending.remove();
      if (!response.ok || !data.success || typeof data.reply !== "string") {
        appendMessage(friendlyError(data, response.status), "assistant");
      } else {
        const reply = data.reply.trim();
        const answerBubble = appendMessage(reply || "দুঃখিত, এবার উত্তর তৈরি করা যায়নি। আবার চেষ্টা করুন।", "assistant");
        appendProductCards(answerBubble, data.products);
        conversation.push({ role: "user", text: text });
        conversation.push({ role: "assistant", text: reply });
        if (conversation.length > 40) conversation.splice(0, conversation.length - 40);
      }
    } catch (_error) {
      pending.remove();
      appendMessage("এই মুহূর্তে সংযোগে সমস্যা হচ্ছে। একটু পর আবার চেষ্টা করবেন?", "assistant");
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