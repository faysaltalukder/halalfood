(() => {
  "use strict";
  if (window.__hfCustomerCareChatInitialized) return;
  window.__hfCustomerCareChatInitialized = true;

  const ASSET_BASE = "https://faysaltalukder.github.io/halalfood/";
  const style = document.createElement("link");
  style.id = "hf-customer-care-chat-styles";
  style.rel = "stylesheet";
  style.href = ASSET_BASE + "css/customer-care-chat.css?v=20261103-ai-customer-care-ui-v1";
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

  // Clone the trigger to discard the legacy Call/WhatsApp toggle listener.
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
    '<div class="hf-ai-chat-setup-note">AI চ্যাটের সংযোগ প্রস্তুত করা হচ্ছে</div>' +
    '<div class="hf-ai-chat-messages" id="hf-ai-chat-messages" aria-live="polite">' +
      '<div class="hf-ai-message hf-ai-message-assistant"><p>আসসালামু আলাইকুম! আমি Halal Food-এর AI সহকারী। পণ্য, মূল্য, অর্ডার, ডেলিভারি অথবা আমাদের সেবা সম্পর্কে কী জানতে চান?</p><span class="hf-ai-message-time">Halal Food Assistant</span></div>' +
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
    '<div class="hf-ai-chat-footnote">ব্যক্তিগত বা পেমেন্ট-সংক্রান্ত তথ্য চ্যাটে লিখবেন না।</div>';
  document.body.appendChild(panel);

  const closeButton = panel.querySelector(".hf-ai-chat-close");
  const messages = panel.querySelector("#hf-ai-chat-messages");
  const form = panel.querySelector("#hf-ai-chat-form");
  const input = panel.querySelector("#hf-ai-chat-input");

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
  function appendMessage(text, sender) {
    const bubble = document.createElement("div");
    bubble.className = "hf-ai-message " + (sender === "user" ? "hf-ai-message-user" : "hf-ai-message-assistant");
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
  function submitQuestion(question) {
    const text = String(question || "").trim();
    if (!text) return;
    appendMessage(text, "user");
    const humanRequest = /(মানুষ|মানব|প্রতিনিধি|কাস্টমার\s*কেয়ার|কাস্টমার\s*কেয়ার|সরাসরি\s*কথা|এজেন্ট|human|real person|representative|customer support|customer care|live agent|talk to (a )?person|speak to (a )?person|whatsapp|হোয়াটসঅ্যাপ|হোয়াটসঅ্যাপ|ফোনে কথা)/i.test(text);
    if (humanRequest) {
      appendHumanSupport(appendMessage("", "assistant"));
    } else {
      appendMessage("ধন্যবাদ! চ্যাটের ইন্টারফেস প্রস্তুত হয়েছে। Gemini AI-এর উত্তর দেওয়ার সার্ভার সংযোগ এখনো সম্পন্ন হয়নি, তাই এই মুহূর্তে স্বয়ংক্রিয় উত্তর দিতে পারছি না। সংযোগ সম্পন্ন হলে এখানেই আপনার প্রশ্নের উত্তর পাবেন।", "assistant");
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
    input.value = "";
    input.focus();
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