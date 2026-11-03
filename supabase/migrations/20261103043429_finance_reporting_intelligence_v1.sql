-- Finance Phase 3: reporting intelligence sources.
-- Additive, read-only reporting views. No operational records are modified.

CREATE OR REPLACE VIEW public.admin_finance_receivable_activity
WITH (security_invoker = true)
AS
WITH base_journal AS (
  SELECT je.id AS journal_entry_id,
         COALESCE(je.reversal_of, je.id) AS source_journal_id,
         je.journal_number,
         je.entry_date,
         je.status AS journal_status
  FROM public.admin_finance_journal_entries je
  WHERE je.status IN ('posted', 'reversed')
),
resolved_source AS (
  SELECT bj.*,
         source_je.source_type,
         source_je.source_key,
         source_je.reversal_of,
         fe.related_order_id,
         fe.id AS finance_entry_id
  FROM base_journal bj
  JOIN public.admin_finance_journal_entries source_je
    ON source_je.id = bj.source_journal_id
  LEFT JOIN public.admin_finance_entries fe
    ON fe.accounting_journal_id = source_je.id
)
SELECT rs.journal_entry_id,
       rs.source_journal_id,
       rs.journal_number,
       rs.entry_date,
       rs.journal_status,
       rs.source_type,
       rs.source_key,
       rs.finance_entry_id,
       COALESCE(
         rs.related_order_id,
         CASE
           WHEN rs.source_type = 'order_sale'
            AND rs.source_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           THEN rs.source_key::uuid
           ELSE NULL
         END
       ) AS order_id,
       o.order_number,
       COALESCE(NULLIF(o.customer_name, ''), NULLIF(jl.party_name, '')) AS customer_name,
       o.ordered_at::date AS order_date,
       jl.party_name,
       jl.description AS line_description,
       jl.debit,
       jl.credit,
       (jl.debit - jl.credit)::numeric(14,2) AS receivable_delta,
       COALESCE(
         COALESCE(
           rs.related_order_id,
           CASE
             WHEN rs.source_type = 'order_sale'
              AND rs.source_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
             THEN rs.source_key::uuid
             ELSE NULL
           END
         )::text,
         'journal:' || rs.source_journal_id::text
       ) AS activity_key
FROM resolved_source rs
JOIN public.admin_finance_journal_lines jl
  ON jl.journal_entry_id = rs.journal_entry_id
JOIN public.admin_finance_chart_of_accounts coa
  ON coa.id = jl.account_id
 AND coa.account_code = '1100'
LEFT JOIN public.orders o
  ON o.id = COALESCE(
    rs.related_order_id,
    CASE
      WHEN rs.source_type = 'order_sale'
       AND rs.source_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN rs.source_key::uuid
      ELSE NULL
    END
  );

