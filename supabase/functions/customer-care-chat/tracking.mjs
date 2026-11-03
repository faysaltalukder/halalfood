function toEnglishDigits(value) {
  return String(value || "").replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit)));
}

export function normalizeTrackingPhone(value) {
  const digits = toEnglishDigits(value).replace(/[^0-9]/g, "");
  if (/^01[3-9][0-9]{8}$/.test(digits)) return digits;
  if (/^8801[3-9][0-9]{8}$/.test(digits)) return "0" + digits.slice(3);
  return "";
}

export function extractTrackingOrderId(value) {
  const matches = Array.from(String(value || "").toUpperCase().matchAll(/\bHF\s*-?\s*(\d{4,6})\b/g));
  const last = matches[matches.length - 1];
  return last ? "HF-" + last[1] : "";
}

export function extractTrackingPhone(value) {
  const compact = toEnglishDigits(value).replace(/[\s().-]/g, "");
  const matches = Array.from(compact.matchAll(/(?:8801[3-9][0-9]{8}|01[3-9][0-9]{8})/g));
  return matches.length ? normalizeTrackingPhone(matches[matches.length - 1][0]) : "";
}

export function getTrackingUserMessages(historyInput = []) {
  return historyInput.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item;
    return record.role === "user" && typeof record.text === "string" ? [record.text] : [];
  });
}

const TRACKING_REQUEST_PATTERN = /(ট্র্যাক|track(?:ing)?|অর্ডারের অবস্থা|অর্ডার কোথায়|অর্ডার কোথায়|অর্ডার ট্র্যাক|আমার অর্ডার|order status|my order|shipment|শিপমেন্ট|কুরিয়ার|কুরিয়ার|courier)/iu;

export function isOrderTrackingRequest(message, historyInput = []) {
  if (TRACKING_REQUEST_PATTERN.test(String(message || ""))) return true;
  const recentUserMessages = getTrackingUserMessages(historyInput).slice(-8);
  const hasRecentTrackingRequest = recentUserMessages.some((text) => TRACKING_REQUEST_PATTERN.test(text));
  return hasRecentTrackingRequest && Boolean(extractTrackingOrderId(message) || extractTrackingPhone(message));
}

export function getOrderTrackingCredentials(message, historyInput = []) {
  const combined = [...getTrackingUserMessages(historyInput), String(message || "")].join("\n");
  return {
    orderId: extractTrackingOrderId(combined),
    mobile: extractTrackingPhone(combined),
  };
}
