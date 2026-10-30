import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../admin/analytics-model.js", import.meta.url), "utf8");
const sandbox = { window: {} };
runInNewContext(source, sandbox);
const model = sandbox.window.HFAnalyticsModel;

test("analytics model exports a stable, frozen API", () => {
  assert.equal(Object.isFrozen(model), true);
  for (const name of [
    "stageActors", "topProducts", "visitorSessionKey", "formatSeconds",
    "buildPageExperience", "buildSessionJourneys", "buildProductPerformance",
  ]) {
    assert.equal(typeof model[name], "function", name + " must be exported");
  }
});

test("stageActors counts unique sessions and keeps anonymous event fallback", () => {
  const events = [
    { event_name: "page_view", session_id: "s1", id: 1 },
    { event_name: "view_item", session_id: "s1", id: 2 },
    { event_name: "page_view", anonymous_id: "a1", id: 3 },
    { event_name: "page_view", id: 4 },
    { event_name: "page_view", id: 5 },
  ];
  assert.equal(model.stageActors(events, "page_view"), 4);
});

test("topProducts ranks event counts and attaches the matching catalog item", () => {
  const products = [{ name: "Ghee", slug: "ghee" }, { name: "Honey", slug: "honey" }];
  const events = [
    { event_name: "view_item", item_name: "Ghee" },
    { event_name: "view_item", item_name: "Ghee" },
    { event_name: "view_item", item_name: "Honey" },
    { event_name: "add_to_cart", item_name: "Honey" },
  ];
  const rows = model.topProducts(events, products);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, "Ghee");
  assert.equal(rows[0].count, 2);
  assert.equal(rows[0].product.slug, "ghee");
});

test("page experience keeps view, visible-time, and latest-session metrics", () => {
  const events = [
    { event_name: "page_view", page_path: "/ghee", session_id: "s1", occurred_at: "2026-10-01T10:00:00Z" },
    { event_name: "page_engagement", page_path: "/ghee", session_id: "s1", occurred_at: "2026-10-01T10:01:00Z", value: 8 },
    { event_name: "page_view", page_path: "/honey", session_id: "s1", occurred_at: "2026-10-01T10:02:00Z" },
    { event_name: "page_view", page_path: "/ghee", session_id: "s2", occurred_at: "2026-10-01T10:03:00Z" },
  ];
  const rows = model.buildPageExperience(events);
  const ghee = rows.find((row) => row.path === "/ghee");
  const honey = rows.find((row) => row.path === "/honey");
  assert.equal(ghee.views, 2);
  assert.equal(ghee.visibleSeconds, 8);
  assert.equal(ghee.timingCount, 1);
  assert.equal(ghee.lastSeenSessions, 1);
  assert.equal(honey.lastSeenSessions, 1);
});

test("session journeys preserve chronological paths and event totals", () => {
  const events = [
    { event_name: "page_view", page_path: "/home", session_id: "s1", occurred_at: "2026-10-01T10:00:00Z" },
    { event_name: "page_view", page_path: "/home", session_id: "s1", occurred_at: "2026-10-01T10:01:00Z" },
    { event_name: "add_to_cart", page_path: "/home", session_id: "s1", occurred_at: "2026-10-01T10:02:00Z" },
    { event_name: "page_view", page_path: "/cart", session_id: "s1", occurred_at: "2026-10-01T10:03:00Z" },
    { event_name: "begin_checkout", page_path: "/cart", session_id: "s1", occurred_at: "2026-10-01T10:04:00Z" },
    { event_name: "order_submit", page_path: "/checkout", session_id: "s1", occurred_at: "2026-10-01T10:05:00Z" },
    { event_name: "page_engagement", page_path: "/checkout", session_id: "s1", occurred_at: "2026-10-01T10:06:00Z", value: 12 },
  ];
  const row = model.buildSessionJourneys(events)[0];
  assert.equal(row.sessionId, "s1");
  assert.equal(row.steps, 3);
  assert.equal(row.pathSteps.join(","), "/home,/cart");
  assert.equal(row.cartAdds, 1);
  assert.equal(row.checkouts, 1);
  assert.equal(row.orderSubmits, 1);
  assert.equal(row.visibleSeconds, 12);
});

test("product performance excludes cancelled orders and retains conversion/ledger calculations", () => {
  const products = [{ id: "p1", slug: "ghee", name: "Ghee" }];
  const events = [
    { event_name: "view_item", item_id: "ghee", item_name: "Ghee", session_id: "s1", occurred_at: "2026-10-01T10:00:00Z" },
    { event_name: "add_to_cart", item_id: "ghee", item_name: "Ghee", session_id: "s1", occurred_at: "2026-10-01T10:01:00Z" },
    { event_name: "add_to_cart", item_id: "ghee", item_name: "Ghee", session_id: "s2", occurred_at: "2026-10-01T10:02:00Z" },
  ];
  const orders = [
    { id: "o1", status: "processing", order_items: [{ product_id: "p1", product_name: "Ghee", quantity: 2, line_total: 500 }] },
    { id: "o2", status: "cancelled", order_items: [{ product_id: "p1", product_name: "Ghee", quantity: 9, line_total: 999 }] },
  ];
  const row = model.buildProductPerformance(events, orders, products)[0];
  assert.equal(row.views, 1);
  assert.equal(row.cartAdds, 2);
  assert.equal(row.viewSessions.size, 1);
  assert.equal(row.cartAfterViewSessions.size, 1);
  assert.equal(row.viewToCartRate, 100);
  assert.equal(row.orderCount, 1);
  assert.equal(row.orderLines, 1);
  assert.equal(row.units, 2);
  assert.equal(row.orderValue, 500);
});

test("visible-time formatting retains existing display units", () => {
  assert.equal(model.formatSeconds(8), "8 sec");
  assert.equal(model.formatSeconds(60), "1m");
  assert.equal(model.formatSeconds(125), "2m 5s");
});
