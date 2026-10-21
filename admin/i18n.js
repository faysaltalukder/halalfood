(() => {
  "use strict";

  const translations = {
    "Language": "ভাষা",
    "Overview": "সারসংক্ষেপ", "Analytics": "অ্যানালিটিক্স", "Orders": "অর্ডারসমূহ",
    "Operations": "কার্যক্রম", "Products": "পণ্য", "Website Content": "ওয়েবসাইটের কনটেন্ট",
    "Customers": "গ্রাহক", "Finance & Cash Flow": "আর্থিক হিসাব ও নগদ প্রবাহ",
    "Reports": "রিপোর্ট", "Settings": "সেটিংস", "Admin Control Center": "অ্যাডমিন নিয়ন্ত্রণ কেন্দ্র",
    "WORKSPACE": "কর্মক্ষেত্র", "Easy Mode + Advanced Tools": "সহজ মোড + উন্নত টুল",
    "Clear guidance for everyday tasks, with deeper reports when you need them.": "প্রতিদিনের কাজের জন্য সহজ নির্দেশনা এবং প্রয়োজনে বিস্তারিত রিপোর্ট।",
    "Search this page…": "এই পেজে খুঁজুন…", "Open navigation": "নেভিগেশন খুলুন",
    "Light theme": "লাইট থিম", "Dark theme": "ডার্ক থিম",
    "Switch to light theme": "লাইট থিমে পরিবর্তন করুন", "Switch to dark theme": "ডার্ক থিমে পরিবর্তন করুন",
    "Advanced view": "উন্নত ভিউ", "Simple view": "সহজ ভিউ", "? Help": "? সহায়তা",
    "Sign out": "সাইন আউট", "Admin": "অ্যাডমিন", "Authorized account": "অনুমোদিত অ্যাকাউন্ট",
    "QUICK GUIDE": "দ্রুত নির্দেশিকা", "How to use your admin panel": "অ্যাডমিন প্যানেল ব্যবহারের নিয়ম",
    "Every section is designed for everyday, non-technical use.": "প্রতিটি অংশ সাধারণ ব্যবহারকারীর সুবিধার জন্য তৈরি।",
    "Choose a section from the left menu.": "বাম পাশের মেনু থেকে একটি বিভাগ বেছে নিন।",
    "Use the date filters and search boxes to narrow down information.": "তথ্য সীমিত করতে তারিখ ফিল্টার ও সার্চ বক্স ব্যবহার করুন।",
    "Charts are interactive: hover or tap a chart to see values and labels.": "চার্টে মাউস রাখুন বা ট্যাপ করুন—মান ও লেবেল দেখা যাবে।",
    "Use Reports to export filtered data. CSV opens in spreadsheets; PDF opens the print dialog where you can choose Save as PDF.": "ফিল্টার করা তথ্য ডাউনলোড করতে রিপোর্ট ব্যবহার করুন। CSV স্প্রেডশিটে খোলে; PDF সংরক্ষণ করতে প্রিন্ট ডায়ালগে Save as PDF বেছে নিন।",
    "Finance entries count in summaries only after they are marked Confirmed. Confirm only records you have checked.": "আর্থিক হিসাবের সারাংশে শুধু Confirmed এন্ট্রি গণনা হয়। যাচাই করা এন্ট্রিই কেবল Confirmed করুন।",
    "This is a learning/testing storefront. Order value is not proof of collected payment; real delivery and payments are not enabled.": "এটি শেখা ও পরীক্ষার জন্য তৈরি স্টোর। অর্ডারের মূল্য টাকা পাওয়ার প্রমাণ নয়; বাস্তব ডেলিভারি ও পেমেন্ট চালু নেই।",
    "Got it": "বুঝেছি", "Checking secure admin access…": "নিরাপদ অ্যাডমিন অ্যাক্সেস যাচাই হচ্ছে…",
    "Your dashboard data will load only after the authorized account and two-step verification are confirmed.": "অনুমোদিত অ্যাকাউন্ট ও দুই-ধাপ যাচাই সম্পন্ন হলে ড্যাশবোর্ডের তথ্য লোড হবে।",
    "YOUR BUSINESS, AT A GLANCE": "আপনার ব্যবসার এক নজরের চিত্র",
    "See what is happening on your website and with recorded orders, without digging through long tables.": "দীর্ঘ টেবিল ঘাঁটাঘাঁটি না করেই ওয়েবসাইট ও রেকর্ড করা অর্ডারের অবস্থা দেখুন।",
    "Testing project": "পরীক্ষামূলক প্রকল্প", "Testing-project notice": "পরীক্ষামূলক প্রকল্পের বিজ্ঞপ্তি",
    "↻ Refresh": "↻ রিফ্রেশ", "Refresh": "রিফ্রেশ", "How to read these numbers": "এই সংখ্যাগুলো কীভাবে বুঝবেন",
    "These figures come from saved website events and order records. Order value is not proof of payment received, and real delivery and payments are not enabled in this learning/testing project.": "এই সংখ্যাগুলো সংরক্ষিত ওয়েবসাইট ইভেন্ট ও অর্ডার রেকর্ড থেকে এসেছে। অর্ডারের মূল্য পেমেন্ট পাওয়ার প্রমাণ নয়; এই প্রকল্পে বাস্তব ডেলিভারি ও পেমেন্ট চালু নেই।",
    "Orders Placed": "রেকর্ড করা অর্ডার", "Recorded orders · last 30 days": "গত ৩০ দিনের রেকর্ড করা অর্ডার",
    "Order Item Lines Today": "আজকের অর্ডার আইটেম লাইন", "Product line entries in non-cancelled orders": "বাতিল নয় এমন অর্ডারের পণ্য-লাইন",
    "Pending Orders": "অপেক্ষমাণ অর্ডার", "All currently pending order records · select to view": "বর্তমানে অপেক্ষমাণ সব অর্ডার · দেখতে নির্বাচন করুন",
    "Add-to-Cart Events Today": "আজ কার্টে যোগ করার ইভেন্ট", "Recorded add-to-cart actions, not current cart contents": "কার্টে যোগ করার রেকর্ডকৃত কাজ; বর্তমান কার্টের পণ্য নয়",
    "Recorded Order Value": "রেকর্ড করা অর্ডার মূল্য", "Recorded order value · last 30 days": "গত ৩০ দিনের রেকর্ড করা অর্ডার মূল্য",
    "Tracked Low Stock": "কম স্টকের পণ্য", "Visible products at or below their configured stock-alert threshold": "দেখানো পণ্যের স্টক নির্ধারিত সতর্কতা-সীমায় বা তার নিচে",
    "Recorded finance snapshot": "রেকর্ড করা আর্থিক সারাংশ",
    "Confirmed ledger entries only. These are bookkeeping figures, not verified bank or cash balances.": "শুধু নিশ্চিত করা হিসাব এন্ট্রি। এগুলো হিসাবরক্ষণ তথ্য, যাচাই করা ব্যাংক বা নগদ ব্যালেন্স নয়।",
    "Open Finance": "আর্থিক হিসাব খুলুন", "Confirmed recorded income · all time": "সব সময়ের নিশ্চিত রেকর্ডকৃত আয়",
    "Confirmed recorded expenses · all time": "সব সময়ের নিশ্চিত রেকর্ডকৃত খরচ", "Net recorded ledger · all time": "সব সময়ের নেট রেকর্ডকৃত হিসাব",
    "Manage customer orders": "গ্রাহকের অর্ডার পরিচালনা", "Operations & packing": "কার্যক্রম ও প্যাকিং",
    "Manage products": "পণ্য পরিচালনা", "Control website content": "ওয়েবসাইটের কনটেন্ট নিয়ন্ত্রণ",
    "Finance & cash flow": "আর্থিক হিসাব ও নগদ প্রবাহ", "Customer records": "গ্রাহকের রেকর্ড",
    "Marketing analytics": "মার্কেটিং অ্যানালিটিক্স", "Download reports": "রিপোর্ট ডাউনলোড",
    "Daily operations": "দৈনিক কার্যক্রম", "Order item lines created and add-to-cart events by day.": "দিন অনুযায়ী অর্ডার আইটেম লাইন ও কার্টে যোগ করার ইভেন্ট।",
    "Last 14 days": "গত ১৪ দিন",
    "Each saved order-item row counts as one line, regardless of its quantity or measurement unit. Cancelled orders are excluded; this is not a paid-sales or delivery count. Click a line point to open the related work area.": "প্রতিটি সংরক্ষিত অর্ডার-আইটেম সারি এক লাইন হিসেবে গণনা হয়—পরিমাণ বা একক যাই হোক। বাতিল অর্ডার বাদ; এটি পেইড বিক্রি বা ডেলিভারির সংখ্যা নয়। সংশ্লিষ্ট অংশ খুলতে চার্টের পয়েন্টে ক্লিক করুন।",
    "Recorded income & expenses": "রেকর্ড করা আয় ও খরচ", "Confirmed manual finance entries by day.": "দিন অনুযায়ী নিশ্চিত করা ম্যানুয়াল আর্থিক এন্ট্রি।",
    "Finance details": "আর্থিক বিস্তারিত", "Website activity": "ওয়েবসাইটের কার্যকলাপ",
    "Daily page views compared with product views.": "দিন অনুযায়ী পেজ ভিউ ও পণ্য ভিউ তুলনা।",
    "Hover or tap the chart to inspect values. More date ranges and campaign details are in Analytics.": "মান দেখতে চার্টে মাউস রাখুন বা ট্যাপ করুন। আরও তারিখ-পরিসর ও ক্যাম্পেইনের তথ্য অ্যানালিটিক্সে আছে।",
    "Order status": "অর্ডারের অবস্থা", "Click a chart segment to open the matching order list.": "সংশ্লিষ্ট অর্ডারের তালিকা খুলতে চার্টের অংশে ক্লিক করুন।",
    "View orders": "অর্ডার দেখুন", "Status totals describe order records only. They are not payment or delivery confirmation by themselves.": "স্ট্যাটাসের মোট সংখ্যা শুধু অর্ডার রেকর্ড বোঝায়; এগুলো নিজে থেকে পেমেন্ট বা ডেলিভারি নিশ্চিত করে না।",
    "Products people view": "মানুষ যে পণ্যগুলো দেখছে", "Ranked by recorded product-view events.": "রেকর্ড করা পণ্য-ভিউ ইভেন্ট অনুযায়ী সাজানো।",
    "Details": "বিস্তারিত", "Latest recorded orders": "সর্বশেষ রেকর্ড করা অর্ডার",
    "Quick access to recent order activity.": "সাম্প্রতিক অর্ডারের কার্যকলাপে দ্রুত প্রবেশ।", "All orders": "সব অর্ডার",
    "Order": "অর্ডার", "Customer": "গ্রাহক", "Value": "মূল্য", "Status": "অবস্থা",
    "Loading…": "লোড হচ্ছে…", "Loading": "লোড হচ্ছে", "UNDERSTAND VISITORS & ACTIONS": "ভিজিটর ও কার্যকলাপ বুঝুন",
    "Turn website tracking into clear visuals. Hover or tap charts to inspect values; select a time period to compare activity.": "ওয়েবসাইট ট্র্যাকিংকে সহজ ভিজ্যুয়ালে দেখুন। চার্টে মাউস রাখুন বা ট্যাপ করুন এবং কার্যকলাপ তুলনা করতে সময়সীমা বেছে নিন।",
    "⇩ Create report": "⇩ রিপোর্ট তৈরি", "On-site analytics, not traffic attribution": "ওয়েবসাইটের ভেতরের অ্যানালিটিক্স, ট্রাফিকের উৎস নয়",
    "Use Google Analytics 4 for acquisition sources and referrals. This panel focuses on first-party website interactions and pseudonymous session journeys. Recorded order values are test records, not proof of payment.": "ট্রাফিকের উৎস ও রেফারেল দেখতে Google Analytics 4 ব্যবহার করুন। এই প্যানেল ওয়েবসাইটের ইন্টারঅ্যাকশন ও ছদ্মনামভিত্তিক সেশন দেখায়। রেকর্ড করা অর্ডার মূল্য পেমেন্টের প্রমাণ নয়।",
    "Choose reporting period": "রিপোর্টের সময়সীমা বেছে নিন", "Change the range to update the charts and totals below.": "নিচের চার্ট ও মোট সংখ্যা আপডেট করতে সময়সীমা পরিবর্তন করুন।",
    "Date range": "তারিখের সীমা", "Last 7 days": "গত ৭ দিন", "Last 30 days": "গত ৩০ দিন",
    "Last 90 days": "গত ৯০ দিন", "Last 12 months": "গত ১২ মাস", "All available time": "সব উপলভ্য সময়",
    "Custom date range": "নিজস্ব তারিখ-সীমা", "From": "শুরু", "To": "শেষ",
    "Tracking Events": "ট্র্যাকিং ইভেন্ট", "Total saved events in range": "নির্বাচিত সময়ে মোট সংরক্ষিত ইভেন্ট",
    "Page Views": "পেজ ভিউ", "Page-view events": "পেজ দেখার ইভেন্ট", "Product Views": "পণ্য ভিউ",
    "Product-detail view events": "পণ্যের বিস্তারিত দেখার ইভেন্ট", "Add to Cart": "কার্টে যোগ",
    "Cart-add events": "কার্টে যোগ করার ইভেন্ট", "Timed Sessions": "সময় রেকর্ড করা সেশন",
    "Sessions with page timing data": "পেজের সময়-তথ্যসহ সেশন", "Avg. Visible Time": "গড় দৃশ্যমান সময়",
    "Per recorded page-leave event": "প্রতিটি রেকর্ডকৃত পেজ-ত্যাগ ইভেন্টে", "Activity over time": "সময়ের সঙ্গে কার্যকলাপ",
    "Daily page views, product views and add-to-cart events.": "দিন অনুযায়ী পেজ ভিউ, পণ্য ভিউ ও কার্টে যোগ করার ইভেন্ট।",
    "Product interest": "পণ্যের প্রতি আগ্রহ", "Which product names have the most product-view events?": "কোন পণ্যগুলোর ভিউ ইভেন্ট সবচেয়ে বেশি?",
    "A product can be viewed multiple times. This chart measures view events, not units sold.": "একটি পণ্য একাধিকবার দেখা হতে পারে। এই চার্ট ভিউ ইভেন্ট গোনে, বিক্রিত ইউনিট নয়।",
    "Visible time by page": "পেজ অনুযায়ী দৃশ্যমান সময়", "Approximate time that pages stayed visible before the visitor left.": "ভিজিটর চলে যাওয়ার আগে পেজটি আনুমানিক কতক্ষণ দৃশ্যমান ছিল।",
    "Orders by status": "অবস্থা অনুযায়ী অর্ডার", "Recorded order status for the selected period.": "নির্বাচিত সময়ের রেকর্ডকৃত অর্ডার-স্ট্যাটাস।",
    "Click a segment to view orders with that status.": "সেই স্ট্যাটাসের অর্ডার দেখতে চার্টের অংশে ক্লিক করুন।",
    "Checkout funnel": "চেকআউট ফানেল", "How far visitors get through common website actions.": "সাধারণ ওয়েবসাইট কার্যক্রমে ভিজিটর কতদূর এগোয়।",
    "Preparing funnel…": "ফানেল তৈরি হচ্ছে…", "Top viewed products": "সবচেয়ে বেশি দেখা পণ্য",
    "View-event counts, not sales rankings.": "ভিউ ইভেন্টের সংখ্যা, বিক্রির র‍্যাঙ্কিং নয়।",
    "Advanced: event breakdown": "উন্নত: ইভেন্টের বিশ্লেষণ", "Count": "সংখ্যা", "Share": "অংশ",
    "PAGE EXPERIENCE": "পেজ অভিজ্ঞতা", "Time by page & last observed activity": "পেজ অনুযায়ী সময় ও সর্বশেষ রেকর্ডকৃত কার্যকলাপ",
    "Pages with timing data": "সময়-তথ্যসহ পেজ", "Page path": "পেজের পাথ", "Views": "ভিউ",
    "Avg. visible time": "গড় দৃশ্যমান সময়", "Total visible time": "মোট দৃশ্যমান সময়",
    "Sessions last seen here": "এখানে সর্বশেষ দেখা সেশন", "Calculating page activity…": "পেজের কার্যকলাপ গণনা হচ্ছে…",
    "New page-timing data will appear after a visitor leaves a page.": "ভিজিটর পেজ ছাড়ার পর নতুন পেজ-সময় তথ্য দেখা যাবে।",
    "SESSION JOURNEY": "সেশনের যাত্রা", "Recent on-site journeys": "সাম্প্রতিক ওয়েবসাইট সেশন-যাত্রা",
    "Session": "সেশন", "Recorded page path": "রেকর্ডকৃত পেজ পাথ", "Page views": "পেজ ভিউ",
    "Last recorded activity": "সর্বশেষ রেকর্ডকৃত কার্যকলাপ", "Key actions": "মূল কার্যকলাপ",
    "Preparing session journeys…": "সেশন-যাত্রার তথ্য প্রস্তুত হচ্ছে…", "PRODUCT INTELLIGENCE": "পণ্য-সংক্রান্ত বিশ্লেষণ",
    "Product performance: interest vs. test orders": "পণ্যের পারফরম্যান্স: আগ্রহ বনাম পরীক্ষামূলক অর্ডার",
    "Product": "পণ্য", "Cart adds": "কার্টে যোগ", "Observed view→cart": "দেখা থেকে কার্টে",
    "Test orders": "পরীক্ষামূলক অর্ডার", "Stock": "স্টক", "NEXT BEST CHECK": "পরবর্তী করণীয়",
    "Decision center": "সিদ্ধান্ত সহায়ক", "Preparing suggestions…": "পরামর্শ প্রস্তুত হচ্ছে…",
    "ORDER OPERATIONS": "অর্ডার পরিচালনা",
    "Search an order, review the customer and item details, and update its status from one place.": "এক জায়গা থেকে অর্ডার খুঁজুন, গ্রাহক ও পণ্যের তথ্য দেখুন এবং স্ট্যাটাস আপডেট করুন।",
    "⇩ Order report": "⇩ অর্ডার রিপোর্ট",
    "Changing a status updates the database record, but does not dispatch a courier or process any payment. Only use Delivered after confirming the real-world handover in a live business.": "স্ট্যাটাস বদলালে ডেটাবেস রেকর্ড আপডেট হয়, কিন্তু কুরিয়ার পাঠানো বা পেমেন্ট প্রক্রিয়া হয় না। বাস্তব ব্যবসায় পণ্য হস্তান্তর নিশ্চিত হলেই Delivered ব্যবহার করুন।",
    "All recorded orders": "সব রেকর্ড করা অর্ডার", "Use filters to narrow the list. Select Details for the full address and item breakdown.": "তালিকা ছোট করতে ফিল্টার ব্যবহার করুন। সম্পূর্ণ ঠিকানা ও পণ্যের বিবরণের জন্য বিস্তারিত বেছে নিন।",
    "All statuses": "সব অবস্থা", "Pending": "অপেক্ষমাণ", "Processing": "প্রক্রিয়াধীন",
    "Shipped": "পাঠানো হয়েছে", "Delivered": "ডেলিভার হয়েছে", "Cancelled": "বাতিল",
    "Items": "আইটেম", "Subtotal": "উপমোট", "Delivery": "ডেলিভারি", "Total": "সর্বমোট",
    "Placed": "তৈরি হয়েছে", "Actions": "কাজ", "Loading orders…": "অর্ডার লোড হচ্ছে…",
    "ORDER DETAILS": "অর্ডারের বিস্তারিত", "Customer, delivery and product details.": "গ্রাহক, ডেলিভারি ও পণ্যের বিস্তারিত।",
    "Open WhatsApp draft": "WhatsApp মেসেজের খসড়া খুলুন", "Print packing slip": "প্যাকিং স্লিপ প্রিন্ট করুন",
    "Status history": "স্ট্যাটাসের ইতিহাস", "History is recorded from the date this feature was enabled; earlier transitions are not available.": "এই ফিচার চালুর তারিখ থেকে ইতিহাস সংরক্ষিত; এর আগের পরিবর্তনগুলো পাওয়া যাবে না।",
    "Select an order to view its history.": "ইতিহাস দেখতে একটি অর্ডার নির্বাচন করুন।", "Done": "সম্পন্ন",
    "BUSINESS OPERATING SYSTEM": "ব্যবসা পরিচালনা ব্যবস্থা", "Operations Center": "কার্যক্রম কেন্দ্র",
    "Coordinate packing, placeholder courier records, COD reconciliation, team tasks, purchasing and returns from one workspace.": "একটি ওয়ার্কস্পেস থেকে প্যাকিং, নমুনা কুরিয়ার রেকর্ড, COD মিল, টিমের কাজ, ক্রয় ও রিটার্ন পরিচালনা করুন।",
    "Courier API disabled": "কুরিয়ার API বন্ধ", "Testing mode:": "পরীক্ষামূলক মোড:",
    "Packing queue": "প্যাকিংয়ের সারি", "Courier & COD": "কুরিয়ার ও COD", "Team tasks": "টিমের কাজ",
    "Suppliers": "সরবরাহকারী", "Purchase orders": "ক্রয় অর্ডার", "Returns & refunds": "রিটার্ন ও রিফান্ড",
    "Orders waiting for packing": "প্যাকিংয়ের অপেক্ষায় থাকা অর্ডার", "Courier records not delivered": "ডেলিভারি না হওয়া কুরিয়ার রেকর্ড",
    "COD parcels awaiting reconciliation": "হিসাব মেলানোর অপেক্ষায় COD পার্সেল", "Reference amount only; not confirmed cash.": "শুধু রেফারেন্স পরিমাণ; নিশ্চিত নগদ নয়।",
    "Open team tasks": "চলমান টিমের কাজ", "Open full order manager": "সম্পূর্ণ অর্ডার ম্যানেজার খুলুন",
    "All packing stages": "সব প্যাকিং ধাপ", "Pending confirmation": "নিশ্চিতকরণের অপেক্ষায়",
    "Processing / packing": "প্রক্রিয়াধীন / প্যাকিং", "Quick action": "দ্রুত কাজ",
    "Courier & COD desk": "কুরিয়ার ও COD ডেস্ক", "Prepare parcel records now. Live courier booking and tracking API calls are disabled.": "এখন পার্সেলের রেকর্ড তৈরি করুন। লাইভ কুরিয়ার বুকিং ও ট্র্যাকিং API বন্ধ আছে।",
    "＋ Prepare parcel": "＋ পার্সেল প্রস্তুত করুন", "All parcel statuses": "সব পার্সেল স্ট্যাটাস",
    "Draft": "খসড়া", "Ready for pickup": "পিকআপের জন্য প্রস্তুত", "Booked (manual placeholder)": "বুকড (ম্যানুয়াল নমুনা)",
    "Picked up": "পিকআপ হয়েছে", "In transit": "পথে আছে", "Delivery failed": "ডেলিভারি ব্যর্থ",
    "Returned": "ফেরত এসেছে", "All COD settlement": "সব COD নিষ্পত্তি",
    "Awaiting reconciliation": "হিসাব মেলানোর অপেক্ষায়", "Partially reconciled": "আংশিক হিসাব মিলেছে",
    "Settled": "নিষ্পত্তি হয়েছে", "Not applicable": "প্রযোজ্য নয়", "Courier / tracking": "কুরিয়ার / ট্র্যাকিং",
    "Parcel status": "পার্সেলের অবস্থা", "COD reference": "COD রেফারেন্স", "Courier fee": "কুরিয়ার ফি",
    "Settlement": "নিষ্পত্তি", "Assign work, set urgency and track completion.": "কাজ বরাদ্দ করুন, জরুরি অবস্থা নির্ধারণ করুন এবং অগ্রগতি দেখুন।",
    "Task title *": "কাজের শিরোনাম *", "Department": "বিভাগ", "Packing": "প্যাকিং",
    "Customer service": "গ্রাহকসেবা", "Inventory": "ইনভেন্টরি", "Finance": "আর্থিক হিসাব",
    "Marketing": "মার্কেটিং", "Management": "ব্যবস্থাপনা", "Assigned to": "দায়িত্বপ্রাপ্ত",
    "Unassigned": "বরাদ্দ করা হয়নি", "Priority": "অগ্রাধিকার", "Normal": "সাধারণ",
    "Low": "কম", "High": "উচ্চ", "Urgent": "জরুরি", "Due date": "শেষ তারিখ",
    "Related order (optional)": "সংশ্লিষ্ট অর্ডার (ঐচ্ছিক)", "No linked order": "কোনো সংযুক্ত অর্ডার নেই",
    "Notes": "নোট", "＋ Add task": "＋ কাজ যোগ করুন", "All task statuses": "সব কাজের অবস্থা",
    "To do": "করতে হবে", "In progress": "চলমান", "Blocked": "আটকে আছে", "Task": "কাজ",
    "Owner / due": "দায়িত্বপ্রাপ্ত / শেষ তারিখ", "Team directory": "টিম ডিরেক্টরি",
    "Add staff contacts and assign daily tasks by name. This is not a login or payroll system.": "স্টাফের যোগাযোগের তথ্য যোগ করুন এবং নাম অনুযায়ী দৈনিক কাজ দিন। এটি লগইন বা পেরোল সিস্টেম নয়।",
    "Staff name *": "স্টাফের নাম *", "Role / title": "ভূমিকা / পদবি", "Email": "ইমেইল", "Phone": "ফোন",
    "＋ Add team member": "＋ টিম সদস্য যোগ করুন", "Team member": "টিম সদস্য", "Department / role": "বিভাগ / ভূমিকা",
    "Contact": "যোগাযোগ", "Supplier directory": "সরবরাহকারী ডিরেক্টরি",
    "Keep supplier contacts in one place for future replenishment.": "ভবিষ্যৎ পুনরায় পণ্য সংগ্রহের জন্য সরবরাহকারীর তথ্য এক জায়গায় রাখুন।",
    "Supplier name *": "সরবরাহকারীর নাম *", "Contact person": "যোগাযোগের ব্যক্তি", "Address": "ঠিকানা",
    "＋ Save supplier": "＋ সরবরাহকারী সংরক্ষণ", "Supplier": "সরবরাহকারী", "Address / notes": "ঠিকানা / নোট",
    "Record replenishment orders, quantities, unit costs, expected dates and supplier references.": "পুনরায় পণ্য সংগ্রহের অর্ডার, পরিমাণ, একক খরচ, সম্ভাব্য তারিখ ও সরবরাহকারী রেফারেন্স রেকর্ড করুন।",
    "Choose supplier (optional)": "সরবরাহকারী বেছে নিন (ঐচ্ছিক)", "Choose product": "পণ্য বেছে নিন",
    "Quantity *": "পরিমাণ *", "Unit cost (৳) *": "একক খরচ (৳) *", "Order date *": "অর্ডারের তারিখ *",
    "Expected date": "সম্ভাব্য তারিখ", "Supplier reference": "সরবরাহকারীর রেফারেন্স", "Initial status": "প্রাথমিক অবস্থা",
    "Ordered": "অর্ডার করা হয়েছে", "＋ Create purchase order": "＋ ক্রয় অর্ডার তৈরি করুন",
    "Purchase order": "ক্রয় অর্ডার", "Product / quantity": "পণ্য / পরিমাণ", "Amount": "পরিমাণ",
    "Order / expected date": "অর্ডার / সম্ভাব্য তারিখ", "Returns, exchanges & refunds": "রিটার্ন, এক্সচেঞ্জ ও রিফান্ড",
    "Order *": "অর্ডার *", "Choose order": "অর্ডার বেছে নিন", "Refund amount (৳)": "রিফান্ডের পরিমাণ (৳)",
    "Reason *": "কারণ *", "Requested": "অনুরোধ করা হয়েছে", "Approved": "অনুমোদিত",
    "Awaiting returned item": "ফেরত পণ্যের অপেক্ষায়", "CATALOG MANAGEMENT": "ক্যাটালগ ব্যবস্থাপনা",
    "Products & Categories": "পণ্য ও ক্যাটাগরি",
    "Add and update products using simple forms. Hidden products stay in the database and can be restored without deleting order history.": "সহজ ফর্মে পণ্য যোগ ও আপডেট করুন। লুকানো পণ্য ডেটাবেসে থাকবে এবং অর্ডারের ইতিহাস মুছে না ফেলে পুনরায় দেখানো যাবে।",
    "＋ Add product": "＋ পণ্য যোগ করুন", "Product edits affect the live catalog": "পণ্যের পরিবর্তন লাইভ ক্যাটালগে প্রভাব ফেলে",
    "Use an English URL slug for new products. Existing product URLs are locked to avoid broken links. Always preview the product after changing its price or image.": "নতুন পণ্যের URL slug ইংরেজিতে দিন। লিংক নষ্ট হওয়া এড়াতে পুরোনো URL অপরিবর্তনীয়। দাম বা ছবি বদলানোর পর পণ্যটি প্রিভিউ করুন।",
    "Catalog Products": "ক্যাটালগের পণ্য", "All records": "সব রেকর্ড", "Visible": "দেখানো হচ্ছে",
    "Shown in the store": "স্টোরে প্রদর্শিত", "Hidden": "লুকানো", "Not shown publicly": "সবার জন্য প্রদর্শিত নয়",
    "Categories": "ক্যাটাগরি", "Catalog groups": "ক্যাটালগের গ্রুপ", "Low stock": "কম স্টক",
    "Visible, tracked products at or below their alert threshold": "দেখানো ও ট্র্যাক করা পণ্যের স্টক সতর্কতা-সীমায় বা নিচে",
    "Product catalog": "পণ্যের ক্যাটালগ", "Search products, filter by category or visibility, and make safe changes.": "পণ্য খুঁজুন, ক্যাটাগরি বা দৃশ্যমানতা দিয়ে ফিল্টার করুন এবং নিরাপদ পরিবর্তন করুন।",
    "Download catalog": "ক্যাটালগ ডাউনলোড", "All categories": "সব ক্যাটাগরি", "All visibility": "সব দৃশ্যমানতা",
    "Category": "ক্যাটাগরি", "Price": "দাম", "Cost / margin": "খরচ / মার্জিন",
    "Visibility": "দৃশ্যমানতা", "Updated": "আপডেট হয়েছে", "Loading catalog…": "ক্যাটালগ লোড হচ্ছে…",
    "Hide or restore categories without deleting the products assigned to them.": "সংশ্লিষ্ট পণ্য মুছে না ফেলে ক্যাটাগরি লুকান বা পুনরায় দেখান।",
    "＋ Add category": "＋ ক্যাটাগরি যোগ করুন", "Visible products": "দেখানো পণ্য",
    "PRODUCT CATALOG": "পণ্য ক্যাটালগ", "Add a new product": "নতুন পণ্য যোগ করুন",
    "Fields marked required must be filled in.": "আবশ্যক চিহ্নিত ঘরগুলো পূরণ করতে হবে।",
    "Product name *": "পণ্যের নাম *", "Product URL slug *": "পণ্যের URL slug *",
    "English letters, numbers and hyphens only.": "শুধু ইংরেজি অক্ষর, সংখ্যা ও হাইফেন ব্যবহার করুন।",
    "Category *": "ক্যাটাগরি *", "Choose category": "ক্যাটাগরি বেছে নিন", "Price in ৳ *": "দাম (৳) *",
    "Purchase cost per unit (৳)": "প্রতি ইউনিট ক্রয়মূল্য (৳)",
    "Private admin data; not exposed in the public product catalog.": "শুধু অ্যাডমিনের তথ্য; পাবলিক ক্যাটালগে দেখানো হয় না।",
    "Packaging cost per unit (৳)": "প্রতি ইউনিট প্যাকেজিং খরচ (৳)",
    "Optional cost for packaging one unit of this product.": "একটি পণ্য প্যাকেজিংয়ের ঐচ্ছিক খরচ।",
    "Unit label *": "এককের লেবেল *", "Display price (optional)": "প্রদর্শিত দাম (ঐচ্ছিক)",
    "Shown exactly as typed on the product card if supported by the page.": "সমর্থিত হলে পণ্যের কার্ডে হুবহু এভাবে দেখানো হবে।",
    "Image URL": "ছবির URL", "Or upload an image": "অথবা ছবি আপলোড করুন", "Image preview": "ছবির প্রিভিউ",
    "Short description": "সংক্ষিপ্ত বিবরণ", "Full description": "সম্পূর্ণ বিবরণ", "Stock quantity": "স্টকের পরিমাণ",
    "Leave blank if inventory tracking is not used.": "ইনভেন্টরি ট্র্যাকিং ব্যবহার না করলে ফাঁকা রাখুন।",
    "Low-stock alert threshold": "কম স্টকের সতর্কতা-সীমা", "SEO title": "SEO শিরোনাম",
    "SEO description": "SEO বিবরণ", "Visible on store": "স্টোরে দেখানো হবে",
    "Featured product": "বিশেষভাবে দেখানো পণ্য", "Cancel": "বাতিল", "Save product": "পণ্য সংরক্ষণ",
    "STORE STRUCTURE": "স্টোরের কাঠামো", "Add category": "ক্যাটাগরি যোগ করুন",
    "Existing category URLs stay locked to protect product links.": "পণ্যের লিংক সুরক্ষিত রাখতে বিদ্যমান ক্যাটাগরি URL অপরিবর্তনীয় থাকবে।",
    "Category name *": "ক্যাটাগরির নাম *", "URL slug *": "URL slug *", "Description": "বিবরণ",
    "Save category": "ক্যাটাগরি সংরক্ষণ", "PUBLISH WITHOUT EDITING CODE": "কোড সম্পাদনা ছাড়াই প্রকাশ করুন",
    "Create blog posts and manage their status through forms. Draft content stays unpublished until you choose to publish it.": "ফর্মের মাধ্যমে ব্লগ পোস্ট তৈরি ও স্ট্যাটাস পরিচালনা করুন। প্রকাশ না করা পর্যন্ত খসড়া পাবলিক হবে না।",
    "＋ Create post": "＋ পোস্ট তৈরি", "Publishing safely": "নিরাপদে প্রকাশ",
    "Check the title, URL slug, cover image and body before publishing. Some older static pages still need code or site-template changes; this editor manages records in the blog CMS.": "প্রকাশের আগে শিরোনাম, URL slug, কভার ছবি ও লেখা যাচাই করুন। কিছু পুরোনো স্ট্যাটিক পেজে এখনও কোড বা টেমপ্লেট পরিবর্তন দরকার; এই এডিটর ব্লগ CMS-এর রেকর্ড পরিচালনা করে।",
    "Managed homepage blocks": "পরিচালনাযোগ্য হোমপেজ ব্লক", "Hero banners and popup": "হিরো ব্যানার ও পপআপ",
    "Active promotions": "সক্রিয় প্রচার", "Visible banner and popup blocks": "দেখানো ব্যানার ও পপআপ ব্লক",
    "HOMEPAGE CONTENT CONTROL": "হোমপেজ কনটেন্ট নিয়ন্ত্রণ", "Homepage banners & announcement": "হোমপেজ ব্যানার ও ঘোষণা",
    "Change the banner image, destination link and alternative text without editing HTML. These settings update the homepage after the public page loads.": "HTML সম্পাদনা ছাড়াই ব্যানার ছবি, গন্তব্য লিংক ও বিকল্প টেক্সট পরিবর্তন করুন। পাবলিক পেজ লোড হলে পরিবর্তন প্রযোজ্য হবে।",
    "Safe editing tip": "নিরাপদ সম্পাদনার পরামর্শ", "Placement": "অবস্থান", "Image": "ছবি",
    "Destination": "গন্তব্য", "Last updated": "সর্বশেষ আপডেট", "Loading homepage content…": "হোমপেজের কনটেন্ট লোড হচ্ছে…",
    "All Posts": "সব পোস্ট", "Stored in the blog CMS": "ব্লগ CMS-এ সংরক্ষিত",
    "Published": "প্রকাশিত", "Public status": "পাবলিক স্ট্যাটাস", "Drafts": "খসড়া",
    "Not yet published": "এখনও প্রকাশিত নয়", "Publishing": "প্রকাশনা", "No-code": "কোড ছাড়া",
    "For blog content records": "ব্লগ কনটেন্ট রেকর্ডের জন্য", "Blog & content library": "ব্লগ ও কনটেন্ট লাইব্রেরি",
    "Search by title, topic or URL slug.": "শিরোনাম, বিষয় বা URL slug দিয়ে খুঁজুন।",
    "Export content list": "কনটেন্টের তালিকা এক্সপোর্ট", "Archived": "আর্কাইভ করা",
    "Post": "পোস্ট", "Topic": "বিষয়", "Loading posts…": "পোস্ট লোড হচ্ছে…",
    "HOMEPAGE CONTENT": "হোমপেজ কনটেন্ট", "Edit homepage content": "হোমপেজ কনটেন্ট সম্পাদনা",
    "Save changes, then refresh the public homepage to review them.": "পরিবর্তন সংরক্ষণ করুন, তারপর পাবলিক হোমপেজ রিফ্রেশ করে দেখুন।",
    "Internal name *": "অভ্যন্তরীণ নাম *", "A label for you in the admin panel; it is not displayed on the banner image.": "অ্যাডমিন প্যানেলে আপনার চেনার জন্য নাম; ব্যানারের ছবিতে দেখানো হয় না।",
    "Image URL *": "ছবির URL *", "You can use a path inside this website or an HTTPS image URL.": "এই ওয়েবসাইটের পাথ বা HTTPS ছবির URL ব্যবহার করা যাবে।",
    "Destination link *": "গন্তব্য লিংক *", "A relative page link or an HTTP/HTTPS address.": "আপেক্ষিক পেজ লিংক অথবা HTTP/HTTPS ঠিকানা।",
    "Alternative text": "বিকল্প টেক্সট", "Manager list order": "ম্যানেজার তালিকার ক্রম",
    "Active on the public homepage": "পাবলিক হোমপেজে সক্রিয়", "Save homepage content": "হোমপেজের কনটেন্ট সংরক্ষণ",
    "BLOG EDITOR": "ব্লগ এডিটর", "Create blog post": "ব্লগ পোস্ট তৈরি",
    "Save as draft first if content is not ready.": "কনটেন্ট প্রস্তুত না হলে আগে খসড়া হিসেবে সংরক্ষণ করুন।",
    "Post title *": "পোস্টের শিরোনাম *", "URL slug *": "URL slug *", "Topic or category": "বিষয় বা ক্যাটাগরি",
    "Publishing status": "প্রকাশনার অবস্থা", "Short excerpt": "সংক্ষিপ্ত অংশ", "Cover image URL": "কভার ছবির URL",
    "Article content *": "আর্টিকেলের কনটেন্ট *",
    "The current CMS post template preserves paragraphs. Rich-text formatting is not enabled in this editor.": "বর্তমান CMS টেমপ্লেট অনুচ্ছেদ ধরে রাখে। এই এডিটরে রিচ-টেক্সট ফরম্যাটিং নেই।",
    "Save post": "পোস্ট সংরক্ষণ", "CUSTOMER INFORMATION": "গ্রাহকের তথ্য",
    "Bring registered profiles and order-only customers into one directory, with a cautious phone/profile match and a recorded lifetime order-value estimate.": "রেজিস্টার্ড প্রোফাইল ও শুধু অর্ডারে থাকা গ্রাহকদের এক তালিকায় দেখুন। ফোন/প্রোফাইল মিলিয়ে আনুমানিক মোট অর্ডার মূল্য দেখানো হয়।",
    "⇩ Reports": "⇩ রিপোর্ট", "Testing project — values are not payments": "পরীক্ষামূলক প্রকল্প — এই মূল্য পেমেন্ট নয়",
    "Customers found": "পাওয়া গ্রাহক", "Profiles plus order-only records": "প্রোফাইল ও শুধু-অর্ডার রেকর্ড",
    "Repeat customers": "পুনরায় অর্ডার করা গ্রাহক", "Two or more non-cancelled orders": "বাতিল নয় এমন দুই বা তার বেশি অর্ডার",
    "Registered profiles": "রেজিস্টার্ড প্রোফাইল", "Profiles available to admin": "অ্যাডমিনের জন্য উপলভ্য প্রোফাইল",
    "Loaded orders": "লোড করা অর্ডার", "Customer directory": "গ্রাহক ডিরেক্টরি",
    "Search customers by name, phone or order number. Select Order history to review recorded activity.": "নাম, ফোন বা অর্ডার নম্বর দিয়ে গ্রাহক খুঁজুন। রেকর্ড করা কার্যকলাপ দেখতে অর্ডারের ইতিহাস নির্বাচন করুন।",
    "Recorded lifetime value": "রেকর্ড করা মোট অর্ডার মূল্য", "Last order": "সর্বশেষ অর্ডার",
    "Loading profiles…": "প্রোফাইল লোড হচ্ছে…", "CUSTOMER PROFILE": "গ্রাহকের প্রোফাইল",
    "TRACK BUSINESS CASH FLOW": "ব্যবসার নগদ প্রবাহ ট্র্যাক করুন",
    "Record verified money received and recorded expenses, compare order values against linked income, and review spending. Order value is not cash received, and ledger net is not the same as business profit.": "যাচাইকৃত প্রাপ্ত অর্থ ও খরচ রেকর্ড করুন, অর্ডারের মূল্য সংযুক্ত আয়ের সঙ্গে তুলনা করুন এবং ব্যয় পর্যালোচনা করুন। অর্ডারের মূল্য প্রাপ্ত নগদ নয়, আর হিসাবের নেট মানেই ব্যবসার লাভ নয়।",
    "＋ Record entry": "＋ এন্ট্রি রেকর্ড", "Testing mode — COD only": "পরীক্ষামূলক মোড — শুধু COD",
    "Confirmed Income": "নিশ্চিত আয়", "Confirmed entries only": "শুধু নিশ্চিত এন্ট্রি",
    "Confirmed Expenses": "নিশ্চিত খরচ", "Ledger Net (manual)": "হিসাবের নেট (ম্যানুয়াল)",
    "Manual ledger difference—not business profit": "ম্যানুয়াল হিসাবের পার্থক্য—ব্যবসার লাভ নয়",
    "Draft Entries": "খসড়া এন্ট্রি", "Not included in totals yet": "এখনও মোটে গণনা হয়নি",
    "Order income reconciliation": "অর্ডার-আয়ের মিল যাচাই", "Review only — not a payment or amount due": "শুধু পর্যালোচনা—পেমেন্ট বা বকেয়া নয়",
    "Order / customer": "অর্ডার / গ্রাহক", "Date": "তারিখ",
    "Selected payment method": "নির্বাচিত পেমেন্ট পদ্ধতি", "Recorded order value": "রেকর্ড করা অর্ডার মূল্য",
    "Confirmed linked income": "সংযুক্ত নিশ্চিত আয়", "Difference for review": "পর্যালোচনার জন্য পার্থক্য",
    "Action": "কাজ", "Loading order references…": "অর্ডারের রেফারেন্স লোড হচ্ছে…",
    "Income and expenses by month": "মাস অনুযায়ী আয় ও খরচ",
    "Confirmed manual entries over the latest six months.": "সর্বশেষ ছয় মাসের নিশ্চিত ম্যানুয়াল এন্ট্রি।",
    "Expense categories": "খরচের ক্যাটাগরি", "Where confirmed recorded spending is grouped.": "নিশ্চিত রেকর্ড করা খরচ কোন ক্যাটাগরিতে পড়ে।",
    "Finance ledger": "আর্থিক হিসাবের খাতা", "Download report": "রিপোর্ট ডাউনলোড",
    "All types": "সব ধরন", "Income": "আয়", "Expense": "খরচ", "All record statuses": "সব রেকর্ড স্ট্যাটাস",
    "Confirmed": "নিশ্চিত", "Void": "বাতিল/অকার্যকর", "Type": "ধরন",
    "Category / description": "ক্যাটাগরি / বিবরণ", "Reference": "রেফারেন্স", "Loading finance ledger…": "আর্থিক হিসাব লোড হচ্ছে…",
    "FINANCE LEDGER": "আর্থিক হিসাবের খাতা", "Record an entry": "একটি এন্ট্রি রেকর্ড করুন",
    "This records an entry for your own bookkeeping; it does not process any payment.": "এটি শুধু হিসাব রাখার জন্য রেকর্ড; কোনো পেমেন্ট প্রক্রিয়া করে না।",
    "Entry type *": "এন্ট্রির ধরন *", "Income received": "প্রাপ্ত আয়",
    "Income should only be entered after the payment has actually been received.": "প্রকৃত পেমেন্ট পাওয়ার পরেই আয় এন্ট্রি করুন।",
    "Amount (৳) *": "পরিমাণ (৳) *", "Description": "বিবরণ", "Reference (optional)": "রেফারেন্স (ঐচ্ছিক)",
    "Record status": "রেকর্ডের অবস্থা", "Draft — not counted yet": "খসড়া — এখনও গণনা হয়নি",
    "Confirmed — checked by me": "নিশ্চিত — আমি যাচাই করেছি", "Void — exclude from totals": "অকার্যকর — মোট থেকে বাদ",
    "Link to an order (optional)": "অর্ডারের সঙ্গে যুক্ত করুন (ঐচ্ছিক)",
    "Links this ledger entry to an existing order for reference only.": "শুধু রেফারেন্সের জন্য এই এন্ট্রিকে বিদ্যমান অর্ডারের সঙ্গে যুক্ত করে।",
    "EXPORT YOUR DATA": "আপনার ডেটা এক্সপোর্ট করুন", "Reports & Downloads": "রিপোর্ট ও ডাউনলোড",
    "Create a useful report in a few clicks. Preview it first, then download CSV or Excel, or print/save it as PDF.": "কয়েকটি ক্লিকেই দরকারি রিপোর্ট তৈরি করুন। আগে প্রিভিউ দেখুন, তারপর CSV/Excel ডাউনলোড বা PDF হিসেবে প্রিন্ট/সংরক্ষণ করুন।",
    "↻ Reload report": "↻ রিপোর্ট রিলোড", "Use reports for decisions, not just totals": "শুধু মোট সংখ্যা নয়, সিদ্ধান্ত নিতেও রিপোর্ট ব্যবহার করুন",
    "Build a report": "রিপোর্ট তৈরি করুন", "Choose what you want to understand or share.": "কী বুঝতে বা শেয়ার করতে চান তা বেছে নিন।",
    "Report type": "রিপোর্টের ধরন", "Website analytics events": "ওয়েবসাইট অ্যানালিটিক্স ইভেন্ট",
    "Orders report": "অর্ডার রিপোর্ট", "Products & inventory snapshot": "পণ্য ও ইনভেন্টরির সারাংশ",
    "Homepage content settings": "হোমপেজ কনটেন্ট সেটিংস", "Finance entries": "আর্থিক এন্ট্রি",
    "From date": "শুরুর তারিখ", "To date": "শেষ তারিখ",
    "Include customer phone and email in order export": "অর্ডার এক্সপোর্টে গ্রাহকের ফোন ও ইমেইল যুক্ত করুন",
    "Sensitive": "সংবেদনশীল", "Generate preview": "প্রিভিউ তৈরি", "⇩ Download CSV": "⇩ CSV ডাউনলোড",
    "▦ Download Excel": "▦ Excel ডাউনলোড", "▤ Print / Save PDF": "▤ প্রিন্ট / PDF সংরক্ষণ",
    "For PDF, your browser's print window opens. Choose “Save as PDF” as the destination. Excel export requires the SheetJS library to load; CSV remains available if it cannot load.": "PDF-এর জন্য ব্রাউজারের প্রিন্ট উইন্ডো খুলবে। গন্তব্য হিসেবে “Save as PDF” বেছে নিন। Excel এক্সপোর্টের জন্য SheetJS লাইব্রেরি লোড হওয়া দরকার; এটি না হলে CSV ব্যবহার করা যাবে।",
    "REPORT PREVIEW": "রিপোর্ট প্রিভিউ", "Website Analytics Report": "ওয়েবসাইট অ্যানালিটিক্স রিপোর্ট",
    "0 records": "০টি রেকর্ড", "Halal Food Report": "Halal Food রিপোর্ট",
    "Select a report type to begin.": "শুরু করতে রিপোর্টের ধরন বেছে নিন।", "Report": "রিপোর্ট",
    "Preparing report…": "রিপোর্ট প্রস্তুত হচ্ছে…", "CONTROL, SECURITY & RECOVERY": "নিয়ন্ত্রণ, নিরাপত্তা ও পুনরুদ্ধার",
    "Settings & Security": "সেটিংস ও নিরাপত্তা",
    "Check database access, adjust your admin display preference, review activity history and download a manual data export.": "ডেটাবেস অ্যাক্সেস পরীক্ষা করুন, অ্যাডমিন প্রদর্শনের পছন্দ বদলান, কার্যকলাপের ইতিহাস দেখুন এবং ম্যানুয়াল ডেটা এক্সপোর্ট ডাউনলোড করুন।",
    "↻ Check connections": "↻ সংযোগ পরীক্ষা", "Security first": "নিরাপত্তা সবার আগে",
    "The admin pages require the authorized admin email and completed MFA (AAL2). Keep exported data private. A downloaded export is not an automatic backup or one-click restore.": "অ্যাডমিন পেজে অনুমোদিত ইমেইল ও সম্পন্ন MFA (AAL2) দরকার। এক্সপোর্ট করা ডেটা ব্যক্তিগত রাখুন। ডাউনলোড করা এক্সপোর্ট স্বয়ংক্রিয় ব্যাকআপ বা এক-ক্লিক রিস্টোর নয়।",
    "Admin account & access": "অ্যাডমিন অ্যাকাউন্ট ও অ্যাক্সেস", "The current authorized account used by this panel.": "এই প্যানেলে ব্যবহৃত বর্তমান অনুমোদিত অ্যাকাউন্ট।",
    "MFA required": "MFA আবশ্যক", "Authorized admin": "অনুমোদিত অ্যাডমিন", "Restricted": "সীমাবদ্ধ",
    "Session assurance": "সেশনের নিরাপত্তা যাচাই",
    "Every new admin page verifies the active Supabase session and MFA assurance before loading operational data.": "অপারেশনাল ডেটা লোড করার আগে প্রতিটি অ্যাডমিন পেজ সক্রিয় Supabase সেশন ও MFA যাচাই করে।",
    "Access roles": "অ্যাক্সেসের ভূমিকা",
    "Current implementation is restricted to the single owner/admin account. Staff and manager roles are a future extension, not enabled yet.": "বর্তমান ব্যবস্থা একক মালিক/অ্যাডমিন অ্যাকাউন্টে সীমিত। স্টাফ ও ম্যানেজার ভূমিকা ভবিষ্যতের উন্নয়ন; এখনও চালু নয়।",
    "Admin interface preferences": "অ্যাডমিন ইন্টারফেসের পছন্দ",
    "These changes affect your panel display, not the public store.": "এই পরিবর্তন শুধু আপনার প্যানেলের প্রদর্শনে প্রভাব ফেলবে, পাবলিক স্টোরে নয়।",
    "Compact tables": "সংক্ষিপ্ত টেবিল", "Show more rows on screen with reduced spacing.": "কম ফাঁকা জায়গা রেখে স্ক্রিনে বেশি সারি দেখান।",
    "Brand & layout": "ব্র্যান্ড ও লেআউট",
    "Colors, charts and spacing follow the Halal Food cream, navy and earthy-orange palette.": "রং, চার্ট ও স্পেসিং Halal Food-এর ক্রিম, নেভি ও মাটির-কমলা রঙের প্যালেট অনুসরণ করে।",
    "Database connection check": "ডেটাবেস সংযোগ পরীক্ষা",
    "Read-only checks confirm that each data table is accessible to this admin session.": "শুধু-পঠন পরীক্ষা নিশ্চিত করে যে এই অ্যাডমিন সেশন থেকে প্রতিটি ডেটা টেবিলে প্রবেশ করা যায়।",
    "Checking…": "পরীক্ষা হচ্ছে…", "Data area": "ডেটার অংশ", "Connection status": "সংযোগের অবস্থা", "Records": "রেকর্ড",
    "Backup & recovery": "ব্যাকআপ ও পুনরুদ্ধার",
    "Download a private JSON export of selected operational records for safekeeping.": "নিরাপদে রাখার জন্য নির্বাচিত অপারেশনাল রেকর্ডের ব্যক্তিগত JSON এক্সপোর্ট ডাউনলোড করুন।",
    "Manual export only": "শুধু ম্যানুয়াল এক্সপোর্ট",
    "The export may contain customer contact details. Keep it in a secure location. It does not include passwords, secret keys or an automatic restore mechanism. Use database-native backups for disaster recovery.": "এক্সপোর্টে গ্রাহকের যোগাযোগের তথ্য থাকতে পারে। নিরাপদ জায়গায় রাখুন। এতে পাসওয়ার্ড, সিক্রেট কী বা স্বয়ংক্রিয় রিস্টোর ব্যবস্থা নেই। দুর্যোগ-পরবর্তী পুনরুদ্ধারের জন্য ডেটাবেসের নিজস্ব ব্যাকআপ ব্যবহার করুন।",
    "⇩ Download operational data export": "⇩ অপারেশনাল ডেটা এক্সপোর্ট ডাউনলোড", "Activity log": "কার্যকলাপের লগ",
    "Recent edits and exports performed from this admin panel. Logs are append-only through the app's current access policy.": "এই অ্যাডমিন প্যানেল থেকে করা সাম্প্রতিক সম্পাদনা ও এক্সপোর্ট। বর্তমান অ্যাক্সেস নীতি অনুযায়ী লগে নতুন এন্ট্রি যোগ হয়।",
    "Time": "সময়", "Summary": "সারাংশ", "Loading activity…": "কার্যকলাপের লগ লোড হচ্ছে…",
    "Some edits made in the legacy admin panel may not yet be represented in this new activity log.": "পুরোনো অ্যাডমিন প্যানেলের কিছু সম্পাদনা এই নতুন অ্যাক্টিভিটি লগে নাও থাকতে পারে।",
    "No matching orders": "মিলে যাওয়া অর্ডার নেই", "Try another status or a shorter search term.": "অন্য স্ট্যাটাস বা ছোট সার্চ শব্দ ব্যবহার করুন।",
    "No products found": "কোনো পণ্য পাওয়া যায়নি", "Try a different search or add a product.": "অন্যভাবে খুঁজুন অথবা পণ্য যোগ করুন।",
    "No categories": "কোনো ক্যাটাগরি নেই", "Add a category before creating products.": "পণ্য তৈরির আগে একটি ক্যাটাগরি যোগ করুন।",
    "No activity has been recorded yet": "এখনও কোনো কার্যকলাপ রেকর্ড হয়নি",
    "Successful changes made from the new admin pages will be logged here.": "নতুন অ্যাডমিন পেজে সফল পরিবর্তন এখানে লগ হবে।",
    "Information refreshed.": "তথ্য রিফ্রেশ হয়েছে।", "Could not refresh this report.": "এই রিপোর্ট রিফ্রেশ করা যায়নি।",
    "The page could not load its data. ": "পেজের ডেটা লোড করা যায়নি। ",
    "Status could not be saved: ": "স্ট্যাটাস সংরক্ষণ করা যায়নি: ",
    "Order status and history updated.": "অর্ডারের স্ট্যাটাস ও ইতিহাস আপডেট হয়েছে।",
    "Could not load data. Please refresh and try again.": "ডেটা লোড করা যায়নি। রিফ্রেশ করে আবার চেষ্টা করুন।",
    "Loading customer accounts…": "গ্রাহক অ্যাকাউন্ট লোড হচ্ছে…", "No customer profiles found yet.": "এখনও কোনো গ্রাহক প্রোফাইল পাওয়া যায়নি।",
    "No orders yet.": "এখনও কোনো অর্ডার নেই.", "Sign in": "সাইন ইন", "Admin Login": "অ্যাডমিন লগইন",
    "Authorized account: halalfoodbd.official@gmail.com": "অনুমোদিত অ্যাকাউন্ট: halalfoodbd.official@gmail.com",
    "Admin password": "অ্যাডমিন পাসওয়ার্ড", "Logout": "লগআউট", "Halal Food — Admin": "Halal Food — অ্যাডমিন",
    "Secure admin sign-in": "নিরাপদ অ্যাডমিন সাইন-ইন", "Verify with your authenticator app to continue.": "চালিয়ে যেতে অথেনটিকেটর অ্যাপ দিয়ে যাচাই করুন।",
    "Scan this QR code using the authenticator app. This setup is for the Halal Food website admin login, separate from your Supabase Dashboard login.": "অথেনটিকেটর অ্যাপ দিয়ে এই QR কোড স্ক্যান করুন। এটি Halal Food ওয়েবসাইট অ্যাডমিন লগইনের সেটআপ, Supabase Dashboard লগইন থেকে আলাদা।",
    "If QR scanning is unavailable, enter this setup key manually:": "QR স্ক্যান করা না গেলে সেটআপ কীটি হাতে লিখুন:",
    "6-digit authenticator code": "৬ সংখ্যার অথেনটিকেটর কোড", "Verify and enable MFA": "যাচাই করে MFA চালু করুন",
    "Enter the current 6-digit code from your authenticator app.": "অথেনটিকেটর অ্যাপের বর্তমান ৬ সংখ্যার কোড লিখুন।",
    "Verify code": "কোড যাচাই", "Cancel and sign out": "বাতিল করে সাইন আউট",
    "Dashboard": "ড্যাশবোর্ড",
    "Manage products, customer orders, website content, daily operations and financial records. Use Business Overview for priorities and Finance & Cash Flow for verified income and expense entries.": "পণ্য, গ্রাহকের অর্ডার, ওয়েবসাইট কনটেন্ট, দৈনন্দিন কার্যক্রম ও আর্থিক রেকর্ড পরিচালনা করুন। অগ্রাধিকার দেখতে Business Overview এবং যাচাইকৃত আয়-খরচের জন্য Finance & Cash Flow ব্যবহার করুন।",
    "Blog Posts": "ব্লগ পোস্ট", "Customer Orders": "গ্রাহকের অর্ডার", "All Orders": "সব অর্ডার",
    "Business Overview": "ব্যবসার সারসংক্ষেপ", "Marked Delivered": "ডেলিভার্ড চিহ্নিত",
    "Recorded status, not courier verification": "রেকর্ড করা স্ট্যাটাস; কুরিয়ার যাচাই নয়",
    "Not proof of cash received": "নগদ অর্থ পাওয়ার প্রমাণ নয়", "Website Analytics": "ওয়েবসাইট অ্যানালিটিক্স",
    "First-party events saved in Supabase · last 7 days": "Supabase-এ সংরক্ষিত প্রথম-পক্ষের ইভেন্ট · গত ৭ দিন",
    "Add to cart": "কার্টে যোগ", "Checkout starts": "চেকআউট শুরু",
    "Product Catalog": "পণ্য ক্যাটালগ", "Create, update, feature, or hide products. Changes are saved to Supabase.": "পণ্য তৈরি, আপডেট, ফিচার বা লুকান। পরিবর্তন Supabase-এ সংরক্ষিত হয়।",
    "Catalog products": "ক্যাটালগের পণ্য", "Refresh CMS": "CMS রিফ্রেশ",
    "Category Manager": "ক্যাটাগরি ম্যানেজার",
    "Rename, reorder, update artwork, or hide a category without deleting its products.": "পণ্য মুছে না ফেলে ক্যাটাগরির নাম, ক্রম, ছবি বদলান বা লুকান।",
    "— categories": "— ক্যাটাগরি", "Loading categories…": "ক্যাটাগরি লোড হচ্ছে…",
    "Blog & Content": "ব্লগ ও কনটেন্ট",
    "Write a post, add a cover image, save drafts, and publish to the live blog.": "পোস্ট লিখুন, কভার ছবি যোগ করুন, খসড়া সংরক্ষণ করুন এবং লাইভ ব্লগে প্রকাশ করুন।",
    "CATALOG": "ক্যাটালগ", "Add product": "পণ্য যোগ করুন", "Product name": "পণ্যের নাম",
    "Product slug": "পণ্যের slug", "Existing URLs are locked to prevent broken links. New products can use a custom slug.": "লিংক নষ্ট হওয়া এড়াতে পুরোনো URL অপরিবর্তনীয়। নতুন পণ্যে কাস্টম slug দেওয়া যাবে।",
    "Price (৳)": "দাম (৳)", "Unit label": "এককের লেবেল", "Cover image": "কভার ছবি",
    "JPG, PNG, WebP or AVIF · max 5 MB": "JPG, PNG, WebP বা AVIF · সর্বোচ্চ ৫ MB",
    "Or image URL": "অথবা ছবির URL", "Stock quantity (0–1,000)": "স্টকের পরিমাণ (০–১,০০০)",
    "Whole numbers only. Sales reduce the stock; 0 means out of stock.": "শুধু পূর্ণসংখ্যা। বিক্রিতে স্টক কমবে; ০ মানে স্টক শেষ।",
    "Display order": "প্রদর্শনের ক্রম", "Feature on the homepage": "হোমপেজে ফিচার করুন",
    "Category name": "ক্যাটাগরির নাম", "Category slug": "ক্যাটাগরির slug", "Category image": "ক্যাটাগরির ছবি",
    "PUBLISHING": "প্রকাশনা", "Post title": "পোস্টের শিরোনাম", "Post slug": "পোস্ট slug",
    "Existing article URLs are locked; new posts can use a custom slug.": "পুরোনো আর্টিকেলের URL অপরিবর্তনীয়; নতুন পোস্টে কাস্টম slug দেওয়া যাবে।",
    "Topic/category": "বিষয়/ক্যাটাগরি", "Excerpt": "সংক্ষিপ্ত অংশ", "Cover preview": "কভার প্রিভিউ",
    "Article content": "আর্টিকেলের কনটেন্ট", "Paragraphs are preserved in the public article page.": "পাবলিক আর্টিকেলে অনুচ্ছেদগুলো অক্ষুণ্ণ থাকে।",
    "Customer Accounts": "গ্রাহকের অ্যাকাউন্ট", "Registered customer profiles · visible to the authorized admin only": "রেজিস্টার্ড গ্রাহক প্রোফাইল · শুধু অনুমোদিত অ্যাডমিনের জন্য",
    "Refresh customers": "গ্রাহক রিফ্রেশ", "Customer name": "গ্রাহকের নাম", "Account ID": "অ্যাকাউন্ট ID",
    "Registered": "নিবন্ধিত", "Customer Order History": "গ্রাহকের অর্ডারের ইতিহাস",
    "Choose a customer email to review their orders without leaving the admin panel.": "অ্যাডমিন প্যানেল না ছেড়ে অর্ডার দেখতে গ্রাহকের ইমেইল বেছে নিন।",
    "Load orders to choose a customer": "গ্রাহক বেছে নিতে অর্ডার লোড করুন", "Products subtotal": "পণ্যের উপমোট",
    "Delivery area": "ডেলিভারি এলাকা", "Customer order history will appear here.": "গ্রাহকের অর্ডারের ইতিহাস এখানে দেখা যাবে।",
    "Payment": "পেমেন্ট"
  };

  const textState = new WeakMap();
  const attrState = new WeakMap();
  const attrNames = ["placeholder", "title", "aria-label", "alt"];
  const ignoredTags = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE"]);

  function language() {
    try { return localStorage.getItem("hf_admin_language") === "bn" ? "bn" : "en"; }
    catch (_) { return "en"; }
  }

  function translated(value, lang) {
    return lang === "bn" ? (translations[value] || value) : value;
  }

  function isPicker(node) {
    const el = node.nodeType === 1 ? node : node.parentElement;
    return !!el?.closest?.(".hf-language-picker");
  }

  function translateText(node, lang) {
    if (!node || node.nodeType !== 3 || isPicker(node)) return;
    const parent = node.parentElement;
    if (!parent || ignoredTags.has(parent.tagName)) return;
    let state = textState.get(node);
    const current = node.nodeValue || "";
    if (!state || current !== state.last) {
      state = { source: current, last: current };
      textState.set(node, state);
    }
    const trimmed = state.source.trim();
    if (!trimmed) return;
    const translatedText = translated(trimmed, lang);
    const leading = state.source.match(/^\s*/)?.[0] || "";
    const trailing = state.source.match(/\s*$/)?.[0] || "";
    const output = leading + translatedText + trailing;
    if (node.nodeValue !== output) node.nodeValue = output;
    state.last = output;
  }

  function translateElement(el, lang) {
    if (!el || el.nodeType !== 1 || isPicker(el) || ignoredTags.has(el.tagName)) return;
    let saved = attrState.get(el);
    if (!saved) { saved = {}; attrState.set(el, saved); }
    for (const name of attrNames) {
      if (!el.hasAttribute(name)) continue;
      const current = el.getAttribute(name) || "";
      let state = saved[name];
      if (!state || current !== state.last) {
        state = { source: current, last: current };
        saved[name] = state;
      }
      const output = translated(state.source, lang);
      if (output !== current) el.setAttribute(name, output);
      state.last = output;
    }
  }

  function translateTree(root, lang = language()) {
    if (!root) return;
    if (root.nodeType === 3) { translateText(root, lang); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) translateElement(root, lang);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (isPicker(node)) return NodeFilter.FILTER_REJECT;
        let p = node.parentElement;
        while (p && p !== root) {
          if (ignoredTags.has(p.tagName)) return NodeFilter.FILTER_REJECT;
          p = p.parentElement;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while ((node = walker.nextNode())) translateText(node, lang);
    if (root.querySelectorAll) root.querySelectorAll("*").forEach(el => translateElement(el, lang));
  }

  function injectStyles() {
    if (document.getElementById("hfLanguageStyles")) return;
    const style = document.createElement("style");
    style.id = "hfLanguageStyles";
    style.textContent =
      ".hf-language-picker{display:inline-flex;align-items:center;gap:7px;flex:0 0 auto;white-space:nowrap}" +
      ".hf-language-picker>span{font-size:10px;font-weight:800;letter-spacing:.02em;color:var(--hf-muted,#96A6BE)}" +
      ".hf-language-picker select{max-width:116px;min-width:84px;height:38px;padding:6px 25px 6px 9px;border:1px solid var(--hf-border,#30425C);border-radius:10px;background:var(--hf-surface,#111C2E);color:var(--hf-navy,#E6EDF8);font:600 11px Inter,system-ui,sans-serif}" +
      "body>header .hf-language-picker{margin-left:auto;margin-right:10px}" +
      "body>header .hf-language-picker>span{color:#B9C6D8}" +
      "body>header .hf-language-picker select{background:#17243A;color:#F2F6FF;border-color:#30425C}" +
      "html[data-admin-theme=\"light\"] .hf-language-picker select{background:#FFFDF8;color:#2B2A3D;border-color:#E5E0D6}" +
      "@media(max-width:620px){.admin-topbar{gap:6px!important}.hf-language-picker{gap:4px}.hf-language-picker>span{display:none}.hf-language-picker select{min-width:70px;width:75px;max-width:75px;padding:6px 4px;font-size:10px}.admin-topbar .hf-language-picker{order:3}}";
    document.head.appendChild(style);
  }

  function ensurePicker() {
    const headers = [];
    const modern = document.querySelector(".admin-topbar");
    const legacy = document.querySelector("body>header");
    if (modern) headers.push(modern);
    if (legacy && legacy !== modern) headers.push(legacy);
    headers.forEach(header => {
      if (header.querySelector(":scope > .hf-language-picker")) return;
      const wrap = document.createElement("label");
      wrap.className = "hf-language-picker";
      wrap.innerHTML = '<span>Language</span><select aria-label="Language" title="Language"><option value="en">English</option><option value="bn">বাংলা</option></select>';
      const select = wrap.querySelector("select");
      select.value = language();
      select.addEventListener("change", () => {
        try { localStorage.setItem("hf_admin_language", select.value); } catch (_) {}
        applyLanguage();
      });
      const anchor = header.querySelector("#themeToggle") || header.querySelector("#logout") || null;
      if (anchor) header.insertBefore(wrap, anchor);
      else header.appendChild(wrap);
    });
  }

  function applyLanguage() {
    const lang = language();
    document.documentElement.lang = lang === "bn" ? "bn" : "en";
    injectStyles();
    ensurePicker();
    translateTree(document.documentElement, lang);
    document.querySelectorAll(".hf-language-picker select").forEach(select => { select.value = lang; });
    document.documentElement.dataset.adminLanguage = lang;
  }

  function boot() {
    injectStyles();
    ensurePicker();
    applyLanguage();
    const observer = new MutationObserver(records => {
      const lang = language();
      for (const record of records) {
        if (record.type === "characterData") translateText(record.target, lang);
        for (const node of record.addedNodes || []) {
          if (node.nodeType === 1 && node.matches?.(".hf-language-picker")) continue;
          translateTree(node, lang);
        }
      }
      ensurePicker();
      document.querySelectorAll(".hf-language-picker select").forEach(select => { select.value = lang; });
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
  window.HFAdminLanguage = { language, applyLanguage, translateTree, dictionary: translations };
})();