CREATE OR REPLACE VIEW public.admin_finance_payable_activity
WITH (security_invoker = true)
AS
WITH bill_amounts AS (
  SELECT b.id AS bill_id,
         b.supplier_id,
         s.name AS supplier_name,
         b.bill_number,
         b.supplier_invoice_number,
         b.invoice_date,
         b.due_date,
         b.accounting_journal_id,
         b.reversal_journal_id,
         COALESCE(SUM(jl.credit - jl.debit) FILTER (WHERE coa.account_code = '2010'), 0)::numeric(14,2) AS ap_amount
  FROM public.admin_supplier_bills b
  JOIN public.admin_suppliers s ON s.id = b.supplier_id
  JOIN public.admin_finance_journal_entries je
    ON je.id = b.accounting_journal_id
   AND je.status IN ('posted', 'reversed')
  LEFT JOIN public.admin_finance_journal_lines jl ON jl.journal_entry_id = je.id
  LEFT JOIN public.admin_finance_chart_of_accounts coa ON coa.id = jl.account_id
  WHERE b.accounting_journal_id IS NOT NULL
  GROUP BY b.id, s.name
),
credit_amounts AS (
  SELECT cn.id AS credit_note_id,
         cn.supplier_id,
         cn.supplier_bill_id AS bill_id,
         cn.credit_note_number,
         cn.credit_date,
         cn.accounting_journal_id,
         cn.reversal_journal_id,
         COALESCE(SUM(jl.debit - jl.credit) FILTER (WHERE coa.account_code = '2010'), 0)::numeric(14,2) AS ap_amount
  FROM public.admin_supplier_credit_notes cn
  JOIN public.admin_finance_journal_entries je
    ON je.id = cn.accounting_journal_id
   AND je.status IN ('posted', 'reversed')
  LEFT JOIN public.admin_finance_journal_lines jl ON jl.journal_entry_id = je.id
  LEFT JOIN public.admin_finance_chart_of_accounts coa ON coa.id = jl.account_id
  WHERE cn.supplier_bill_id IS NOT NULL
    AND cn.accounting_journal_id IS NOT NULL
  GROUP BY cn.id
),
activity AS (
  SELECT b.bill_id, b.supplier_id, b.supplier_name, b.bill_number,
         b.supplier_invoice_number, b.invoice_date, b.due_date,
         b.invoice_date AS activity_date, 'bill'::text AS activity_type,
         b.bill_id AS source_id, b.ap_amount AS amount_delta
  FROM bill_amounts b
  WHERE b.ap_amount <> 0

  UNION ALL

  SELECT b.bill_id, b.supplier_id, b.supplier_name, b.bill_number,
         b.supplier_invoice_number, b.invoice_date, b.due_date,
         reversal.entry_date AS activity_date, 'bill_reversal'::text AS activity_type,
         b.bill_id AS source_id, -b.ap_amount AS amount_delta
  FROM bill_amounts b
  JOIN public.admin_finance_journal_entries reversal
    ON reversal.id = b.reversal_journal_id
   AND reversal.status IN ('posted', 'reversed')
  WHERE b.reversal_journal_id IS NOT NULL AND b.ap_amount <> 0

  UNION ALL

  SELECT b.id AS bill_id, b.supplier_id, s.name AS supplier_name, b.bill_number,
         b.supplier_invoice_number, b.invoice_date, b.due_date,
         p.payment_date AS activity_date, 'payment_allocation'::text AS activity_type,
         p.id AS source_id, -a.allocated_amount AS amount_delta
  FROM public.admin_supplier_payment_allocations a
  JOIN public.admin_supplier_payments p ON p.id = a.payment_id
  JOIN public.admin_supplier_bills b ON b.id = a.supplier_bill_id
  JOIN public.admin_suppliers s ON s.id = b.supplier_id
  JOIN public.admin_finance_journal_entries je
    ON je.id = p.accounting_journal_id AND je.status IN ('posted', 'reversed')
  WHERE p.accounting_journal_id IS NOT NULL AND a.allocated_amount > 0

  UNION ALL

  SELECT b.id AS bill_id, b.supplier_id, s.name AS supplier_name, b.bill_number,
         b.supplier_invoice_number, b.invoice_date, b.due_date,
         reversal.entry_date AS activity_date, 'payment_reversal'::text AS activity_type,
         p.id AS source_id, a.allocated_amount AS amount_delta
  FROM public.admin_supplier_payment_allocations a
  JOIN public.admin_supplier_payments p ON p.id = a.payment_id
  JOIN public.admin_supplier_bills b ON b.id = a.supplier_bill_id
  JOIN public.admin_suppliers s ON s.id = b.supplier_id
  JOIN public.admin_finance_journal_entries reversal
    ON reversal.id = p.reversal_journal_id AND reversal.status IN ('posted', 'reversed')
  WHERE p.reversal_journal_id IS NOT NULL AND a.allocated_amount > 0

  UNION ALL

  SELECT b.bill_id, b.supplier_id, b.supplier_name, b.bill_number,
         b.supplier_invoice_number, b.invoice_date, b.due_date,
         c.credit_date AS activity_date, 'credit_note'::text AS activity_type,
         c.credit_note_id AS source_id, -c.ap_amount AS amount_delta
  FROM credit_amounts c
  JOIN bill_amounts b ON b.bill_id = c.bill_id
  WHERE c.ap_amount <> 0

  UNION ALL

  SELECT b.bill_id, b.supplier_id, b.supplier_name, b.bill_number,
         b.supplier_invoice_number, b.invoice_date, b.due_date,
         reversal.entry_date AS activity_date, 'credit_note_reversal'::text AS activity_type,
         c.credit_note_id AS source_id, c.ap_amount AS amount_delta
  FROM credit_amounts c
  JOIN bill_amounts b ON b.bill_id = c.bill_id
  JOIN public.admin_finance_journal_entries reversal
    ON reversal.id = c.reversal_journal_id AND reversal.status IN ('posted', 'reversed')
  WHERE c.reversal_journal_id IS NOT NULL AND c.ap_amount <> 0
)
SELECT bill_id, supplier_id, supplier_name, bill_number, supplier_invoice_number,
       invoice_date, due_date, activity_date, activity_type, source_id,
       amount_delta::numeric(14,2) AS amount_delta
