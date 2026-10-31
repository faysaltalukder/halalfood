(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const nowLocalInput = () => {
    const date = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    return date.toISOString().slice(0, 16);
  };
  const dateInputValue = value => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const normalizePhone = value => {
    let digits = String(value || "").replace(/\D/g, "");
    if (digits.startsWith("00880")) digits = "0" + digits.slice(5);
    else if (digits.startsWith("880")) digits = "0" + digits.slice(3);
    return /^01\d{9}$/.test(digits) ? digits : "";
  };
  const moneyText = value => "৳" + Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 });
  const phoneMask = value => {
    const phone = normalizePhone(value) || String(value || "");
    return phone.length >= 8 ? phone.slice(0, 4) + "•••" + phone.slice(-2) : "—";
  };
  const prettyStatus = value => String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1);
  const statusOf = (coupon, used) => {
    if (coupon.status !== "active") return coupon.status;
    const now = Date.now();
    if (coupon.ends_at && new Date(coupon.ends_at).getTime() <= now) return "expired";
    if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) return "scheduled";
    if (coupon.usage_limit !== null && coupon.usage_limit !== undefined && used >= Number(coupon.usage_limit)) return "exhausted";
    return "active";
  };
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
  const codeFromEntropy = () => {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return "HALAL-" + Array.from(bytes).map(v => v.toString(16).padStart(2, "0")).join("").toUpperCase();
  };

  window.HFCouponsInit = async () => {
    const H = window.HFAdmin;
    if (!H) throw new Error("Secure admin access is not ready.");
    const { client, toast, audit, signedQuery, money, dateTime, makeStatus, downloadFile, csvText } = H;

    let coupons = [];
    let categories = [];
    let products = [];
    let customers = [];
    let categoryLinks = [];
    let productLinks = [];
    let customerLinks = [];
    let redemptions = [];
    let currentEdit = null;
    let isLoading = false;
    let selectedCategoryIds = [];
    let selectedProductIds = [];
    let selectedCustomerPhones = [];

    const countedUses = couponId => redemptions.filter(r =>
      r.coupon_id === couponId && ["reserved", "redeemed"].includes(r.status)
    ).length;
    const redeemedUses = couponId => redemptions.filter(r =>
      r.coupon_id === couponId && r.status === "redeemed"
    ).length;
    const redeemedDiscount = couponId => redemptions
      .filter(r => r.coupon_id === couponId && r.status === "redeemed")
      .reduce((sum, r) => sum + Number(r.discount_amount || 0), 0);
    const catIdsFor = couponId => categoryLinks.filter(r => r.coupon_id === couponId).map(r => r.category_id);
    const productIdsFor = couponId => productLinks.filter(r => r.coupon_id === couponId).map(r => r.product_id);
    const phonesFor = couponId => customerLinks.filter(r => r.coupon_id === couponId).map(r => r.customer_phone);

    function couponScope(coupon) {
      if (coupon.applies_to === "categories") {
        const selected = categories.filter(c => catIdsFor(coupon.id).includes(c.id)).map(c => c.name);
        return selected.length ? selected.join(", ") : "Selected categories";
      }
      if (coupon.applies_to === "products") {
        const selected = products.filter(p => productIdsFor(coupon.id).includes(p.id)).map(p => p.name);
        return selected.length ? selected.join(", ") : "Selected products";
      }
      return "All active products";
    }

    function renderMetrics() {
      const count = coupons.length;
      const active = coupons.filter(c => ["active", "scheduled"].includes(statusOf(c, countedUses(c.id)))).length;
      const redeemed = redemptions.filter(r => r.status === "redeemed").length;
      const discount = redemptions.filter(r => r.status === "redeemed").reduce((sum, r) => sum + Number(r.discount_amount || 0), 0);
      $("couponMetricTotal").textContent = count.toLocaleString("en-BD");
      $("couponMetricActive").textContent = active.toLocaleString("en-BD");
      $("couponMetricRedeemed").textContent = redeemed.toLocaleString("en-BD");
      $("couponMetricDiscount").textContent = moneyText(discount);
      $("couponListCount").textContent = count.toLocaleString("en-BD");
    }

    function renderCouponRows() {
      const body = $("couponTableBody");
      const query = String($("couponSearch")?.value || "").trim().toLowerCase();
      const selectedStatus = $("couponStatusFilter")?.value || "all";
      const filtered = coupons.filter(c => {
        const status = statusOf(c, countedUses(c.id));
        const matchesQuery = !query || String(c.name || "").toLowerCase().includes(query) || String(c.code || "").toLowerCase().includes(query);
        return matchesQuery && (selectedStatus === "all" || status === selectedStatus);
      });
      if (!filtered.length) {
        body.innerHTML = '<tr><td colspan="7"><div class="cp-empty">No coupon campaigns match this view. Create a coupon to start your first offer.</div></td></tr>';
        return;
      }
      body.innerHTML = filtered.map(c => {
        const used = countedUses(c.id);
        const redeemed = redeemedUses(c.id);
        const status = statusOf(c, used);
        const limit = c.usage_limit === null ? "Unlimited" : Number(c.usage_limit).toLocaleString("en-BD");
        const usedLabel = used.toLocaleString("en-BD") + " / " + limit;
        const percent = c.usage_limit ? Math.min(100, Math.round(used / Number(c.usage_limit) * 100)) : 0;
        const discount = c.discount_type === "percentage"
          ? Number(c.discount_value).toLocaleString("en-BD", { maximumFractionDigits: 2 }) + "%"
          : moneyText(c.discount_value);
        const validity = (c.starts_at ? "Starts " + dateTime(c.starts_at) : "Starts now") +
          (c.ends_at ? "<br>Ends " + dateTime(c.ends_at) : "<br>No expiry");
        const canEdit = c.status !== "archived";
        const primaryAction = status === "active" || status === "scheduled"
          ? '<button type="button" class="cp-action" data-action="pause">Pause</button>'
          : (["paused", "draft"].includes(c.status) ? '<button type="button" class="cp-action" data-action="resume">Activate</button>' : "");
        return '<tr data-coupon-id="' + escapeHtml(c.id) + '">' +
          '<td><span class="cp-campaign-name">' + escapeHtml(c.name) + '</span><span class="cp-code">' + escapeHtml(c.code) + '<button class="cp-code-copy" type="button" data-action="copy" title="Copy coupon code" aria-label="Copy coupon code">⧉</button></span>' +
          '<span class="cp-cell-sub">' + escapeHtml(c.description || "Promotion campaign") + '</span></td>' +
          '<td><span class="cp-discount-value">' + escapeHtml(discount) + '</span>' +
          (c.discount_type === "percentage" && c.max_discount_amount ? '<span class="cp-cell-sub">Max ' + escapeHtml(moneyText(c.max_discount_amount)) + '</span>' : "") +
          '<span class="cp-cell-sub">Min ' + escapeHtml(moneyText(c.minimum_order_amount)) + '</span></td>' +
          '<td><span class="cp-scope-text">' + escapeHtml(couponScope(c)) + '</span>' +
          '<span class="cp-cell-sub">' + (c.customer_eligibility === "first_order" ? "First order" : c.customer_eligibility === "selected" ? phonesFor(c.id).length + " selected customers" : "All customers") + '</span></td>' +
          '<td><span class="cp-usage-text">' + escapeHtml(usedLabel) + '</span>' +
          '<div class="cp-usage-bar"><span style="width:' + percent + '%"></span></div><span class="cp-cell-sub">' + redeemed + ' delivered · ' + (used - redeemed) + ' pending</span></td>' +
          '<td><span class="cp-validity">' + validity + '</span></td>' +
          '<td><span class="cp-status cp-status-' + status + '">' + prettyStatus(status) + '</span></td>' +
          '<td><div class="cp-actions">' +
          '<button type="button" class="cp-action" data-action="details">View</button>' +
          (canEdit ? '<button type="button" class="cp-action" data-action="edit">Edit</button>' : '') +
          primaryAction +
          '<button type="button" class="cp-action" data-action="duplicate">Duplicate</button>' +
          (c.status !== "archived" ? '<button type="button" class="cp-action cp-action-danger" data-action="archive">Archive</button>' : '') +
          '</div></td></tr>';
      }).join("");
    }

    function setTab(tab) {
      const list = tab === "list";
      $("couponListPanel").hidden = !list;
      $("couponFormPanel").hidden = list;
      $("couponListTab").classList.toggle("is-active", list);
      $("couponAddTab").classList.toggle("is-active", !list);
      $("couponListTab").setAttribute("aria-selected", String(list));
      $("couponAddTab").setAttribute("aria-selected", String(!list));
      if (!list) $("couponName").focus({ preventScroll: true });
    }

    function selectedCheckboxValues(containerId) {
      return [...$(containerId).querySelectorAll('input[type="checkbox"]:checked')].map(node => node.value);
    }

    function renderCategoryPicker(selected = selectedCategoryIds) {
      const container = $("couponCategoryPicker");
      const available = categories.filter(c => c.is_active !== false);
      container.innerHTML = available.length ? available.map(c =>
        '<label class="cp-check-option"><input type="checkbox" value="' + escapeHtml(c.id) + '"' +
        (selected.includes(c.id) ? " checked" : "") + '><span>' + escapeHtml(c.name) + '</span></label>'
      ).join("") : '<span class="cp-muted">No active categories available.</span>';
    }

    function renderProductPicker(selected = selectedProductIds) {
      const query = String($("couponProductSearch")?.value || "").trim().toLowerCase();
      const available = products.filter(p => p.is_active !== false && (
        !query || String(p.name || "").toLowerCase().includes(query) ||
        String(p.slug || "").toLowerCase().includes(query) ||
        String(p.category || "").toLowerCase().includes(query)
      )).slice(0, 350);
      $("couponProductPicker").innerHTML = available.length ? available.map(p =>
        '<label class="cp-check-option"><input type="checkbox" value="' + escapeHtml(p.id) + '"' +
        (selected.includes(p.id) ? " checked" : "") + '><span>' + escapeHtml(p.name) +
        '<small>' + escapeHtml(p.category || p.category_slug || "Uncategorised") + ' · ' + escapeHtml(moneyText(p.price)) + '</small></span></label>'
      ).join("") : '<span class="cp-muted">No matching active products found.</span>';
    }

    function renderCustomerPicker(selected = selectedCustomerPhones) {
      const query = String($("couponCustomerSearch")?.value || "").trim().toLowerCase();
      const available = customers.filter(c =>
        !query || String(c.name || "").toLowerCase().includes(query) ||
        String(c.phone || "").toLowerCase().includes(query)
      ).slice(0, 250);
      $("couponCustomerPicker").innerHTML = available.length ? available.map(c => {
        const phone = normalizePhone(c.phone);
        if (!phone) return "";
        return '<label class="cp-check-option"><input type="checkbox" value="' + escapeHtml(phone) + '"' +
          (selected.includes(phone) ? " checked" : "") + '><span>' + escapeHtml(c.name || "Customer") +
          '<small>' + escapeHtml(phone) + '</small></span></label>';
      }).join("") : '<span class="cp-muted">No matching customer record found. You can still enter a mobile number below.</span>';
    }

    function updateConditionalFields() {
      const scope = $("couponAppliesTo").value;
      $("couponCategoryPanel").hidden = scope !== "categories";
      $("couponProductPanel").hidden = scope !== "products";
      $("couponCustomerPanel").hidden = $("couponCustomerEligibility").value !== "selected";
      const percentage = $("couponDiscountType").value === "percentage";
      $("couponMaxDiscountField").hidden = !percentage;
      $("couponDiscountValue").max = percentage ? "100" : "";
    }

    function resetForm() {
      $("couponForm").reset();
      selectedCategoryIds = [];
      selectedProductIds = [];
      selectedCustomerPhones = [];
      $("couponId").value = "";
      $("couponFormHeading").textContent = "Create a coupon";
      $("couponSaveBtn").textContent = "Save coupon";
      $("couponFormError").textContent = "";
      $("couponCode").disabled = false;
      $("couponCode").value = "";
      $("couponStatus").value = "draft";
      $("couponDiscountType").value = "percentage";
      $("couponDiscountValue").value = "10";
      $("couponMinimumOrder").value = "0";
      $("couponPerCustomerLimit").value = "1";
      $("couponUsageLimit").value = "";
      $("couponMaxDiscount").value = "";
      $("couponDescription").value = "";
      $("couponCustomerPhones").value = "";
      $("couponStartsAt").value = nowLocalInput();
      $("couponEndsAt").value = "";
      $("couponAppliesTo").value = "all";
      $("couponCustomerEligibility").value = "all";
      renderCategoryPicker([]);
      renderProductPicker([]);
      renderCustomerPicker([]);
      updateConditionalFields();
      currentEdit = null;
    }

    function setFormFromCoupon(coupon, duplicate = false) {
      const id = coupon.id;
      const selectedCategories = catIdsFor(id);
      const selectedProducts = productIdsFor(id);
      const selectedPhones = phonesFor(id);
      resetForm();
      selectedCategoryIds = duplicate ? [] : selectedCategories.slice();
      selectedProductIds = duplicate ? [] : selectedProducts.slice();
      selectedCustomerPhones = duplicate ? [] : selectedPhones.slice();
      currentEdit = duplicate ? null : coupon;
      $("couponId").value = duplicate ? "" : coupon.id;
      $("couponName").value = duplicate ? "Copy of " + coupon.name : coupon.name;
      $("couponCode").value = duplicate ? codeFromEntropy() : coupon.code;
      $("couponCode").disabled = !duplicate && countedUses(coupon.id) > 0;
      $("couponDescription").value = coupon.description || "";
      $("couponDiscountType").value = coupon.discount_type;
      $("couponDiscountValue").value = coupon.discount_value;
      $("couponMaxDiscount").value = coupon.max_discount_amount ?? "";
      $("couponMinimumOrder").value = coupon.minimum_order_amount ?? 0;
      $("couponAppliesTo").value = coupon.applies_to;
      $("couponCustomerEligibility").value = coupon.customer_eligibility;
      $("couponUsageLimit").value = coupon.usage_limit ?? "";
      $("couponPerCustomerLimit").value = coupon.per_customer_limit ?? 1;
      $("couponStartsAt").value = duplicate ? nowLocalInput() : dateInputValue(coupon.starts_at);
      $("couponEndsAt").value = duplicate ? "" : dateInputValue(coupon.ends_at);
      $("couponStatus").value = duplicate ? "draft" : coupon.status;
      $("couponCustomerPhones").value = duplicate ? "" : selectedPhones.join("\n");
      renderCategoryPicker(duplicate ? [] : selectedCategories);
      renderProductPicker(duplicate ? [] : selectedProducts);
      renderCustomerPicker(duplicate ? [] : selectedPhones);
      $("couponFormHeading").textContent = duplicate ? "Duplicate campaign" : "Edit coupon";
      $("couponSaveBtn").textContent = duplicate ? "Save as new coupon" : "Save changes";
      if (duplicate) $("couponCode").disabled = false;
      $("couponFormError").textContent = "";
      updateConditionalFields();
      setTab("form");
    }

    function phonesFromForm() {
      const manual = String($("couponCustomerPhones").value || "").split(/[\n,;]+/).map(normalizePhone).filter(Boolean);
      return [...new Set([...selectedCustomerPhones.map(normalizePhone).filter(Boolean), ...manual])];
    }

    function formPayload() {
      const code = String($("couponCode").value || "").trim().toUpperCase().replace(/\s+/g, "");
      const startsAtRaw = $("couponStartsAt").value;
      const endsAtRaw = $("couponEndsAt").value;
      const discountType = $("couponDiscountType").value;
      const customerEligibility = $("couponCustomerEligibility").value;
      return {
        id: $("couponId").value || null,
        name: String($("couponName").value || "").trim(),
        code,
        description: String($("couponDescription").value || "").trim(),
        discount_type: discountType,
        discount_value: Number($("couponDiscountValue").value),
        max_discount_amount: discountType === "percentage" && $("couponMaxDiscount").value !== "" ? Number($("couponMaxDiscount").value) : null,
        minimum_order_amount: Number($("couponMinimumOrder").value || 0),
        applies_to: $("couponAppliesTo").value,
        category_ids: selectedCategoryIds.slice(),
        product_ids: selectedProductIds.slice(),
        customer_eligibility: customerEligibility,
        customer_phones: customerEligibility === "selected" ? phonesFromForm() : [],
        usage_limit: $("couponUsageLimit").value === "" ? null : Number($("couponUsageLimit").value),
        per_customer_limit: Number($("couponPerCustomerLimit").value),
        starts_at: startsAtRaw ? new Date(startsAtRaw).toISOString() : null,
        ends_at: endsAtRaw ? new Date(endsAtRaw).toISOString() : null,
        status: $("couponStatus").value
      };
    }

    function validateFormPayload(payload) {
      if (payload.name.length < 2) return "Enter a campaign name.";
      if (!/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(payload.code)) return "Coupon code must be 3–40 letters, numbers, hyphens or underscores.";
      if (!Number.isFinite(payload.discount_value) || payload.discount_value <= 0 || (payload.discount_type === "percentage" && payload.discount_value > 100)) return "Enter a valid discount value.";
      if (!Number.isFinite(payload.minimum_order_amount) || payload.minimum_order_amount < 0) return "Enter a valid minimum order amount.";
      if (payload.applies_to === "categories" && !payload.category_ids.length) return "Select at least one category.";
      if (payload.applies_to === "products" && !payload.product_ids.length) return "Select at least one product.";
      if (payload.customer_eligibility === "selected" && !payload.customer_phones.length) return "Choose or enter at least one customer mobile number.";
      if (payload.customer_eligibility === "selected" && payload.customer_phones.some(phone => !/^01\d{9}$/.test(phone))) return "Check the selected customer mobile numbers.";
      if (payload.usage_limit !== null && (!Number.isInteger(payload.usage_limit) || payload.usage_limit < 1)) return "Total usage limit must be at least 1.";
      if (!Number.isInteger(payload.per_customer_limit) || payload.per_customer_limit < 1) return "Per-customer limit must be at least 1.";
      if (!payload.starts_at) return "Choose a campaign start date and time.";
      if (payload.ends_at && new Date(payload.ends_at) <= new Date(payload.starts_at)) return "Expiry must be later than the start date.";
      return "";
    }

    async function loadData() {
      if (isLoading) return;
      isLoading = true;
      $("couponTableBody").innerHTML = '<tr><td colspan="7" class="hf-loading">Refreshing coupon data…</td></tr>';
      try {
        const [couponRows, categoryResult, productResult, catRows, productRowsLink, customerRowsLink, redemptionRows, customerResult] = await Promise.all([
          signedQuery(client.from("coupons").select("*").order("created_at", { ascending: false }).limit(1500)),
          client.from("categories").select("id,name,slug,is_active").eq("is_active", true).order("name").limit(500),
          client.from("products").select("id,name,slug,category,category_slug,price,is_active").eq("is_active", true).order("name").limit(2000),
          signedQuery(client.from("coupon_categories").select("coupon_id,category_id").limit(10000)),
          signedQuery(client.from("coupon_products").select("coupon_id,product_id").limit(10000)),
          signedQuery(client.from("coupon_customer_allowlist").select("coupon_id,customer_phone").limit(10000)),
          signedQuery(client.from("coupon_redemptions").select("id,coupon_id,order_id,order_number,customer_phone,discount_amount,status,created_at").order("created_at", { ascending: false }).limit(5000)),
          client.from("customers").select("id,name,phone,created_at").order("created_at", { ascending: false }).limit(1000)
        ]);
        if (categoryResult.error) throw categoryResult.error;
        if (productResult.error) throw productResult.error;
        coupons = couponRows || [];
        categories = categoryResult.data || [];
        products = productResult.data || [];
        categoryLinks = catRows || [];
        productLinks = productRowsLink || [];
        customerLinks = customerRowsLink || [];
        redemptions = redemptionRows || [];
        customers = customerResult.error ? [] : (customerResult.data || []);
        renderMetrics();
        renderCouponRows();
        renderCategoryPicker([]);
        renderProductPicker([]);
        renderCustomerPicker([]);
        $("couponListMessage").textContent = "Reserved and redeemed orders count toward usage limits. " +
          redemptions.filter(r => r.status === "reserved").length + " use(s) are currently pending; " +
          redemptions.filter(r => r.status === "released").length + " cancelled use(s) have been returned.";
      } finally {
        isLoading = false;
      }
    }

    async function saveCoupon(event) {
      event.preventDefault();
      $("couponFormError").textContent = "";
      let payload;
      try {
        payload = formPayload();
      } catch (error) {
        $("couponFormError").textContent = "Please check the dates and numeric fields.";
        return;
      }
      const validation = validateFormPayload(payload);
      if (validation) {
        $("couponFormError").textContent = validation;
        return;
      }
      const button = $("couponSaveBtn");
      button.disabled = true;
      button.textContent = "Saving…";
      try {
        const { data, error } = await client.rpc("admin_save_coupon", { p_coupon: payload });
        if (error) throw error;
        const savedId = data?.couponId || payload.id;
        await audit(payload.id ? "coupon_updated" : "coupon_created", "coupon", savedId, (payload.id ? "Updated " : "Created ") + payload.name, {
          code: payload.code, discount_type: payload.discount_type, applies_to: payload.applies_to,
          customer_eligibility: payload.customer_eligibility, status: payload.status
        });
        toast(payload.id ? "Coupon updated successfully." : "Coupon created successfully.");
        await loadData();
        resetForm();
        setTab("list");
      } catch (error) {
        console.error("Coupon save failed:", error);
        $("couponFormError").textContent = error?.message || "Could not save the coupon. Refresh and try again.";
      } finally {
        button.disabled = false;
        button.textContent = $("couponId").value ? "Save changes" : "Save coupon";
      }
    }

    async function setCouponStatus(coupon, nextStatus) {
      const message = nextStatus === "archived"
        ? "Archive this coupon? It will no longer be accepted at checkout. Existing order history will be retained."
        : nextStatus === "paused"
          ? "Pause this coupon? Customers will not be able to use it while paused."
          : "Activate this coupon for checkout use?";
      if (!confirm(message)) return;
      const { error } = await client.rpc("admin_set_coupon_status", {
        p_coupon_id: coupon.id,
        p_status: nextStatus
      });
      if (error) throw error;
      await audit("coupon_status_changed", "coupon", coupon.id, coupon.code + " → " + nextStatus, { status: nextStatus });
      toast("Coupon " + nextStatus + ".");
      await loadData();
    }

    function showCouponDetails(coupon) {
      const rows = redemptions.filter(r => r.coupon_id === coupon.id).slice(0, 150);
      const reserved = rows.filter(r => r.status === "reserved").length;
      const redeemed = rows.filter(r => r.status === "redeemed").length;
      const released = rows.filter(r => r.status === "released").length;
      const discount = rows.filter(r => r.status === "redeemed").reduce((sum, r) => sum + Number(r.discount_amount || 0), 0);
      const status = statusOf(coupon, countedUses(coupon.id));
      $("couponDetailsTitle").textContent = coupon.name;
      $("couponDetailsCode").textContent = coupon.code + " · " + prettyStatus(status);
      $("couponDetailsMetrics").innerHTML = [
        ["Delivered uses", redeemed],
        ["Pending uses", reserved],
        ["Discount delivered", moneyText(discount)]
      ].map(([label, value]) => '<div class="cp-dialog-kpi"><small>' + escapeHtml(label) + '</small><strong>' + escapeHtml(value) + '</strong></div>').join("");
      const target = coupon.customer_eligibility === "first_order" ? "First-time customers" :
        coupon.customer_eligibility === "selected" ? phonesFor(coupon.id).length + " selected phone number(s)" : "All customers";
      const validity = dateTime(coupon.starts_at) + (coupon.ends_at ? " — " + dateTime(coupon.ends_at) : " — No expiry");
      $("couponDetailsSummary").innerHTML =
        '<div><span class="cp-muted">Discount</span><strong>' + escapeHtml(coupon.discount_type === "percentage" ? coupon.discount_value + "%" : moneyText(coupon.discount_value)) + '</strong></div>' +
        '<div><span class="cp-muted">Maximum discount</span><strong>' + escapeHtml(coupon.max_discount_amount ? moneyText(coupon.max_discount_amount) : "No cap") + '</strong></div>' +
        '<div><span class="cp-muted">Minimum order</span><strong>' + escapeHtml(moneyText(coupon.minimum_order_amount)) + '</strong></div>' +
        '<div><span class="cp-muted">Usage</span><strong>' + escapeHtml(countedUses(coupon.id) + " / " + (coupon.usage_limit ?? "Unlimited")) + '</strong></div>' +
        '<div><span class="cp-muted">Applies to</span><strong>' + escapeHtml(couponScope(coupon)) + '</strong></div>' +
        '<div><span class="cp-muted">Eligible customers</span><strong>' + escapeHtml(target) + '</strong></div>' +
        '<div class="cp-field-full"><span class="cp-muted">Validity</span><strong>' + escapeHtml(validity) + '</strong></div>' +
        '<div><span class="cp-muted">Cancelled / released uses</span><strong>' + released + '</strong></div>';
      $("couponRedemptionBody").innerHTML = rows.length ? rows.map(r =>
        '<tr><td>' + escapeHtml(r.order_number || "Order") + '</td><td><span class="cp-phone-mask">' + escapeHtml(phoneMask(r.customer_phone)) + '</span></td><td>' +
        escapeHtml(moneyText(r.discount_amount)) + '</td><td>' + escapeHtml(prettyStatus(r.status)) + '</td><td>' +
        escapeHtml(dateTime(r.created_at)) + '</td></tr>'
      ).join("") : '<tr><td colspan="5"><div class="cp-empty">No coupon uses recorded yet.</div></td></tr>';
      $("couponDetailsDialog").showModal();
    }

    async function handleRowAction(event) {
      const button = event.target.closest("[data-action]");
      const row = event.target.closest("[data-coupon-id]");
      if (!button || !row) return;
      const coupon = coupons.find(c => c.id === row.dataset.couponId);
      if (!coupon) return;
      const action = button.dataset.action;
      try {
        if (action === "copy") {
          await navigator.clipboard.writeText(coupon.code);
          toast("Coupon code copied.");
        } else if (action === "details") {
          showCouponDetails(coupon);
        } else if (action === "edit") {
          const used = countedUses(coupon.id);
          if (coupon.status === "archived") return;
          setFormFromCoupon(coupon);
        } else if (action === "duplicate") {
          setFormFromCoupon(coupon, true);
        } else if (action === "pause") {
          await setCouponStatus(coupon, "paused");
        } else if (action === "resume") {
          await setCouponStatus(coupon, "active");
        } else if (action === "archive") {
          await setCouponStatus(coupon, "archived");
        }
      } catch (error) {
        toast(error?.message || "Could not complete this coupon action.", "error");
      }
    }

    function exportCoupons() {
      const rows = coupons.map(c => ({
        name: c.name,
        code: c.code,
        discount_type: c.discount_type,
        discount_value: c.discount_value,
        max_discount_amount: c.max_discount_amount,
        minimum_order_amount: c.minimum_order_amount,
        applies_to: c.applies_to,
        customer_eligibility: c.customer_eligibility,
        total_usage_limit: c.usage_limit ?? "Unlimited",
        uses_reserved_or_redeemed: countedUses(c.id),
        delivered_redemptions: redeemedUses(c.id),
        delivered_discount_bdt: redeemedDiscount(c.id),
        status: statusOf(c, countedUses(c.id)),
        starts_at: c.starts_at,
        ends_at: c.ends_at
      }));
      downloadFile("halal-food-coupons.csv", csvText(rows), "text/csv;charset=utf-8");
    }

    $("couponCategoryPicker").addEventListener("change", () => {
      selectedCategoryIds = selectedCheckboxValues("couponCategoryPicker");
    });
    $("couponProductPicker").addEventListener("change", () => {
      selectedProductIds = selectedCheckboxValues("couponProductPicker");
    });
    $("couponCustomerPicker").addEventListener("change", () => {
      selectedCustomerPhones = selectedCheckboxValues("couponCustomerPicker").map(normalizePhone).filter(Boolean);
    });
    $("couponForm").addEventListener("submit", saveCoupon);
    $("couponListTab").addEventListener("click", () => setTab("list"));
    $("couponAddTab").addEventListener("click", () => {
      if (!$("couponId").value) resetForm();
      setTab("form");
    });
    $("couponNewBtn").addEventListener("click", () => { resetForm(); setTab("form"); });
    $("couponListAddBtn").addEventListener("click", () => { resetForm(); setTab("form"); });
    $("couponBackToList").addEventListener("click", () => { resetForm(); setTab("list"); });
    $("couponCancelForm").addEventListener("click", () => { resetForm(); setTab("list"); });
    $("couponGenerateCode").addEventListener("click", () => { $("couponCode").value = codeFromEntropy(); });
    $("couponAppliesTo").addEventListener("change", updateConditionalFields);
    $("couponCustomerEligibility").addEventListener("change", updateConditionalFields);
    $("couponDiscountType").addEventListener("change", updateConditionalFields);
    $("couponProductSearch").addEventListener("input", () => renderProductPicker());
    $("couponCustomerSearch").addEventListener("input", () => renderCustomerPicker());
    $("couponSearch").addEventListener("input", renderCouponRows);
    $("couponStatusFilter").addEventListener("change", renderCouponRows);
    $("couponTableBody").addEventListener("click", handleRowAction);
    $("couponExportBtn").addEventListener("click", exportCoupons);
    $("couponRefreshBtn").addEventListener("click", async event => {
      const button = event.currentTarget;
      button.disabled = true;
      try { await loadData(); toast("Coupon data refreshed."); }
      catch (error) { toast(error?.message || "Could not refresh coupon data.", "error"); }
      finally { button.disabled = false; }
    });
    $("couponDetailsClose").addEventListener("click", () => $("couponDetailsDialog").close());

    resetForm();
    setTab("list");
    await loadData();
  };
})();
