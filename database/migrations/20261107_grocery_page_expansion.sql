-- Additive expansion: 25 predesigned pages for each grocery storefront.
-- Apply only to Neon branch grocery-template-builder-v1 / halal_food_db.
INSERT INTO builder.template_pages(template_key,page_key,page_type,title,slug,sort_order,page_spec,is_required,is_active)
SELECT t.template_key,p.page_key,p.page_type,p.title,p.slug,p.sort_order,p.page_spec,false,true
FROM (VALUES ('general-supermarket'),('fresh-produce'),('express-grocery'),('wholesale-bulk')) AS t(template_key)
CROSS JOIN (VALUES
 ('offers','content','Special Offers','offers',19,'{"sections":["offer-hero","discounted-products","coupon-guide","offer-terms"],"layout":"promotional"}'::jsonb),
 ('brands','content','Brands','brands',20,'{"sections":["brand-index","featured-brands","brand-story"],"layout":"brand-directory"}'::jsonb),
 ('recipes','content','Recipes & Ideas','recipes',21,'{"sections":["editorial-hero","recipe-cards","seasonal-inspiration"],"layout":"editorial"}'::jsonb),
 ('recipe-detail','content','Recipe Details','recipe-detail',22,'{"sections":["recipe-cover","ingredients","method","related-products"],"layout":"editorial-detail"}'::jsonb),
 ('journal','content','Journal','journal',23,'{"sections":["journal-hero","article-list","newsletter"],"layout":"editorial"}'::jsonb),
 ('store-locator','content','Find a Store','store-locator',24,'{"sections":["locator-hero","location-search","store-list"],"layout":"location"}'::jsonb),
 ('bulk-enquiry','contact','Bulk & Business Enquiry','bulk-enquiry',25,'{"sections":["business-hero","enquiry-form","account-benefits"],"layout":"b2b-lead"}'::jsonb)
) AS p(page_key,page_type,title,slug,sort_order,page_spec)
ON CONFLICT(template_key,page_key) DO UPDATE SET title=EXCLUDED.title,slug=EXCLUDED.slug,sort_order=EXCLUDED.sort_order,page_spec=EXCLUDED.page_spec,is_active=true,updated_at=now();