FROM activity
WHERE amount_delta <> 0;

CREATE OR REPLACE VIEW public.admin_finance_inventory_valuation
WITH (security_invoker = true)
AS
WITH weighted_cost AS (
  SELECT cl.product_id,
         SUM(cl.accepted_quantity)::numeric(14,3) AS accepted_quantity,
         SUM(cl.accepted_quantity * cl.landed_unit_cost)::numeric(14,2) AS landed_cost_total,
         (SUM(cl.accepted_quantity * cl.landed_unit_cost)
           / NULLIF(SUM(cl.accepted_quantity), 0))::numeric(14,4) AS weighted_landed_unit_cost
  FROM public.admin_inventory_cost_layers cl
  WHERE cl.product_id IS NOT NULL AND cl.accepted_quantity > 0
  GROUP BY cl.product_id
),
product_cost AS (
  SELECT p.id AS product_id, p.name AS product_name, p.sku, p.category,
         p.unit_type, p.stock_quantity, p.is_active,
         pc.cost_price AS manual_unit_cost,
         COALESCE(pc.packaging_cost, 0)::numeric(14,4) AS packaging_cost,
         wc.accepted_quantity AS cost_layer_quantity,
         wc.weighted_landed_unit_cost
  FROM public.products p
  LEFT JOIN public.admin_product_costs pc ON pc.product_id = p.id
  LEFT JOIN weighted_cost wc ON wc.product_id = p.id
)
SELECT product_id, product_name, sku, category, unit_type,
       stock_quantity::numeric(14,3) AS stock_quantity,
       manual_unit_cost, weighted_landed_unit_cost, packaging_cost,
       COALESCE(manual_unit_cost, weighted_landed_unit_cost)::numeric(14,4) AS base_unit_cost,
       CASE
         WHEN COALESCE(manual_unit_cost, weighted_landed_unit_cost) IS NULL THEN NULL
         ELSE (COALESCE(manual_unit_cost, weighted_landed_unit_cost) + packaging_cost)::numeric(14,4)
       END AS valued_unit_cost,
       CASE
         WHEN stock_quantity < 0 THEN NULL
         WHEN stock_quantity = 0 THEN 0::numeric
         WHEN COALESCE(manual_unit_cost, weighted_landed_unit_cost) IS NULL THEN NULL
         ELSE ROUND(stock_quantity * (COALESCE(manual_unit_cost, weighted_landed_unit_cost) + packaging_cost), 2)
       END::numeric(14,2) AS estimated_stock_value,
       CASE
         WHEN stock_quantity < 0 THEN 'negative_stock'
         WHEN stock_quantity = 0 THEN 'zero_stock'
         WHEN manual_unit_cost IS NOT NULL THEN 'manual_cost'
         WHEN weighted_landed_unit_cost IS NOT NULL THEN 'weighted_average_grn'
         ELSE 'cost_missing'
       END AS valuation_status,
       is_active
FROM product_cost;

REVOKE ALL ON public.admin_finance_receivable_activity FROM PUBLIC, anon;
REVOKE ALL ON public.admin_finance_payable_activity FROM PUBLIC, anon;
REVOKE ALL ON public.admin_finance_inventory_valuation FROM PUBLIC, anon;

GRANT SELECT ON public.admin_finance_receivable_activity TO authenticated;
GRANT SELECT ON public.admin_finance_payable_activity TO authenticated;
GRANT SELECT ON public.admin_finance_inventory_valuation TO authenticated;

COMMENT ON VIEW public.admin_finance_receivable_activity IS
'Phase 3 finance report source. Posted/reversed General Ledger activity for Accounts Receivable (1100), mapped to orders where source links exist. Age is based on first accounting debit, not an invented payment due date.';
COMMENT ON VIEW public.admin_finance_payable_activity IS
'Phase 3 finance report source. Bill-level Accounts Payable (2010) activity including posted allocations, supplier credits and their accounting reversals with event dates.';
COMMENT ON VIEW public.admin_finance_inventory_valuation IS
'Phase 3 finance report source. Estimated current stock value using live product quantity and manual cost first, then weighted accepted GRN landed cost; missing/negative cost coverage remains explicit.';
