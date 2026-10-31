(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const moneyText = value => "৳" + Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 });
  const countText = value => Number(value || 0).toLocaleString("en-BD");
  const safeStatus = value => String(value || "").toLowerCase();

  window.HFCouponUsageInit = async () => {
    const H = window.HFAdmin;
    if (!H) throw new Error("Secure admin access is not ready.");
    const { client, signedQuery, toast, dateTime, downloadFile, csvText, esc } = H;
    let couponRows = [];
    let redemptionRows = [];
    let orderRows = [];
    let reportRows = [];

    function currentState(row) {
      const orderStatus = safeStatus(row.order?.status);
      const redemptionStatus = safeStatus(row.redemption?.status);
      if (orderStatus === "cancelled") return "released";
      if (orderStatus === "delivered") return "redeemed";
      if (redemptionStatus === "released") return "released";
      if (redemptionStatus === "redeemed") return "redeemed";
      if (row.unlinked) return "unlinked";
      return "reserved";
    }

    function stateLabel(state) {
      return ({
        reserved: "Awaiting completion",
        redeemed: "Delivered / completed",
        released: "Cancelled / released",
        unlinked: "Needs reconciliation"
      })[state] || "Unknown";
    }

    function buildRows() {
      const coupons = new Map(couponRows.map(c => [c.id, c]));
      const redemptionByOrder = new Map();
      redemptionRows.forEach(r => { if (r.order_id) redemptionByOrder.set(r.order_id, r); });
      const orderIds = new Set(orderRows.map(o => o.id));
      const rows = orderRows.map(order => {
        const redemption = redemptionByOrder.get(order.id) || null;
        const coupon = coupons.get(order.coupon_id) || null;
        const row = {
          id: redemption?.id || order.id, order, redemption, coupon,
          couponId: order.coupon_id || redemption?.coupon_id || null,
          couponCode: order.coupon_code || coupon?.code || "—",
          couponName: coupon?.name || "",
          orderNumber: order.order_number || redemption?.order_number || "—",
          customerName: order.customer_name || "Customer name unavailable",
          phone: order.customer_phone || redemption?.customer_phone || "",
          discount: Number(order.coupon_discount_amount || redemption?.discount_amount || 0),
          subtotal: Number(order.subtotal || 0), orderTotal: Number(order.total || 0),
          usedAt: order.ordered_at || redemption?.created_at || null,
          unlinked: !redemption
        };
        row.state = currentState(row);
        return row;
      });
      redemptionRows.filter(r => !r.order_id || !orderIds.has(r.order_id)).forEach(redemption => {
        const coupon = coupons.get(redemption.coupon_id) || null;
        const row = {
          id: redemption.id, order: null, redemption, coupon,
          couponId: redemption.coupon_id, couponCode: coupon?.code || "—",
          couponName: coupon?.name || "", orderNumber: redemption.order_number || "—",
          customerName: "Order record unavailable", phone: redemption.customer_phone || "",
          discount: Number(redemption.discount_amount || 0), subtotal: 0, orderTotal: 0,
          usedAt: redemption.created_at || null, unlinked: true
        };
        row.state = currentState(row);
        rows.push(row);
      });
      return rows.sort((a,b) => new Date(b.usedAt || 0).getTime() - new Date(a.usedAt || 0).getTime());
    }

    function renderMetrics() {
      const activeOrders = orderRows.filter(o => safeStatus(o.status) !== "cancelled");
      const pendingOrders = activeOrders.filter(o => ["pending","processing","shipped"].includes(safeStatus(o.status)));
      const deliveredOrders = activeOrders.filter(o => safeStatus(o.status) === "delivered");
      const cancelledOrders = orderRows.filter(o => safeStatus(o.status) === "cancelled");
      const sumDiscount = rows => rows.reduce((sum,o) => sum + Number(o.coupon_discount_amount || 0),0);
      const sumTotal = rows => rows.reduce((sum,o) => sum + Number(o.total || 0),0);
      $("cuMetricOrders").textContent = countText(activeOrders.length);
      $("cuMetricPending").textContent = countText(pendingOrders.length);
      $("cuMetricDelivered").textContent = countText(deliveredOrders.length);
      $("cuMetricDiscount").textContent = moneyText(sumDiscount(activeOrders));
      $("cuMetricOrderValue").textContent = moneyText(sumTotal(activeOrders));
      $("cuMetricPendingDiscount").textContent = moneyText(sumDiscount(pendingOrders));
      $("cuMetricDeliveredDiscount").textContent = moneyText(sumDiscount(deliveredOrders));
      $("cuMetricReleasedDiscount").textContent = moneyText(sumDiscount(cancelledOrders));
    }

    function fillCouponFilter() {
      const select = $("couponUsageCouponFilter");
      const current = select.value || "all";
      select.innerHTML = '<option value="all">All coupons</option>' + couponRows.map(c =>
        '<option value="' + esc(c.id) + '">' + esc(c.code) + " · " + esc(c.name) + "</option>"
      ).join("");
      select.value = couponRows.some(c => c.id === current) ? current : "all";
    }

    function filteredRows() {
      const query = String($("couponUsageSearch").value || "").trim().toLowerCase();
      const couponId = $("couponUsageCouponFilter").value || "all";
      const state = $("couponUsageStatusFilter").value || "all";
      return reportRows.filter(row => {
        if (couponId !== "all" && row.couponId !== couponId) return false;
        if (state !== "all" && row.state !== state) return false;
        const haystack = [row.orderNumber,row.couponCode,row.couponName,row.customerName,row.phone].join(" ").toLowerCase();
        return !query || haystack.includes(query);
      });
    }

    function renderTable() {
      const rows = filteredRows();
      $("cuResultCount").textContent = countText(rows.length) + " matching coupon order record(s)";
      if (!rows.length) {
        $("couponUsageTableBody").innerHTML = '<tr><td colspan="8"><div class="cu-empty">No coupon orders match these filters.</div></td></tr>';
        return;
      }
      $("couponUsageTableBody").innerHTML = rows.map(row => {
        const orderStatus = row.order?.status ? String(row.order.status).replace(/_/g," ") : "Order unavailable";
        const ledgerStatus = row.redemption ? "Redemption: " + row.redemption.status : "Redemption record missing";
        return '<tr>' +
          '<td><div class="cu-customer"><strong>' + esc(row.customerName) + '</strong><small class="cu-phone">' + esc(row.phone || "Mobile unavailable") + '</small></div></td>' +
          '<td><div class="cu-order"><strong>' + esc(row.orderNumber) + '</strong><small>' + esc(orderStatus) + '</small></div></td>' +
          '<td><div class="cu-coupon"><span class="cu-code">' + esc(row.couponCode) + '</span><small>' + esc(row.couponName || "Coupon campaign") + '</small></div></td>' +
          '<td class="cu-money">' + esc(moneyText(row.discount)) + '</td>' +
          '<td class="cu-money">' + esc(moneyText(row.subtotal)) + '</td>' +
          '<td class="cu-money">' + esc(moneyText(row.orderTotal)) + '</td>' +
          '<td><span class="cu-state cu-state-' + row.state + '">' + esc(stateLabel(row.state)) + '</span><div class="cu-state"><small>' + esc(ledgerStatus) + '</small></div></td>' +
          '<td>' + esc(row.usedAt ? dateTime(row.usedAt) : "—") + '</td>' +
          '</tr>';
      }).join("");
    }

    function renderIntegrityNotice() {
      const missingLedger = orderRows.filter(o => !redemptionRows.some(r => r.order_id === o.id)).length;
      const missingOrder = redemptionRows.filter(r => !r.order_id || !orderRows.some(o => o.id === r.order_id)).length;
      const notice = $("cuIntegrityNotice");
      if (missingLedger || missingOrder) {
        notice.classList.add("is-warning");
        notice.textContent = "Reconciliation needed: " + missingLedger + " coupon order(s) have no matching redemption ledger record and " + missingOrder + " redemption record(s) have no matching coupon order. These records remain visible below.";
      } else {
        notice.classList.remove("is-warning");
        notice.textContent = "Order and coupon redemption records are matched. Pending orders are counted as coupon uses; delivered orders are counted as completed. Cancelled discounts are excluded from active discount totals.";
      }
    }

    function exportCsv() {
      const rows = filteredRows().map(row => ({
        order_number: row.orderNumber, customer_name: row.customerName, customer_phone: row.phone,
        coupon_code: row.couponCode, campaign_name: row.couponName,
        order_status: row.order?.status || "order_unavailable",
        redemption_status: row.redemption?.status || "missing",
        product_subtotal_bdt: row.subtotal, coupon_discount_bdt: row.discount,
        order_total_after_discount_bdt: row.orderTotal, ordered_at: row.usedAt
      }));
      if (!rows.length) { toast("There are no coupon order records to export.","error"); return; }
      downloadFile("halal-food-coupon-usage.csv",csvText(rows),"text/csv;charset=utf-8");
      toast("Coupon usage CSV exported.");
    }

    async function loadData() {
      $("couponUsageTableBody").innerHTML = '<tr><td colspan="8" class="hf-loading">Refreshing coupon orders…</td></tr>';
      const [couponData,redemptionData,orderData] = await Promise.all([
        signedQuery(client.from("coupons").select("id,name,code").order("created_at",{ascending:false}).limit(1500)),
        signedQuery(client.from("coupon_redemptions").select("id,coupon_id,order_id,order_number,customer_phone,discount_amount,status,created_at").order("created_at",{ascending:false}).limit(5000)),
        signedQuery(client.from("orders").select("id,order_number,customer_name,customer_phone,status,subtotal,total,coupon_id,coupon_code,coupon_discount_amount,ordered_at").not("coupon_code","is",null).order("ordered_at",{ascending:false}).limit(5000))
      ]);
      couponRows = couponData || [];
      redemptionRows = redemptionData || [];
      orderRows = orderData || [];
      reportRows = buildRows();
      fillCouponFilter();
      renderMetrics();
      renderIntegrityNotice();
      renderTable();
    }

    $("couponUsageSearch").addEventListener("input",renderTable);
    $("couponUsageCouponFilter").addEventListener("change",renderTable);
    $("couponUsageStatusFilter").addEventListener("change",renderTable);
    $("couponUsageExportBtn").addEventListener("click",exportCsv);
    $("couponUsageRefreshBtn").addEventListener("click",async event => {
      const button = event.currentTarget;
      button.disabled = true;
      try { await loadData(); toast("Coupon usage data refreshed."); }
      catch (error) { toast(error?.message || "Coupon usage data could not be refreshed.","error"); }
      finally { button.disabled = false; }
    });
    await loadData();
  };
})();