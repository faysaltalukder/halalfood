(() => {
  "use strict";

  const translations = {
    "AI Conversations": "এআই কথোপকথন",
    "CUSTOMER CARE INTELLIGENCE": "গ্রাহকসেবা বুদ্ধিমত্তা",
    "Read complete customer-care threads, understand the context behind each answer and keep private review notes for the team.": "গ্রাহকসেবার সম্পূর্ণ কথোপকথন পড়ুন, প্রতিটি উত্তরের প্রেক্ষাপট বুঝুন এবং দলের জন্য ব্যক্তিগত পর্যালোচনা নোট রাখুন।",
    "Private conversation workspace": "ব্যক্তিগত কথোপকথন কর্মক্ষেত্র",
    "Threads are stored securely for authorized review. Uploaded image files and raw network identifiers are not stored. Email addresses and mobile numbers are masked in saved message text.": "অনুমোদিত পর্যালোচনার জন্য কথোপকথন নিরাপদে রাখা হয়। আপলোড করা ছবির ফাইল বা নেটওয়ার্ক পরিচিতি সংরক্ষণ করা হয় না। সংরক্ষিত বার্তায় ইমেইল ও মোবাইল নম্বর আড়াল করা হয়।",
    "Total conversations": "মোট কথোপকথন",
    "Latest records loaded": "সর্বশেষ রেকর্ড লোড হয়েছে",
    "Open reviews": "পর্যালোচনার অপেক্ষায়",
    "Threads awaiting review": "যেসব কথোপকথন পর্যালোচনা বাকি",
    "Reviewed": "পর্যালোচিত",
    "Reviewed conversation threads": "পর্যালোচনা সম্পন্ন কথোপকথন",
    "Archived": "আর্কাইভ করা",
    "Archived for reference": "তথ্যসূত্রের জন্য সংরক্ষিত",
    "Conversation inbox": "কথোপকথন ইনবক্স",
    "Select a customer thread to read the full exchange.": "সম্পূর্ণ কথোপকথন পড়তে একটি গ্রাহক থ্রেড নির্বাচন করুন।",
    "Search customer questions and replies…": "গ্রাহকের প্রশ্ন ও উত্তর খুঁজুন…",
    "All statuses": "সব অবস্থা",
    "Open": "খোলা",
    "Open — needs review": "খোলা — পর্যালোচনা প্রয়োজন",
    "Reviewed — checked by admin": "পর্যালোচিত — অ্যাডমিন যাচাই করেছেন",
    "Archived — keep for reference": "আর্কাইভ — তথ্যসূত্র হিসেবে রাখুন",
    "THREAD REVIEW": "থ্রেড পর্যালোচনা",
    "Select a conversation": "একটি কথোপকথন নির্বাচন করুন",
    "The complete customer and assistant messages will appear here.": "গ্রাহক ও সহকারীর সম্পূর্ণ বার্তা এখানে দেখা যাবে।",
    "Choose a conversation from the inbox to inspect the full thread.": "সম্পূর্ণ থ্রেড দেখতে ইনবক্স থেকে একটি কথোপকথন বেছে নিন।",
    "Private admin notes": "ব্যক্তিগত অ্যাডমিন নোট",
    "Record the issue, context, or any follow-up needed. These notes are not shown to customers.": "সমস্যা, প্রেক্ষাপট বা পরবর্তী করণীয় লিখুন। এই নোট গ্রাহক দেখতে পাবেন না।",
    "Save review": "পর্যালোচনা সংরক্ষণ",
    "Export thread": "থ্রেড এক্সপোর্ট",
    "CUSTOMER": "গ্রাহক",
    "HALAL FOOD AI": "হালাল ফুড এআই",
    "No conversations match this filter.": "এই ফিল্টারে কোনো কথোপকথন পাওয়া যায়নি।",
    "No messages were saved for this thread.": "এই থ্রেডের কোনো বার্তা সংরক্ষিত হয়নি।",
    "Conversation could not be opened.": "কথোপকথন খোলা যায়নি।",
    "Conversations could not be loaded.": "কথোপকথন লোড করা যায়নি।",
    "Conversation review saved.": "কথোপকথনের পর্যালোচনা সংরক্ষিত হয়েছে।",
    "Review was not saved.": "পর্যালোচনা সংরক্ষণ করা যায়নি।",
    "This thread has not been marked as reviewed.": "এই থ্রেডকে এখনো পর্যালোচিত হিসেবে চিহ্নিত করা হয়নি।",
    "AAL2 protected": "AAL2 নিরাপত্তা সক্রিয়",
    "Refresh": "রিফ্রেশ",
    "Model:": "মডেল:",
    "Customer image attached (image file not retained)": "গ্রাহক ছবি সংযুক্ত করেছিলেন (ছবির ফাইল রাখা হয়নি)",
    "Started": "শুরু",
    "Last activity": "সর্বশেষ কার্যক্রম",
    "Live store operations": "লাইভ স্টোর পরিচালনা",
    "Customer care, orders and catalog are connected to the live store workspace.": "গ্রাহকসেবা, অর্ডার ও পণ্যতালিকা লাইভ স্টোর কর্মক্ষেত্রের সঙ্গে সংযুক্ত।",
    "Loading conversation…": "কথোপকথন লোড হচ্ছে…",
    "Conversation summary": "কথোপকথনের সারসংক্ষেপ",
    "POS Management": "কাউন্টার বিক্রয় (POS) ব্যবস্থাপনা",
    "POS Management": "কাউন্টার বিক্রয় (POS) ব্যবস্থাপনা",
    "Incomplete Orders": "অসম্পূর্ণ অর্ডার",
    "Add Supplier": "সরবরাহকারী যোগ করুন",
    "Purchase List": "ক্রয় তালিকা",
    "Payment History": "অর্থ পরিশোধের ইতিহাস",
    "Add Product": "পণ্য যোগ করুন",
    "All Products": "সব পণ্য",
    "Barcode Generation": "বারকোড তৈরি",
    "Product Reviews": "পণ্যের পর্যালোচনা",
    "WhatsApp Inbox": "হোয়াটসঅ্যাপ বার্তা",
    "Messenger Inbox": "মেসেঞ্জার বার্তা",
    "Facebook Publishing": "ফেসবুকে প্রকাশনা",
    "Meta Ads Review": "মেটা বিজ্ঞাপন পর্যালোচনা",
    "YouTube Publishing": "ইউটিউবে প্রকাশনা",
    "Pricing & Profit Calculator": "মূল্য ও মুনাফা গণক",
    "Website Publisher": "ওয়েবসাইট প্রকাশনা",
    "Tracking Controls": "তথ্য অনুসরণ নিয়ন্ত্রণ",
    "Choose your theme": "আপনার পছন্দের রং-সজ্জা বেছে নিন",
    "Sidebar and workspace change together": "পাশের মেনু ও কর্মক্ষেত্রের রং একসঙ্গে বদলাবে",
    "Choose workspace color theme": "কর্মক্ষেত্রের রং-সজ্জা বেছে নিন",
    "Close theme picker": "রং-সজ্জা নির্বাচন বন্ধ করুন",
    "Theme": "রং-সজ্জা",
    "Help": "সহায়তা",
    "Night": "রাত",
    "Standard": "সাধারণ",
    "Modern": "আধুনিক",
    "Balanced": "ভারসাম্যপূর্ণ",
    "Classic Comfort": "চিরচেনা স্বস্তি",
    "Celestial": "আকাশমণ্ডল",
    "Premium": "আভিজাত্যপূর্ণ",
    "Corporate Standard": "করপোরেট মানদণ্ড",
    "Ocean Calm": "সমুদ্রের শান্তি",
    "Berry Rose": "বেরি গোলাপি",
    "Plum Amethyst": "প্লাম অ্যামেথিস্ট",
    "Coral Peach": "প্রবাল-পীচ",
    "Warm Harvest": "উষ্ণ ফসল",
    "Royal Indigo": "রাজকীয় নীল",
    "Coastal Blue": "উপকূলীয় নীল",
    "Copper Espresso": "তামাটে কফি",
    "Forest Sage": "বন-ঋষি",
    "Olive Citrus": "জলপাই-সাইট্রাস",
    "Golden Prestige": "সোনালি আভিজাত্য",
    "Solar Journey": "সূর্যযাত্রা",
    "Lunar Journey": "চন্দ্রযাত্রা",
    "Traditional · familiar · straightforward": "ঐতিহ্যবাহী · পরিচিত · সহজবোধ্য",
    "Expressive · contemporary": "প্রকাশভঙ্গিমায় সমসাময়িক",
    "Cool · Calm · Contemporary": "শীতল · শান্ত · সমসাময়িক",
    "Expressive · Soft · Sophisticated": "স্নিগ্ধ · কোমল · পরিশীলিত",
    "Creative · Refined · Expressive": "সৃজনশীল · পরিশীলিত · প্রকাশময়",
    "Warm · Friendly · Expressive": "উষ্ণ · বন্ধুত্বপূর্ণ · প্রাণবন্ত",
    "Warm · Classic · Premium": "উষ্ণ · চিরায়ত · আভিজাত্যপূর্ণ",
    "Indigo · Refined · Confident": "নীলাভ · পরিশীলিত · আত্মবিশ্বাসী",
    "Clear · Trustworthy · Coastal": "স্বচ্ছ · নির্ভরযোগ্য · উপকূলীয়",
    "Warm · Refined · Business": "উষ্ণ · পরিশীলিত · ব্যবসায়িক",
    "Natural · Grounded · Quiet": "প্রাকৃতিক · স্থির · শান্ত",
    "Natural · Classic · Composed": "প্রাকৃতিক · চিরায়ত · সংযত",
    "Royal Gold · Refined · Premium": "রাজকীয় সোনা · পরিশীলিত · আভিজাত্যপূর্ণ",
    "Dynamic Day · Sunrise · Golden Hour": "দিনের পরিবর্তন · সূর্যোদয় · সোনালি সময়",
    "Dynamic Night · Moonlight · Midnight": "রাতের পরিবর্তন · চাঁদের আলো · মধ্যরাত",
    "Time-aware · atmospheric · living sky": "সময়নির্ভর · আবহময় · পরিবর্তনশীল আকাশ",
    "17 of 17 themes available · All themes are available to every administrator; your choice is saved to this browser for this account.": "১৭টির মধ্যে ১৭টি রং-সজ্জা উপলভ্য। সব প্রশাসকই সব রং-সজ্জা ব্যবহার করতে পারবেন; আপনার পছন্দ এই ব্রাউজারে সংরক্ষিত থাকবে।",
    "Incomplete Orders · Halal Food Admin": "অসম্পূর্ণ অর্ডার · হালাল ফুড অ্যাডমিন",
    "CHECKOUT RECOVERY": "অসম্পূর্ণ চেকআউট পুনরুদ্ধার",
    "Review checkout sessions where shoppers entered a valid mobile number after the privacy notice but did not complete the order. These are leads, not confirmed orders.": "যেসব ক্রেতা গোপনীয়তার বিজ্ঞপ্তি দেখার পর বৈধ মোবাইল নম্বর দিয়ে চেকআউট শুরু করেছেন, কিন্তু অর্ডার সম্পন্ন করেননি—সেসব সেশন পর্যালোচনা করুন। এগুলো সম্ভাব্য অর্ডার-আগ্রহ, নিশ্চিত অর্ডার নয়।",
    "Privacy-notice records": "গোপনীয়তার বিজ্ঞপ্তির পর সংরক্ষিত রেকর্ড",
    "30-day automatic retention": "৩০ দিন পর স্বয়ংক্রিয়ভাবে মুছে ফেলা হবে",
    "Order Management": "অর্ডার ব্যবস্থাপনা",
    "Not confirmed orders": "এগুলো নিশ্চিত অর্ডার নয়",
    "These records are separate from Orders and Google Sheets. A record is saved after the shopper enters a valid mobile number following the checkout privacy notice. Contact is limited to that specific unfinished order; promotional messages are not permitted without a separate marketing opt-in.": "এই রেকর্ডগুলো অর্ডার তালিকা ও Google Sheets থেকে আলাদা। চেকআউটের গোপনীয়তার বিজ্ঞপ্তি দেখার পর ক্রেতা বৈধ মোবাইল নম্বর দিলে একটি রেকর্ড সংরক্ষিত হয়। শুধু ওই অসম্পূর্ণ অর্ডার সম্পর্কে যোগাযোগ করা যাবে; আলাদা বিপণন-সম্মতি ছাড়া প্রচারমূলক বার্তা পাঠানো যাবে না।",
    "Incomplete checkouts": "অসম্পূর্ণ চেকআউট",
    "Not yet matched to a saved order": "এখনো সংরক্ষিত অর্ডারের সঙ্গে মেলেনি",
    "Phone numbers available": "যোগাযোগের মোবাইল নম্বর",
    "Can be used for order recovery": "নির্দিষ্ট অসম্পূর্ণ অর্ডার সম্পর্কে যোগাযোগ করা যাবে",
    "Marketing consent": "বিপণন বার্তার সম্মতি",
    "Not inferred from checkout entry": "চেকআউট শুরু করাকে বিপণনের সম্মতি ধরা হয় না",
    "Converted sessions": "সম্পন্ন অর্ডারে রূপান্তরিত সেশন",
    "Matched to a confirmed order": "নিশ্চিত অর্ডারের সঙ্গে মিলে গেছে",
    "Checkout records": "চেকআউটের রেকর্ড",
    "Review the date, customer contact details, selected products and the collection method.": "তারিখ, গ্রাহকের যোগাযোগের তথ্য, নির্বাচিত পণ্য এবং তথ্য সংগ্রহের পদ্ধতি পর্যালোচনা করুন।",
    "Search name, mobile, email or product…": "নাম, মোবাইল, ইমেইল বা পণ্য খুঁজুন…",
    "Search incomplete checkouts": "অসম্পূর্ণ চেকআউট খুঁজুন",
    "Filter checkout status": "চেকআউটের অবস্থা বাছাই করুন",
    "Incomplete only": "শুধু অসম্পূর্ণ",
    "All recent records": "সাম্প্রতিক সব রেকর্ড",
    "Converted": "অর্ডারে রূপান্তরিত",
    "Started": "শুরু হয়েছে",
    "Progress": "অগ্রগতি",
    "Last activity": "সর্বশেষ কার্যকলাপ",
    "Collection basis": "তথ্য সংগ্রহের ভিত্তি",
    "Loading incomplete checkout records…": "অসম্পূর্ণ চেকআউটের রেকর্ড লোড হচ্ছে…",
    "The list shows recent, unexpired records only. No messages are sent automatically from this page.": "তালিকায় কেবল সাম্প্রতিক ও মেয়াদোত্তীর্ণ নয় এমন রেকর্ড দেখানো হয়। এই পৃষ্ঠা থেকে স্বয়ংক্রিয়ভাবে কোনো বার্তা পাঠানো হয় না।",
    "CHECKOUT DETAILS": "চেকআউটের বিস্তারিত",
    "Incomplete checkout": "অসম্পূর্ণ চেকআউট",
    "Contact and cart details": "যোগাযোগ ও কার্টের তথ্য",
    "No product details": "পণ্যের কোনো বিবরণ নেই",
    "Name not entered": "নাম দেওয়া হয়নি",
    "No mobile entered": "মোবাইল নম্বর দেওয়া হয়নি",
    "No email entered": "ইমেইল দেওয়া হয়নি",
    "Single product": "একটি পণ্য",
    "Cart checkout": "কার্ট থেকে চেকআউট",
    "Selected product": "নির্বাচিত পণ্য",
    "estimated checkout total": "আনুমানিক অর্ডারের মোট মূল্য",
    "Progress saved": "অগ্রগতি সংরক্ষিত",
    "After privacy notice": "গোপনীয়তার বিজ্ঞপ্তি দেখানোর পর",
    "Legacy checkbox": "পুরোনো সম্মতি-বাক্স",
    "Marketing consent recorded": "বিপণন বার্তার সম্মতি নথিভুক্ত হয়েছে",
    "No promotional permission": "প্রচারমূলক বার্তা পাঠানোর অনুমতি নেই",
    "Mobile number": "মোবাইল নম্বর",
    "Email address": "ইমেইল ঠিকানা",
    "Inside Dhaka": "ঢাকার ভেতরে",
    "Outside Dhaka": "ঢাকার বাইরে",
    "Not selected": "নির্বাচন করা হয়নি",
    "Estimated total": "আনুমানিক মোট",
    "Checkout progress": "চেকআউটের অগ্রগতি",
    "Order linked": "অর্ডারের সঙ্গে যুক্ত",
    "Selected products": "নির্বাচিত পণ্য",
    "Quantity": "পরিমাণ",
    "Unit price": "একক মূল্য",
    "No product details were captured.": "পণ্যের কোনো তথ্য সংরক্ষিত হয়নি।",
    "Address and notes": "ঠিকানা ও নোট",
    "Delivery address": "ডেলিভারির ঠিকানা",
    "Order notes": "অর্ডার-সংক্রান্ত নোট",
    "Data collection and permissions": "তথ্য সংগ্রহ ও অনুমতি",
    "Valid mobile number entered after checkout privacy notice": "চেকআউটের গোপনীয়তার বিজ্ঞপ্তি দেখার পর বৈধ মোবাইল নম্বর দেওয়া হয়েছে",
    "Legacy explicit checkbox": "পুরোনো স্পষ্ট সম্মতি-বাক্স",
    "Legacy recovery checkbox recorded": "পুরোনো অর্ডার-পুনরুদ্ধার সম্মতি নথিভুক্ত হয়েছে",
    "No separate recovery checkbox": "আলাদা অর্ডার-পুনরুদ্ধার সম্মতি নেই",
    "Collection method:": "তথ্য সংগ্রহের পদ্ধতি:",
    "Notice / consent version:": "বিজ্ঞপ্তি / সম্মতির সংস্করণ:",
    "Marketing not permitted": "বিপণন বার্তা পাঠানোর অনুমতি নেই",
    "New records are saved after the shopper enters a valid mobile number following the checkout privacy notice. Use is limited to helping with that specific unfinished checkout. Promotional messages are not permitted unless a separate marketing opt-in exists.": "চেকআউটের গোপনীয়তার বিজ্ঞপ্তি দেখানোর পর ক্রেতা বৈধ মোবাইল নম্বর দিলে নতুন রেকর্ড সংরক্ষিত হয়। তথ্যটি শুধু ওই নির্দিষ্ট অসম্পূর্ণ চেকআউটে সহায়তার জন্য ব্যবহার করা যাবে। আলাদা বিপণন-সম্মতি না থাকলে প্রচারমূলক বার্তা পাঠানো যাবে না।",
    "This record does not contain a valid Bangladeshi mobile number.": "এই রেকর্ডে বৈধ বাংলাদেশি মোবাইল নম্বর নেই।",
    "Permanently delete this incomplete checkout record? This cannot be undone.": "এই অসম্পূর্ণ চেকআউটের রেকর্ড স্থায়ীভাবে মুছে ফেলবেন? এটি আর ফিরিয়ে আনা যাবে না।",
    "Incomplete checkout record deleted.": "অসম্পূর্ণ চেকআউটের রেকর্ড মুছে ফেলা হয়েছে।",
    "Incomplete checkout records refreshed.": "অসম্পূর্ণ চেকআউটের রেকর্ড হালনাগাদ হয়েছে।",
    "Record could not be deleted.": "রেকর্ডটি মুছে ফেলা যায়নি।",
    "Could not refresh records.": "রেকর্ড হালনাগাদ করা যায়নি।",
    "Could not load incomplete checkouts": "অসম্পূর্ণ চেকআউটের তথ্য লোড করা যায়নি",
    "Verify that your admin session is MFA-verified and the new table is available.": "আপনার অ্যাডমিন সেশনে দুই-ধাপ যাচাই সম্পন্ন হয়েছে কি না এবং নতুন টেবিলটি উপলভ্য কি না যাচাই করুন।",
    "recent records": "সাম্প্রতিক রেকর্ড",
    "Automatically deleted after 30 days": "৩০ দিন পর স্বয়ংক্রিয়ভাবে মুছে ফেলা হয়",
    "No messages are sent automatically": "স্বয়ংক্রিয়ভাবে কোনো বার্তা পাঠানো হয় না",
    "Last field:": "সর্বশেষ তথ্য:",
    "Remove from favorites": "প্রিয় বিভাগ থেকে সরান",
    "Add to favorites": "প্রিয় বিভাগে যোগ করুন",
    "Choose a section": "একটি বিভাগ বেছে নিন",
    "Select": "নির্বাচন করুন",
    "Previous": "পূর্ববর্তী",
    "Next": "পরবর্তী",
    "Save": "সংরক্ষণ করুন",
    "Close": "বন্ধ করুন",
    "Delete": "মুছে ফেলুন",
    "View": "দেখুন",
    "Open": "খুলুন",
    "Search": "খুঁজুন",
    "No records found": "কোনো রেকর্ড পাওয়া যায়নি",
    "No matching records found": "মিলে যাওয়া কোনো রেকর্ড পাওয়া যায়নি",
    "Loading...": "লোড হচ্ছে...",
    "Something went wrong": "কিছু একটা সমস্যা হয়েছে",
    "Success": "সফল",
    "Error": "ত্রুটি",
    "Confirm": "নিশ্চিত করুন",
    "Enabled": "চালু",
    "Disabled": "বন্ধ",
    "Completed": "সম্পন্ন",
    "Failed": "ব্যর্থ",
    "Unavailable": "পাওয়া যাচ্ছে না",
    "Sales & Orders": "বিক্রয় ও অর্ডার",
    "Money & Profit": "অর্থ ও মুনাফা",
    "Stock & Inventory": "মজুত ও পণ্যভান্ডার",
    "Purchasing & Control": "ক্রয় ও নিয়ন্ত্রণ",
    "Connections": "সংযোগ",
    "Order report": "অর্ডার প্রতিবেদন",
    "Any activity": "যেকোনো কার্যকলাপ",
    "No contact detail": "যোগাযোগের তথ্য নেই",
    "Language": "ভাষা",
    "Customer Information": "গ্রাহক তথ্য", "Customer Settings": "গ্রাহক সেটিংস", "Customer Messages": "কাস্টমার মেসেজ",
    "Overview": "সারসংক্ষেপ", "Today's Market": "আজকের বাজার", "THE MERCHANT'S FIELDBOOK": "মার্চেন্টস ফিল্ডবুক", "The Merchant's Fieldbook": "মার্চেন্টস ফিল্ডবুক", "Glass Studio": "গ্লাস স্টুডিও", "Frosted · Airy · Refined": "ফ্রস্টেড · হালকা · পরিশীলিত", "Glyph Signal": "গ্লিফ সিগন্যাল", "Iconic · Minimal · Visual": "আইকননির্ভর · ন্যূনতম · দৃশ্যনির্ভর", "Signature": "স্বাক্ষরধর্মী", "Editorial · tactile · unmistakable": "সম্পাদনাধর্মী · স্পর্শগুণযুক্ত · স্বতন্ত্র", "Editorial · Tactile · Distinctive": "সম্পাদনাধর্মী · স্পর্শগুণযুক্ত · স্বতন্ত্র", "A living market desk for the work that matters.": "ব্যবসার গুরুত্বপূর্ণ কাজ ও তথ্যের জন্য একটি জীবন্ত কর্মখাতা।", "Analytics": "অ্যানালিটিক্স", "Orders": "অর্ডারসমূহ",
    "Operations": "কার্যক্রম", "Products": "পণ্য", "Website Content": "ওয়েবসাইটের কনটেন্ট",
    "Coupons & Promotions": "কুপন ও প্রমোশন", "Coupons": "কুপন", "Coupon Promotions": "কুপন প্রমোশন", "Coupon Usage": "কুপন ব্যবহার", "Coupon List": "কুপন তালিকা",
    "Add Coupon": "কুপন যোগ করুন", "Your coupons": "আপনার কুপনসমূহ", "Create a coupon": "নতুন কুপন তৈরি করুন",
    "Create coupon": "কুপন তৈরি করুন", "Create as new coupon": "নতুন কুপন হিসেবে তৈরি করুন",
    "Coupon Management": "কুপন ব্যবস্থাপনা", "PROMOTION LIBRARY": "প্রমোশন লাইব্রেরি",
    "PROMOTION PERFORMANCE & ORDER ATTRIBUTION": "প্রমোশন পারফরম্যান্স ও অর্ডার ট্র্যাকিং",
    "Coupon orders": "কুপন-সহ অর্ডার", "Awaiting completion": "সম্পন্ন হওয়ার অপেক্ষায়",
    "Delivered orders": "ডেলিভারি সম্পন্ন অর্ডার", "Discount applied": "প্রয়োগ করা ছাড়",
    "Coupon order value": "কুপেন অর্ডারের মূল্য", "Discount awaiting completion": "অপেক্ষমাণ অর্ডারের ছাড়",
    "Discount on delivered orders": "সম্পন্ন অর্ডারের ছাড়", "Discount on cancelled orders": "বাতিল অর্ডারের ছাড়",
    "All usage states": "সব ব্যবহারের অবস্থা", "Delivered / completed": "ডেলিভারি সম্পন্ন",
    "Cancelled / released": "বাতিল / ছাড় ফেরত", "Needs reconciliation": "মিল যাচাই প্রয়োজন",
    "Search customer, mobile, order or coupon…": "গ্রাহক, মোবাইল, অর্ডার বা কুপেন খুঁজুন…",
    "Order / usage status": "অর্ডার / ব্যবহারের অবস্থা", "Used at": "ব্যবহারের সময়",
    "Not cancelled": "বাতিল নয়", "Pending, processing or shipped": "অপেক্ষমাণ, প্রক্রিয়াধীন বা পাঠানো হয়েছে",
    "Completed coupon orders": "সম্পন্ন কুপেন অর্ডার", "Pending + delivered; excludes cancelled": "অপেক্ষমাণ ও সম্পন্ন; বাতিল বাদে",
    "Recorded total, not cash collected": "রেকর্ডকৃত মোট; আদায়কৃত নগদ নয়",
    "Customer": "গ্রাহক", "Order": "অর্ডার", "Coupon": "কুপেন", "Discount": "ছাড়", "Subtotal": "পণ্যের মোট",
    "Order total": "অর্ডারের মোট", "All coupons": "সব কুপেন", "Awaiting completion": "সম্পন্ন হওয়ার অপেক্ষায়",
    "Coupon Promotions": "কুপন প্রমোশন",
    "Cancelled orders remain in history but are excluded from applied-discount totals.": "বাতিল অর্ডার ইতিহাসে থাকবে, তবে প্রয়োগ করা ছাড়ের মোট হিসাবে ধরা হবে না।",
    "Admin-only customer details": "শুধু অ্যাডমিনের জন্য গ্রাহকের তথ্য",
    "Live order and redemption records": "লাইভ অর্ডার ও কুপন ব্যবহারের রেকর্ড",
    "Coupon order value": "কুপেন অর্ডারের মূল্য", "Coupon usage CSV exported.": "কুপন ব্যবহারের CSV এক্সপোর্ট হয়েছে।",
    "No coupon orders match these filters.": "এই ফিল্টারে কোনো কুপেন অর্ডার পাওয়া যায়নি।",
    "matching coupon order record(s)": "টি মিল পাওয়া কুপেন অর্ডার",
    "Mobile unavailable": "মোবাইল নম্বর পাওয়া যায়নি", "Customer name unavailable": "গ্রাহকের নাম পাওয়া যায়নি",
    "Order record unavailable": "অর্ডারের রেকর্ড পাওয়া যায়নি", "Redemption record missing": "কুপন ব্যবহারের লেজার রেকর্ড নেই",
    "Order unavailable": "অর্ডারের তথ্য নেই", "All usage states": "সব ব্যবহারের অবস্থা",
    "Coupon usage data refreshed.": "কুপন ব্যবহারের তথ্য রিফ্রেশ হয়েছে।",
    "Coupon usage data could not be refreshed.": "কুপন ব্যবহারের তথ্য রিফ্রেশ করা যায়নি।",
    "There are no coupon order records to export.": "এক্সপোর্ট করার মতো কোনো কুপেন অর্ডার নেই।",
    "Order value is the recorded order total after discount, not proof of money received. The storefront is currently a COD/testing project; this dashboard reports order records and does not verify cash collection.": "অর্ডারের মূল্য ছাড়ের পর রেকর্ডকৃত মোট; এটি টাকা আদায়ের প্রমাণ নয়। স্টোরটি বর্তমানে COD/পরীক্ষামূলক প্রকল্প; এই ড্যাশবোর্ড অর্ডারের তথ্য দেখায়, নগদ আদায় যাচাই করে না।",
    "Order and coupon redemption records are matched. Pending orders are counted as coupon uses; delivered orders are counted as completed. Cancelled discounts are excluded from active discount totals.": "অর্ডার ও কুপন ব্যবহারের রেকর্ড মিলেছে। অপেক্ষমাণ অর্ডারও কুপন ব্যবহার হিসেবে গণনা হয়; ডেলিভারি সম্পন্ন হলে সম্পন্ন হিসেবে ধরা হয়। বাতিল অর্ডারের ছাড় সক্রিয় ছাড়ের হিসাবে নেই।",
    "STORE GROWTH & CUSTOMER OFFERS": "স্টোর বৃদ্ধি ও কাস্টমার অফার",
    "CAMPAIGN SETUP": "ক্যাম্পেইন সেটআপ", "Campaign name": "ক্যাম্পেইনের নাম",
    "Coupon code": "কুপন কোড", "Internal description": "অভ্যন্তরীণ বিবরণ",
    "Coupon details": "কুপনের বিবরণ", "Discount & order rules": "ছাড় ও অর্ডারের নিয়ম",
    "Discount type": "ছাড়ের ধরন", "Discount value": "ছাড়ের পরিমাণ",
    "Maximum discount (৳)": "সর্বোচ্চ ছাড় (৳)", "Minimum order value (৳)": "ন্যূনতম অর্ডার মূল্য (৳)",
    "Where can it be used?": "কোন পণ্যে ব্যবহার করা যাবে?", "Product eligibility": "পণ্যের যোগ্যতা",
    "Choose categories": "ক্যাটাগরি নির্বাচন করুন", "Choose products": "পণ্য নির্বাচন করুন",
    "Who can use this coupon?": "কারা এই কুপন ব্যবহার করতে পারবে?",
    "Customer eligibility": "গ্রাহকের যোগ্যতা", "All customers": "সব গ্রাহক",
    "First-time customers only": "শুধু নতুন গ্রাহক", "Selected customers only": "নির্বাচিত গ্রাহক",
    "Usage limits & validity": "ব্যবহারের সীমা ও মেয়াদ", "Total uses allowed": "সর্বমোট ব্যবহারসীমা",
    "Uses per customer": "প্রতি গ্রাহকের ব্যবহারসীমা", "Campaign status": "ক্যাম্পেইনের অবস্থা",
    "Start date & time": "শুরুর তারিখ ও সময়", "Expiry date & time": "মেয়াদ শেষের তারিখ ও সময়",
    "Save coupon": "কুপন সংরক্ষণ করুন", "Save changes": "পরিবর্তন সংরক্ষণ করুন",
    "Refresh": "রিফ্রেশ", "Export CSV": "CSV এক্সপোর্ট",
    "Search by code or campaign name…": "কোড বা ক্যাম্পেইনের নাম দিয়ে খুঁজুন…",
    "All statuses": "সব অবস্থা", "Active": "সক্রিয়", "Scheduled": "নির্ধারিত",
    "Paused": "বিরতিতে", "Draft": "খসড়া", "Exhausted": "ব্যবহারসীমা শেষ",
    "Expired": "মেয়াদ শেষ", "Archived": "আর্কাইভ করা",
    "Total coupons": "মোট কুপন", "Currently active": "বর্তমানে সক্রিয়",
    "Delivered redemptions": "সম্পন্ন কুপন ব্যবহার", "Discount delivered": "মোট ছাড় দেওয়া হয়েছে",
    "Campaigns created": "তৈরি করা ক্যাম্পেইন", "Available or scheduled": "সক্রিয় বা নির্ধারিত",
    "Includes pending and delivered orders": "চলমান ও ডেলিভারি সম্পন্ন অর্ডার", "Coupon orders": "কুপন-সহ অর্ডার", "Discount applied": "প্রয়োগ করা ছাড়", "Excludes cancelled orders": "বাতিল অর্ডার বাদে", "Create a coupon to start your first offer.": "প্রথম অফার চালু করতে একটি কুপন তৈরি করুন।",
    "Coupon code copied.": "কুপন কোড কপি হয়েছে।", "Coupon updated successfully.": "কুপন সফলভাবে আপডেট হয়েছে।",
    "Coupon created successfully.": "কুপন সফলভাবে তৈরি হয়েছে।", "No coupon uses recorded yet.": "এখনো এই কুপনের কোনো ব্যবহার রেকর্ড হয়নি।",
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
    "Finance snapshot": "আর্থিক সারাংশ",
    "Confirmed entries · not bank/cash balances.": "নিশ্চিত হিসাব · ব্যাংক/নগদ ব্যালেন্স নয়।",
    "Income · all time": "সব সময়ের আয়",
    "Expenses · all time": "সব সময়ের খরচ",
    "Net · all time": "সব সময়ের নিট হিসাব",
    "Past 30 days": "গত ৩০ দিন",
    "Non-cancelled orders": "বাতিল নয় এমন অর্ডার",
    "Open pending list": "অপেক্ষমাণ তালিকা খুলুন",
    "Event count": "ইভেন্ট সংখ্যা",
    "Last 30 days · not confirmed income": "গত ৩০ দিন · নিশ্চিত আয় নয়",
    "At/below alert threshold": "স্টক সতর্কতার সীমায় বা নিচে",
    "Based on saved orders and stock.": "সংরক্ষিত অর্ডার ও স্টকের ভিত্তিতে।",
    "Select a segment to open orders.": "অর্ডার খুলতে একটি অংশ নির্বাচন করুন।",
    "Product views · 14 days": "গত ১৪ দিনের পণ্য ভিউ",
    "Order lines and cart events · not paid sales.": "অর্ডার লাইন ও কার্ট ইভেন্ট · পেইড বিক্রি নয়।",
    "Manual ledger entries only · not a bank/COD balance.": "শুধু ম্যানুয়াল হিসাব এন্ট্রি · ব্যাংক/COD ব্যালেন্স নয়।",
    "Finance unavailable for this session.": "এই সেশনে আর্থিক তথ্য পাওয়া যাচ্ছে না।",
    "Finance unavailable. Refresh after signing in and completing MFA.": "আর্থিক তথ্য পাওয়া যায়নি। সাইন ইন ও MFA শেষ করে রিফ্রেশ করুন।",
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
    "Priority actions": "অগ্রাধিকারভিত্তিক কাজ",
    "Review items that may need attention before moving to routine tasks.": "সাধারণ কাজ শুরু করার আগে যেসব বিষয়ে মনোযোগ প্রয়োজন হতে পারে, সেগুলো দেখুন।",
    "Checking…": "যাচাই হচ্ছে…", "Loading priorities…": "অগ্রাধিকার লোড হচ্ছে…",
    "to review": "পর্যালোচনা প্রয়োজন", "Clear": "ঠিক আছে",
    "Pending order count needs review": "অপেক্ষমাণ অর্ডারের সংখ্যা যাচাই দরকার",
    "Pending orders may need review": "অপেক্ষমাণ অর্ডার পর্যালোচনা করা দরকার হতে পারে",
    "Active products are out of stock": "সক্রিয় পণ্যের স্টক শেষ",
    "Products are at or below the stock-alert threshold": "কিছু পণ্যের স্টক সতর্কতা-সীমায় বা নিচে",
    "Active products need catalog details": "কিছু সক্রিয় পণ্যের ক্যাটালগ তথ্য দরকার",
    "Order records need review; an order is not proof of payment or delivery.": "অর্ডার রেকর্ড পর্যালোচনা করুন; অর্ডার থাকা পেমেন্ট বা ডেলিভারির প্রমাণ নয়।",
    "Pending-order count could not be confirmed. Open Orders to review the current list.": "অপেক্ষমাণ অর্ডারের সংখ্যা নিশ্চিত করা যায়নি। বর্তমান তালিকা দেখতে অর্ডার খুলুন।",
    "Tracked stock is at zero. Check availability before presenting these items as ready to sell.": "ট্র্যাক করা স্টক শূন্য। বিক্রির জন্য প্রস্তুত দেখানোর আগে পণ্যের প্রাপ্যতা যাচাই করুন।",
    "Review stock thresholds and replenish when appropriate.": "স্টকের সতর্কতা-সীমা দেখুন এবং প্রয়োজন হলে পুনরায় স্টক করুন।",
    "Add a valid positive price and/or a product image where needed.": "প্রয়োজন অনুযায়ী সঠিক ধনাত্মক মূল্য এবং/অথবা পণ্যের ছবি যোগ করুন।",
    "Everything looks clear": "সবকিছু ঠিকঠাক আছে",
    "No pending orders or tracked stock alerts were found in the loaded records.": "লোড করা রেকর্ডে অপেক্ষমাণ অর্ডার বা ট্র্যাক করা স্টক সতর্কতা পাওয়া যায়নি।",
    "Checks use saved catalog and order records. This testing project does not process real payments or deliveries.": "এই যাচাই সংরক্ষিত ক্যাটালগ ও অর্ডার রেকর্ডের ভিত্তিতে। এই পরীক্ষামূলক প্রকল্পে বাস্তব পেমেন্ট বা ডেলিভারি প্রক্রিয়া হয় না।",
    "Cost not set": "খরচ নির্ধারিত নয়",
    "Add purchase cost to calculate margin": "মার্জিন হিসাব করতে ক্রয়মূল্য যোগ করুন",
    "Margin": "মার্জিন", "includes packaging": "প্যাকেজিংসহ",
    "in stock": "স্টকে আছে", "left": "বাকি", "Not tracked": "ট্র্যাক করা হচ্ছে না",
    "Alert at": "সতর্কতা সীমা", "Set stock quantity to enable alerts": "সতর্কতা চালু করতে স্টকের পরিমাণ দিন",
    "Open products": "পণ্য খুলুন", "Review orders": "অর্ডার পর্যালোচনা",
    "Review catalog": "ক্যাটালগ পর্যালোচনা", "Out of stock": "স্টক শেষ",
    "Ranked by product-view events over the last 14 days.": "গত ১৪ দিনের রেকর্ড করা পণ্য-ভিউ ইভেন্ট অনুযায়ী সাজানো।",
    "Status totals cover the last 30 days of loaded order records only. They are not payment or delivery confirmation by themselves.": "স্ট্যাটাসের মোট সংখ্যা শুধু গত ৩০ দিনে লোড করা অর্ডার রেকর্ড বোঝায়; এগুলো নিজে থেকে পেমেন্ট বা ডেলিভারি নিশ্চিত করে না।",
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

    "Page activity by hour": "ঘণ্টা অনুযায়ী পেজ কার্যকলাপ",
    "Page activity by day": "দিন অনুযায়ী পেজ কার্যকলাপ",
    "Page activity by week": "সপ্তাহ অনুযায়ী পেজ কার্যকলাপ",
    "Page activity by month": "মাস অনুযায়ী পেজ কার্যকলাপ",
    "Compare page views by weekday and local clock hour across the selected reporting period.": "নির্বাচিত সময়ে সপ্তাহের দিন ও স্থানীয় ঘণ্টা অনুযায়ী পেজ ভিউ তুলনা করুন।",
    "Compare page views across dates in the selected reporting period.": "নির্বাচিত সময়সীমার প্রতিটি দিনের পেজ ভিউ তুলনা করুন।",
    "Compare weekly page-view totals. Weeks run Sunday to Saturday.": "সাপ্তাহিক পেজ ভিউ তুলনা করুন। সপ্তাহ গণনা হবে রবিবার থেকে শনিবার।",
    "Compare page views across calendar months.": "ক্যালেন্ডার মাস অনুযায়ী পেজ ভিউ তুলনা করুন।",
    "Hour": "ঘণ্টা", "Day": "দিন", "Week": "সপ্তাহ", "Month": "মাস",
    "Views in selected period": "নির্বাচিত সময়ের ভিউ",
    "Peak activity": "সর্বোচ্চ কার্যকলাপ",
    "Average per period": "প্রতি সময়সীমায় গড়",
    "Preparing page activity…": "পেজ কার্যকলাপ প্রস্তুত হচ্ছে…",
    "No tracked page-view data is available in this selected period.": "নির্বাচিত সময়ে কোনো ট্র্যাককৃত পেজ ভিউ ডেটা নেই।",
    "No recorded activity": "কোনো কার্যকলাপ রেকর্ড হয়নি",
    "Hourly activity is grouped by Bangladesh weekday and clock hour. Each cell combines all matching dates in the selected range.": "ঘণ্টাভিত্তিক কার্যকলাপ বাংলাদেশের সপ্তাহের দিন ও স্থানীয় ঘণ্টা অনুযায়ী দেখানো হয়। প্রতিটি ঘর নির্বাচিত সময়ের একই ধরনের দিন ও ঘণ্টার ভিউ একত্র করে।",
    "Daily totals use Asia/Dhaka dates. Page views are event counts, not unique visitors.": "দিনের মোট সংখ্যা Asia/Dhaka তারিখ অনুযায়ী। পেজ ভিউ ইভেন্টের সংখ্যা, স্বতন্ত্র ভিজিটরের সংখ্যা নয়।",
    "Weekly totals use Sunday–Saturday weeks in Bangladesh time. Page views are event counts, not unique visitors.": "বাংলাদেশ সময় অনুযায়ী সপ্তাহের মোট সংখ্যা রবিবার–শনিবার ধরে গণনা করা হয়। পেজ ভিউ ইভেন্টের সংখ্যা, স্বতন্ত্র ভিজিটরের সংখ্যা নয়।",
    "Monthly totals follow calendar months in Bangladesh time. Page views are event counts, not unique visitors.": "বাংলাদেশ সময় অনুযায়ী ক্যালেন্ডার মাসভিত্তিক মোট সংখ্যা দেখানো হয়। পেজ ভিউ ইভেন্টের সংখ্যা, স্বতন্ত্র ভিজিটরের সংখ্যা নয়।",
    "Tracking coverage begins": "ট্র্যাকিং শুরু হয়েছে",
    "Earlier dates are excluded, not counted as zero.": "এর আগের তারিখগুলো বাদ রাখা হয়েছে, শূন্য হিসেবে গণনা করা হয়নি।",
    "History may be limited to the latest 15,000 fetched events.": "ইতিহাস সর্বশেষ ১৫,০০০টি আনা ইভেন্টে সীমাবদ্ধ হতে পারে।",
    "Page views are event counts, not unique visitors. All times use Asia/Dhaka.": "পেজ ভিউ ইভেন্টের সংখ্যা, স্বতন্ত্র ভিজিটরের সংখ্যা নয়। সব সময় Asia/Dhaka অনুযায়ী।",
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
    "Payment": "পেমেন্ট",
    "This is visible-tab time, not proof of attention. Google Analytics 4 remains the place to review referral and acquisition source data.": "এটি শুধু ট্যাব দৃশ্যমান থাকার সময়; মনোযোগ দেওয়ার প্রমাণ নয়। রেফারেল ও ট্রাফিকের উৎস দেখতে Google Analytics 4 ব্যবহার করুন।",
    "The funnel uses distinct available session or anonymous identifiers per event type where present. Missing IDs and events may affect conversion rates.": "ফানেল প্রতিটি ইভেন্টের জন্য উপলভ্য স্বতন্ত্র সেশন বা অজ্ঞাত পরিচয় ব্যবহার করে। আইডি বা ইভেন্ট অনুপস্থিত থাকলে কনভার্সন রেট বদলে যেতে পারে।",
    "Event": "ইভেন্ট",
    "Find pages that receive attention and sessions whose last recorded activity happened there.": "যেসব পেজ বেশি দেখা হচ্ছে এবং যেসব সেশনের সর্বশেষ কার্যকলাপ সেখানে রেকর্ড হয়েছে, সেগুলো খুঁজুন।",
    "Grouped by anonymous browser session—never by customer name, phone or email.": "অজ্ঞাত ব্রাউজার সেশন অনুযায়ী সাজানো—গ্রাহকের নাম, ফোন বা ইমেইল দিয়ে নয়।",
    "Visible time": "দৃশ্যমান সময়",
    "Sessions are pseudonymous and browser-tab based. A page marked “last seen” is the last recorded location in the selected period, not a guaranteed explanation of why the visitor left.": "সেশনগুলো ছদ্মনামভিত্তিক এবং ব্রাউজার ট্যাবের ওপর নির্ভরশীল। “সর্বশেষ দেখা” পেজটি নির্বাচিত সময়ে সর্বশেষ রেকর্ডকৃত অবস্থান; ভিজিটর কেন চলে গেছেন তার নিশ্চিত ব্যাখ্যা নয়।",
    "Compare product views, cart actions and order records to decide which product information to review.": "কোন পণ্যের তথ্য পর্যালোচনা করবেন তা ঠিক করতে পণ্য ভিউ, কার্টের কার্যকলাপ ও অর্ডার রেকর্ড তুলনা করুন।",
    "Recorded value": "রেকর্ড করা মূল্য",
    "Matching product events and order items…": "পণ্যের ইভেন্ট ও অর্ডার আইটেম মিলিয়ে দেখা হচ্ছে…",
    "Cancelled orders are excluded from product order totals. Recorded values are test-order line totals, not verified revenue or actual sales. Products with incomplete IDs or names may not match automatically.": "পণ্যের অর্ডার-সংখ্যা থেকে বাতিল অর্ডার বাদ। রেকর্ড করা মূল্য পরীক্ষামূলক অর্ডারের লাইন-টোটাল, যাচাইকৃত আয় বা প্রকৃত বিক্রি নয়। অসম্পূর্ণ আইডি বা নামের পণ্য স্বয়ংক্রিয়ভাবে মিলতে নাও পারে।",
    "Rule-based prompts from the selected data range; review them before making changes.": "নির্বাচিত ডেটার সময়সীমা অনুযায়ী নিয়মভিত্তিক পরামর্শ; পরিবর্তন করার আগে পর্যালোচনা করুন।",
    "WhatsApp and phone interaction events:": "WhatsApp ও ফোন-সম্পর্কিত ইন্টারঅ্যাকশন ইভেন্ট:",
    "WhatsApp clicks in the selected period. Use the Reports section to download event data.": "নির্বাচিত সময়ে WhatsApp ক্লিক। ইভেন্ট ডেটা ডাউনলোড করতে রিপোর্ট বিভাগ ব্যবহার করুন।",
    "This page stores operational records only. It does not book a real courier, send parcels, collect COD, issue refunds or pay suppliers. Courier integration is intentionally disabled until you provide the provider and API details. Do not treat sample entries or order totals as real payments.": "এই পেজে শুধু কার্যক্রমের রেকর্ড রাখা হয়। এটি প্রকৃত কুরিয়ার বুকিং, পার্সেল পাঠানো, COD সংগ্রহ, রিফান্ড বা সরবরাহকারীকে পেমেন্ট করে না। কুরিয়ার সরবরাহকারী ও API তথ্য না দেওয়া পর্যন্ত ইন্টিগ্রেশন বন্ধ থাকবে। নমুনা এন্ট্রি বা অর্ডারের মোট মূল্যকে প্রকৃত পেমেন্ট ভাববেন না।",
    "Orders currently pending or processing. Create a placeholder courier record when a parcel is ready.": "বর্তমানে অপেক্ষমাণ বা প্রক্রিয়াধীন অর্ডার। পার্সেল প্রস্তুত হলে একটি নমুনা কুরিয়ার রেকর্ড তৈরি করুন।",
    "Order value": "অর্ডার মূল্য",
    "The packing queue uses existing order statuses; packing completion is an operations step, not proof of payment or dispatch.": "প্যাকিংয়ের সারি বিদ্যমান অর্ডার স্ট্যাটাস ব্যবহার করে। প্যাকিং সম্পন্ন হওয়া একটি কার্যক্রমের ধাপ; এটি পেমেন্ট বা পাঠানোর প্রমাণ নয়।",
    "COD amount is a planning/reference field, not money collected. Settlement must only be marked after checking the actual courier statement. Tracking IDs are manually entered until API credentials are configured.": "COD-এর পরিমাণ পরিকল্পনা/রেফারেন্সের জন্য; এটি সংগৃহীত টাকা নয়। প্রকৃত কুরিয়ার স্টেটমেন্ট যাচাই করার পরই নিষ্পত্তি চিহ্নিত করুন। API তথ্য যুক্ত না হওয়া পর্যন্ত ট্র্যাকিং আইডি হাতে লিখতে হবে।",
    "Product *": "পণ্য *",
    "Recording a purchase order does not increase stock or confirm a supplier payment. When goods arrive, count the received quantity and record the stock receipt separately. This avoids overstating inventory.": "ক্রয় অর্ডার রেকর্ড করলেই স্টক বাড়ে না বা সরবরাহকারীকে পেমেন্ট নিশ্চিত হয় না। পণ্য এলে প্রাপ্ত পরিমাণ গুনে আলাদাভাবে স্টক গ্রহণ রেকর্ড করুন। এতে স্টকের ভুল অতিরিক্ত হিসাব এড়ানো যায়।",
    "Track a return request, inspection result and refund reference without changing stock automatically.": "স্টক স্বয়ংক্রিয়ভাবে না বদলে রিটার্নের অনুরোধ, পরিদর্শনের ফল ও রিফান্ড রেফারেন্স ট্র্যাক করুন।",
    "Rejected": "প্রত্যাখ্যাত",
    "Item condition": "পণ্যের অবস্থা",
    "Not inspected": "পরিদর্শন করা হয়নি",
    "Resellable": "পুনরায় বিক্রির উপযোগী",
    "Damaged": "ক্ষতিগ্রস্ত",
    "Incomplete": "অসম্পূর্ণ",
    "＋ Record return request": "＋ রিটার্নের অনুরোধ রেকর্ড",
    "Return": "রিটার্ন",
    "Reason": "কারণ",
    "Refund reference": "রিফান্ড রেফারেন্স",
    "Condition": "অবস্থা",
    "A return record does not automatically refund money or put products back into stock. Mark restock approved only after inspection and a real physical count.": "রিটার্ন রেকর্ড করলেই স্বয়ংক্রিয়ভাবে টাকা ফেরত বা স্টকে পণ্য যোগ হয় না। পরিদর্শন ও বাস্তব গণনার পরই স্টক পুনরায় যোগ করার অনুমোদন দিন।",
    "COURIER PREPARATION": "কুরিয়ারের প্রস্তুতি",
    "Prepare parcel": "পার্সেল প্রস্তুত করুন",
    "Manual placeholder only. No live courier API call will be made.": "শুধু ম্যানুয়াল নমুনা রেকর্ড। লাইভ কুরিয়ার API কল করা হবে না।",
    "Courier placeholder *": "কুরিয়ারের নমুনা রেকর্ড *",
    "Tracking ID": "ট্র্যাকিং আইডি",
    "COD reference amount (৳)": "COD রেফারেন্স পরিমাণ (৳)",
    "Courier fee (৳)": "কুরিয়ার ফি (৳)",
    "COD settlement": "COD নিষ্পত্তি",
    "Settled — verified only": "নিষ্পত্তি হয়েছে — যাচাই সাপেক্ষে",
    "Settled amount (৳)": "নিষ্পত্তি হওয়া পরিমাণ (৳)",
    "Parcel weight (kg)": "পার্সেলের ওজন (কেজি)",
    "Parcel notes": "পার্সেল-সংক্রান্ত নোট",
    "Save placeholder record": "নমুনা রেকর্ড সংরক্ষণ",
    "JPG, PNG, WebP or AVIF, maximum 5 MB. Upload requires the existing store-content storage permission.": "JPG, PNG, WebP বা AVIF; সর্বোচ্চ ৫ MB। আপলোডের জন্য store-content স্টোরেজের বর্তমান অনুমতি প্রয়োজন।",
    "Warn when tracked stock reaches this level or below. Each product can have its own threshold.": "ট্র্যাক করা স্টক এই মাত্রায় বা এর নিচে নামলে সতর্ক করুন। প্রতিটি পণ্যের আলাদা সীমা থাকতে পারে।",
    "Keep banner images optimized for web and test the destination link before saving. Hero slides stay enabled to preserve carousel layout; the side banner and announcement popup can be switched on or off.": "ব্যানার ছবি ওয়েবের জন্য অপটিমাইজ করুন এবং সংরক্ষণের আগে গন্তব্য লিংক পরীক্ষা করুন। ক্যারোসেলের বিন্যাস বজায় রাখতে হিরো স্লাইড চালু থাকে; সাইড ব্যানার ও ঘোষণা পপআপ চালু বা বন্ধ করা যায়।",
    "JPG, PNG, WebP or AVIF · max 5 MB. If upload permission is unavailable, use an image URL.": "JPG, PNG, WebP বা AVIF · সর্বোচ্চ ৫ MB। আপলোডের অনুমতি না থাকলে ছবির URL ব্যবহার করুন।",
    "Used only to sort this admin list; the homepage carousel order stays fixed.": "শুধু অ্যাডমিন তালিকার ক্রম সাজাতে ব্যবহৃত হয়; হোমপেজ ক্যারোসেলের ক্রম স্থির থাকে।",
    "If inactive, this promotion will be hidden on the public site.": "নিষ্ক্রিয় করলে এই প্রচারটি পাবলিক ওয়েবসাইটে লুকানো থাকবে।",
    "Existing article URLs are locked to avoid broken links.": "লিংক নষ্ট হওয়া এড়াতে বিদ্যমান আর্টিকেলের URL পরিবর্তন করা যাবে না।",
    "This directory combines registered profiles with customers found in order records. Lifetime order value excludes cancelled orders, but it is only recorded order value—not verified customer spend or collected revenue.": "এই ডিরেক্টরিতে নিবন্ধিত প্রোফাইল এবং অর্ডার রেকর্ডে পাওয়া গ্রাহকদের একত্র করা হয়েছে। বাতিল অর্ডার বাদ দিয়ে মোট অর্ডার মূল্য দেখানো হয়; এটি যাচাইকৃত গ্রাহক-ব্যয় বা সংগৃহীত আয় নয়।",
    "Latest 5,000 records at most": "সর্বোচ্চ সর্বশেষ ৫,০০০টি রেকর্ড",
    "Matches use a shared profile ID or an exact normalized phone number; name-only matching is intentionally avoided. Cancelled orders are excluded from lifetime value, and the latest 5,000 order records / 1,000 profiles are loaded at most. Figures are not verified spend, profit or collected income.": "মিল নির্ধারণে একই প্রোফাইল ID বা স্বাভাবিকীকৃত সঠিক ফোন নম্বর ব্যবহার করা হয়; শুধু নামের ভিত্তিতে মিলানো হয় না। মোট অর্ডার মূল্য থেকে বাতিল অর্ডার বাদ এবং সর্বোচ্চ ৫,০০০টি অর্ডার/১,০০০টি প্রোফাইল লোড হয়। এগুলো যাচাইকৃত ব্যয়, লাভ বা সংগৃহীত আয় নয়।",
    "This storefront does not collect real payments or dispatch deliveries. Record Income as Confirmed only after checking that money was actually received. Courier COD fields in Operations are manual placeholders and are not automatically reconciled into this ledger. Figures here are manual records, not bank-verified balances.": "এই স্টোরফ্রন্ট প্রকৃত পেমেন্ট সংগ্রহ বা ডেলিভারি পাঠায় না। টাকা সত্যিই পাওয়ার পরেই আয়কে Confirmed হিসেবে রেকর্ড করুন। Operations-এর কুরিয়ার COD ঘরগুলো ম্যানুয়াল নমুনা এবং এই হিসাবের সঙ্গে স্বয়ংক্রিয়ভাবে মেলে না। এখানে দেখানো সংখ্যা ম্যানুয়াল রেকর্ড, ব্যাংক-যাচাইকৃত ব্যালেন্স নয়।",
    "Compare recorded order totals with confirmed income entries manually linked to each order.": "প্রতিটি অর্ডারের সঙ্গে ম্যানুয়ালি যুক্ত নিশ্চিত আয় এন্ট্রির সঙ্গে রেকর্ড করা অর্ডার-টোটাল তুলনা করুন।",
    "No payment or delivery is processed by this testing storefront. Order value is not collected income. Only a manually entered Income record marked Confirmed appears as linked income; never confirm a test order as money received.": "এই পরীক্ষামূলক স্টোরফ্রন্ট কোনো পেমেন্ট বা ডেলিভারি প্রক্রিয়া করে না। অর্ডারের মূল্য সংগৃহীত আয় নয়। হাতে যোগ করা এবং Confirmed চিহ্নিত Income রেকর্ডই শুধু সংযুক্ত আয় হিসেবে দেখাবে; পরীক্ষামূলক অর্ডারকে কখনো প্রাপ্ত অর্থ হিসেবে নিশ্চিত করবেন না।",
    "The difference is for review only, not profit, debt, or an amount due.": "এই পার্থক্য শুধু পর্যালোচনার জন্য; এটি লাভ, ঋণ বা বকেয়া অর্থ নয়।",
    "Keep a clear record of each expense or verified income item. Entries are never removed when marked void.": "প্রতিটি খরচ বা যাচাইকৃত আয়ের পরিষ্কার রেকর্ড রাখুন। Void চিহ্নিত করলেও এন্ট্রি মুছে যায় না।",
    "Use Confirmed only for records you have verified. Draft and Void entries do not contribute to the totals above.": "যাচাই করা রেকর্ডেই শুধু Confirmed ব্যবহার করুন। Draft ও Void এন্ট্রি উপরের মোট হিসাবের অন্তর্ভুক্ত হয় না।",
    "Date *": "তারিখ *",
    "Save entry": "এন্ট্রি সংরক্ষণ",
    "Check the date range and report type before downloading. Customer contact details are excluded by default. If you include them in an order report, store the file privately.": "ডাউনলোডের আগে তারিখের সীমা ও রিপোর্টের ধরন যাচাই করুন। ডিফল্টভাবে গ্রাহকের যোগাযোগের তথ্য বাদ থাকে। অর্ডার রিপোর্টে এগুলো যুক্ত করলে ফাইলটি ব্যক্তিগত ও নিরাপদে রাখুন।",
    "Area": "এরিয়া",
    "Product views": "পণ্য ভিউ",
    "+ Add product": "+ পণ্য যোগ করুন",
    "Checking admin session…": "অ্যাডমিন সেশন যাচাই হচ্ছে…",
    "+ Add category": "+ ক্যাটাগরি যোগ করুন",
    "+ Create post": "+ পোস্ট তৈরি",
    "Choose a category": "ক্যাটাগরি বেছে নিন",
    "Visible on the store": "স্টোরে দেখানো হবে",
    "Search all tables…": "সব টেবিলে খুঁজুন…",
    "Edit": "সম্পাদনা",
    "Hide": "লুকান",
    "Restore": "আবার চালু করুন",
    "Deactivate": "নিষ্ক্রিয় করুন",
    "Activate": "সক্রিয় করুন",
    "Active": "সক্রিয়",
    "Inactive": "নিষ্ক্রিয়",
    "Featured": "বিশেষভাবে দেখানো",
    "Not tracked": "ট্র্যাক করা হয়নি",
    "Cost not set": "খরচ নির্ধারণ করা হয়নি",
    "left": "বাকি",
    "in stock": "স্টকে আছে",
    "unit": "একক",
    "Alert at": "সতর্কতার সীমা",
    "Registered profile": "নিবন্ধিত প্রোফাইল",
    "Order-only record": "শুধু অর্ডারের রেকর্ড",
    "Order-only customer record": "শুধু অর্ডার-ভিত্তিক গ্রাহক রেকর্ড",
    "Repeat buyer": "পুনরায় অর্ডারকারী",
    "Name not provided": "নাম দেওয়া হয়নি",
    "Not provided": "দেওয়া হয়নি",
    "Recorded order value only": "শুধু রেকর্ড করা অর্ডার মূল্য",
    "Order history": "অর্ডারের ইতিহাস",
    "No orders": "কোনো অর্ডার নেই",
    "non-cancelled": "বাতিল নয়",
    "No item details recorded": "পণ্যের বিস্তারিত রেকর্ড নেই",
    "Recorded product view": "রেকর্ড করা পণ্য ভিউ",
    "Uncategorised": "ক্যাটাগরিবিহীন",
    "Record income": "আয় রেকর্ড",
    "Post published.": "পোস্ট প্রকাশিত হয়েছে।",
    "Post saved.": "পোস্ট সংরক্ষণ করা হয়েছে।",
    "Post moved to draft.": "পোস্ট খসড়ায় নেওয়া হয়েছে।",
    "Publish": "প্রকাশ করুন",
    "Unpublish": "প্রকাশনা বাতিল করুন",
    "Partially received": "আংশিকভাবে গ্রহণ করা হয়েছে",
    "Order item lines": "অর্ডার আইটেম লাইন",
    "Add-to-cart events": "কার্টে যোগ করার ইভেন্ট",
    "Recorded income": "রেকর্ড করা আয়",
    "Recorded expenses": "রেকর্ড করা খরচ",
    "Confirmed income records": "নিশ্চিত আয়ের রেকর্ড",
    "Confirmed expense records": "নিশ্চিত খরচের রেকর্ড",
    "Page activity": "পেজের কার্যকলাপ",
    "Product viewed": "পণ্য দেখা হয়েছে",
    "Added to cart": "কার্টে যোগ করা হয়েছে",
    "Checkout started": "চেকআউট শুরু হয়েছে",
    "Order submitted event": "অর্ডার সাবমিট ইভেন্ট",
    "Order success event": "অর্ডার সফল ইভেন্ট",
    "Review": "পর্যালোচনা করুন",
    "No product views yet": "এখনও কোনো পণ্য ভিউ নেই",
    "No matching customer records": "মিলে যাওয়া গ্রাহক রেকর্ড নেই",
    "No matching entries": "মিলে যাওয়া এন্ট্রি নেই",
    "Task status updated.": "কাজের স্ট্যাটাস আপডেট হয়েছে।",
    "Team member added.": "টিম সদস্য যোগ করা হয়েছে।",
    "Supplier saved.": "সরবরাহকারী সংরক্ষণ হয়েছে।",
    "Purchase order created. Stock was not changed.": "ক্রয় অর্ডার তৈরি হয়েছে। স্টক পরিবর্তন হয়নি।",
    "Return request recorded. No refund or stock change occurred.": "রিটার্নের অনুরোধ রেকর্ড হয়েছে। রিফান্ড বা স্টক পরিবর্তন হয়নি।",
    "Placeholder parcel saved. No courier API was called.": "নমুনা পার্সেল রেকর্ড সংরক্ষণ হয়েছে। কুরিয়ার API ব্যবহার করা হয়নি।",
    "STORE MANAGEMENT": "স্টোর পরিচালনা",
    "CUSTOMERS & MESSAGES": "গ্রাহক ও বার্তা",
    "INSIGHTS & FINANCE": "বিশ্লেষণ ও আর্থিক হিসাব",
    "SYSTEM": "সিস্টেম",
    "FAVORITES": "প্রিয় বিভাগ",
    "No matching sections found.": "কোনো মিল পাওয়া যায়নি।",
    "Search menu…": "মেনু খুঁজুন…",
    "Search menu": "মেনু খুঁজুন",
    "Search this page’s records…": "এই পেজের রেকর্ড খুঁজুন…",
    "Search records on this page": "এই পেজের রেকর্ড খুঁজুন",
    "Skip to main content": "মূল কনটেন্টে যান",
    "Primary navigation": "প্রধান নেভিগেশন",
    "Admin sections": "অ্যাডমিন বিভাগসমূহ",
    "Close navigation": "নেভিগেশন বন্ধ করুন",
    "Learning & testing project": "শেখা ও পরীক্ষামূলক প্রকল্প",
    "Live payments and product deliveries are not enabled.": "বাস্তব পেমেন্ট ও পণ্য ডেলিভারি চালু নেই।",
    "Basic view": "সাধারণ ভিউ",
    "Switch to advanced view": "উন্নত ভিউতে যান",
    "Switch to basic view": "সাধারণ ভিউতে যান",
    "Open quick guide": "দ্রুত নির্দেশিকা খুলুন",
    "Quick guide": "দ্রুত নির্দেশিকা",
    "Settings & security": "সেটিংস ও নিরাপত্তা",
    "SIGNED IN": "সাইন ইন করা আছে",
    "Today": "আজ",
    "Yesterday": "গতকাল",
    "This week": "এই সপ্তাহ",
    "Last week": "গত সপ্তাহ",
    "This month": "এই মাস",
    "Last month": "গত মাস",
    "This year": "এই বছর",
    "Custom range": "নিজস্ব সময়সীমা",
    "Apply": "প্রয়োগ করুন",
    "Performance period": "সময়সীমা",
    "Last year": "গত বছর",
    "Line": "লাইন",
    "Bar": "বার",
    "Chart type": "চার্টের ধরন",
  };

  const reverseTranslations = Object.create(null);
  Object.entries(translations).forEach(([source, target]) => {
    if (target && !reverseTranslations[target]) reverseTranslations[target] = source;
  });

  function escapeRegExp(value) {
    return String(value).split("").map(char =>
      "\\^$.*+?()[]{}|".includes(char) ? "\\" + char : char
    ).join("");
  }

  function buildPhraseRules(sourceMap) {
    return Object.entries(sourceMap)
      .filter(([source]) => /\s/.test(source.trim()) && source.trim().length > 2)
      .sort((a, b) => b[0].length - a[0].length)
      .map(([source, target]) => {
        try {
          const pattern = new RegExp("(^|[^\\p{L}\\p{N}])(" + escapeRegExp(source.trim()) + ")(?=$|[^\\p{L}\\p{N}])", "giu");
          return { source: source.toLocaleLowerCase(), pattern, target };
        } catch (_) {
          return null;
        }
      })
      .filter(Boolean);
  }

  const phraseRules = {
    bn: buildPhraseRules(translations),
    en: buildPhraseRules(reverseTranslations)
  };

    "AI Permission Center": "এআই অনুমতি কেন্দ্র",
    "CHATGPT ACCESS · APPROVALS · AUDIT": "চ্যাটজিপিটি প্রবেশাধিকার · অনুমোদন · নিরীক্ষা",
    "Control exactly what the Halal Food workspace allows ChatGPT to read or change. Every future request will be shown here with its purpose, affected resource and requested duration.": "হালাল ফুড কর্মক্ষেত্রে চ্যাটজিপিটি কী পড়তে বা পরিবর্তন করতে পারবে তা নির্দিষ্টভাবে নিয়ন্ত্রণ করুন। ভবিষ্যতের প্রতিটি অনুরোধের উদ্দেশ্য, প্রভাবিত রিসোর্স ও চাওয়া সময়সীমা এখানে দেখা যাবে।",
    "Secure Bridge not connected": "সুরক্ষিত ব্রিজ সংযুক্ত নয়",
    "Approval controls are waiting for the secure connection": "অনুমোদন ব্যবস্থা সুরক্ষিত সংযোগের অপেক্ষায়",
    "This dashboard section is ready as the permission workspace, but no ChatGPT Bridge/OAuth connection has been configured yet. No access has been granted, and no approval request is currently being received. We will only enable Approve/Deny after the server-side bridge can verify and enforce each grant.": "এই ড্যাশবোর্ডে অনুমতি ব্যবস্থার জায়গাটি প্রস্তুত, তবে এখনো ChatGPT Bridge/OAuth সংযোগ কনফিগার করা হয়নি। কোনো প্রবেশাধিকার দেওয়া হয়নি এবং বর্তমানে কোনো অনুমোদনের অনুরোধও আসছে না। সার্ভার-সাইড ব্রিজ প্রতিটি অনুমতি যাচাই ও কার্যকর করতে পারলেই Approve/Deny চালু হবে।",
    "Connection readiness": "সংযোগ প্রস্তুতি",
    "What must be in place before ChatGPT can request access.": "চ্যাটজিপিটি প্রবেশাধিকার চাইতে পারার আগে যা প্রস্তুত থাকতে হবে।",
    "Setup pending": "সেটআপ বাকি",
    "Secure Bridge endpoint": "সুরক্ষিত ব্রিজ এন্ডপয়েন্ট",
    "A remote MCP service that exposes only approved Halal Food actions—not unrestricted database or server access.": "একটি রিমোট MCP সার্ভিস, যা শুধু অনুমোদিত হালাল ফুড কাজগুলো প্রকাশ করবে—সীমাহীন ডেটাবেস বা সার্ভার প্রবেশাধিকার নয়।",
    "OAuth 2.1 sign-in": "OAuth 2.1 সাইন-ইন",
    "ChatGPT must connect through a verified admin identity using Authorization Code + PKCE. No permanent secret key is placed in the browser.": "চ্যাটজিপিটিকে Authorization Code + PKCE ব্যবহার করে যাচাইকৃত অ্যাডমিন পরিচয়ে সংযুক্ত হতে হবে। ব্রাউজারে কোনো স্থায়ী গোপন কী রাখা হবে না।",
    "Server-enforced permission grants": "সার্ভার-নিয়ন্ত্রিত অনুমতি",
    "Every request is checked against the approved scope, resource, expiry and admin identity before it runs.": "প্রতিটি কাজ চালানোর আগে অনুমোদিত স্কোপ, রিসোর্স, মেয়াদ ও অ্যাডমিন পরিচয় যাচাই করা হবে।",
    "ChatGPT app connection": "চ্যাটজিপিটি অ্যাপ সংযোগ",
    "Connect the Bridge as a custom app in a ChatGPT plan that supports the required MCP access level.": "প্রয়োজনীয় MCP প্রবেশাধিকার সমর্থন করে এমন ChatGPT প্ল্যানে ব্রিজটিকে কাস্টম অ্যাপ হিসেবে সংযুক্ত করুন।",
    "Access overview": "প্রবেশাধিকারের সারসংক্ষেপ",
    "Current state for this workspace.": "এই কর্মক্ষেত্রের বর্তমান অবস্থা।",
    "No grants": "কোনো অনুমতি নেই",
    "Active grants": "সক্রিয় অনুমতি",
    "Pending": "অপেক্ষমাণ",
    "Revoked": "প্রত্যাহার করা",
    "These are initial empty-state values, not live database counts. They will become live once the Bridge and approval records are connected.": "এগুলো প্রাথমিক খালি অবস্থার মান, লাইভ ডেটাবেসের গণনা নয়। ব্রিজ ও অনুমোদনের রেকর্ড যুক্ত হলে লাইভ তথ্য দেখাবে।",
    "Pending approval requests": "অনুমোদনের অপেক্ষায় থাকা অনুরোধ",
    "When ChatGPT needs access, the request will show the action, reason, data impact, risk and requested time limit here.": "চ্যাটজিপিটির প্রবেশাধিকার প্রয়োজন হলে কাজ, কারণ, ডেটার ওপর প্রভাব, ঝুঁকি ও চাওয়া সময়সীমাসহ অনুরোধ এখানে দেখাবে।",
    "0 requests": "০টি অনুরোধ",
    "No approval requests yet": "এখনো কোনো অনুমোদনের অনুরোধ নেই",
    "There are no requests to approve or deny. Once the secure Bridge is connected, requests will appear here and you can approve once, allow for a short period, or deny them.": "অনুমোদন বা প্রত্যাখ্যান করার মতো কোনো অনুরোধ নেই। সুরক্ষিত ব্রিজ যুক্ত হলে অনুরোধ এখানে আসবে; আপনি একবারের জন্য অনুমতি দিতে, অল্প সময়ের জন্য অনুমতি দিতে বা প্রত্যাখ্যান করতে পারবেন।",
    "Permission catalogue": "অনুমতির তালিকা",
    "These are the access categories the Bridge may request. All remain disabled until you approve a specific request.": "ব্রিজ যেসব ধরনের প্রবেশাধিকার চাইতে পারে সেগুলো এখানে দেওয়া হলো। নির্দিষ্ট অনুরোধ অনুমোদন না করা পর্যন্ত সব বন্ধ থাকবে।",
    "Default: denied": "ডিফল্ট: অনুমতি নেই",
    "Permission": "অনুমতি",
    "What it allows": "এতে কী করা যাবে",
    "Current access": "বর্তমান প্রবেশাধিকার",
    "Storage Read": "স্টোরেজ পড়া",
    "List and inspect approved storage objects": "অনুমোদিত স্টোরেজ ফাইলের তালিকা ও বিবরণ দেখা",
    "Not granted": "অনুমতি দেওয়া হয়নি",
    "Storage Upload": "স্টোরেজে আপলোড",
    "Upload files to an approved bucket/path": "অনুমোদিত বাকেট/পাথে ফাইল আপলোড",
    "Backup Verification": "ব্যাকআপ যাচাই",
    "Compare source and backup object integrity": "মূল ও ব্যাকআপ ফাইলের অখণ্ডতা তুলনা করে দেখা",
    "Product Management": "পণ্য ব্যবস্থাপনা",
    "Read or edit specified product records": "নির্দিষ্ট পণ্যের তথ্য পড়া বা সম্পাদনা",
    "Order Management": "অর্ডার ব্যবস্থাপনা",
    "Read or update specified order fields": "নির্দিষ্ট অর্ডারের তথ্য পড়া বা আপডেট",
    "Database Read": "ডেটাবেস পড়া",
    "Read explicitly allow-listed tables and columns": "স্পষ্টভাবে অনুমোদিত টেবিল ও কলাম পড়া",
    "Database Write": "ডেটাবেসে লেখা",
    "Write only to approved tables through safe operations": "নিরাপদ পদ্ধতিতে শুধু অনুমোদিত টেবিলে তথ্য লেখা",
    "Deploy / Publish": "ডেপ্লয় / প্রকাশ",
    "Prepare or publish a reviewed website release": "পর্যালোচিত ওয়েবসাইট সংস্করণ প্রস্তুত বা প্রকাশ",
    "Separate approval": "আলাদা অনুমোদন",
    "Delete / Destructive": "মুছে ফেলা / ধ্বংসাত্মক কাজ",
    "Delete data or permanently remove resources": "ডেটা বা রিসোর্স স্থায়ীভাবে মুছে ফেলা",
    "Blocked by default": "ডিফল্টভাবে বন্ধ",
    "Approval and safety rules": "অনুমোদন ও নিরাপত্তার নিয়ম",
    "These rules will be enforced by the Bridge—not just by dashboard buttons.": "এই নিয়মগুলো শুধু ড্যাশবোর্ডের বাটনে নয়, ব্রিজের সার্ভারেও কার্যকর থাকবে।",
    "Approve once": "একবারের অনুমতি",
    "Allow one specific action, then automatically expire the grant.": "একটি নির্দিষ্ট কাজের অনুমতি দিন; কাজ শেষে অনুমতি স্বয়ংক্রিয়ভাবে শেষ হবে।",
    "One action": "একটি কাজ",
    "Temporary access": "সাময়িক প্রবেশাধিকার",
    "Allow a requested scope for a short, visible period such as 15 minutes.": "১৫ মিনিটের মতো দৃশ্যমান স্বল্প সময়ের জন্য চাওয়া স্কোপ অনুমোদন করুন।",
    "Time-limited": "সময়সীমাবদ্ধ",
    "Resource-bound access": "নির্দিষ্ট রিসোর্সে প্রবেশাধিকার",
    "Bind every grant to the requested site, bucket, folder, table or record.": "প্রতিটি অনুমতিকে নির্দিষ্ট সাইট, বাকেট, ফোল্ডার, টেবিল বা রেকর্ডের মধ্যে সীমাবদ্ধ রাখুন।",
    "Narrow scope": "সীমিত স্কোপ",
    "Revoke at any time": "যেকোনো সময় প্রত্যাহার",
    "Disable an active grant immediately and record who revoked it.": "সক্রিয় অনুমতি সঙ্গে সঙ্গে বন্ধ করুন এবং কে প্রত্যাহার করেছেন তা সংরক্ষণ করুন।",
    "Revocable": "প্রত্যাহারযোগ্য",
    "Audit every action": "প্রতিটি কাজের নিরীক্ষা",
    "Record request, decision, actor, timestamp, resource and execution result.": "অনুরোধ, সিদ্ধান্ত, ব্যক্তি, সময়, রিসোর্স ও কাজের ফলাফল সংরক্ষণ করুন।",
    "Audited": "নিরীক্ষিত",
    "Destructive actions": "ধ্বংসাত্মক কাজ",
    "Delete and production deployment require separate explicit confirmation; no blanket admin token.": "মুছে ফেলা ও প্রোডাকশন ডেপ্লয়ের জন্য আলাদা স্পষ্ট অনুমোদন লাগবে; কোনো সার্বিক অ্যাডমিন টোকেন থাকবে না।",
    "Extra approval": "অতিরিক্ত অনুমোদন",
    "Permission activity log": "অনুমতি কার্যক্রমের লগ",
    "Approval decisions and tool execution records will be listed here after the Bridge is connected.": "ব্রিজ যুক্ত হলে অনুমোদনের সিদ্ধান্ত ও টুল চালানোর রেকর্ড এখানে দেখা যাবে।",
    "Not connected": "সংযুক্ত নয়",
    "Audit log is not connected yet": "নিরীক্ষা লগ এখনো সংযুক্ত নয়",
    "No approval or execution history is being displayed because the permission backend has not been installed. Existing Halal Food admin activity logs are separate from this future ChatGPT permission audit.": "অনুমতির ব্যাকএন্ড এখনো ইনস্টল না হওয়ায় অনুমোদন বা কাজ চালানোর ইতিহাস দেখানো হচ্ছে না। হালাল ফুডের বর্তমান অ্যাডমিন কার্যক্রমের লগ ভবিষ্যতের এই ChatGPT অনুমতি নিরীক্ষা থেকে আলাদা।",
  const textState = new WeakMap();
  const attrState = new WeakMap();
  const chartState = new WeakMap();
  const attrNames = ["placeholder", "title", "aria-label", "alt"];
  const ignoredTags = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE"]);

  function language() {
    try { return localStorage.getItem("hf_admin_language") === "bn" ? "bn" : "en"; }
    catch (_) { return "en"; }
  }

  function translated(value, lang) {
    const source = String(value ?? "");
    if (lang === "bn") {
      if (translations[source]) return translations[source];
      const titleCase = source ? source.charAt(0).toUpperCase() + source.slice(1) : source;
      if (translations[titleCase]) return translations[titleCase];
      const favorite = source.match(/^(Add|Remove)\s+(.+?)\s+from favorites$/i);
      if (favorite) {
        const label = translated(favorite[2], lang);
        return (favorite[1].toLowerCase() === "add" ? "প্রিয় বিভাগে যোগ করুন: " : "প্রিয় বিভাগ থেকে সরান: ") + label;
      }
      const theme = source.match(/^Select (.+) theme$/i);
      if (theme) return "রং-সজ্জা বেছে নিন: " + translated(theme[1], lang);
      return translatePhrases(source, lang);
    }
    if (reverseTranslations[source]) return reverseTranslations[source];
    return translatePhrases(source, lang);
  }

  function translatePhrases(value, lang) {
    let output = String(value ?? "");
    const rules = phraseRules[lang] || [];
    const searchable = output.toLocaleLowerCase();
    for (const rule of rules) {
      if (!searchable.includes(rule.source)) continue;
      output = output.replace(rule.pattern, (_match, prefix) => prefix + rule.target);
    }
    return output;
  }

  function translateChart(chart, lang = language()) {
    if (!chart?.data) return;
    let state = chartState.get(chart);
    if (!state) {
      state = {
        labels: Array.isArray(chart.data.labels) ? chart.data.labels.slice() : null,
        datasets: (chart.data.datasets || []).map(dataset => dataset.label)
      };
      chartState.set(chart, state);
    }
    if (state.labels) chart.data.labels = state.labels.map(label => translated(String(label ?? ""), lang));
    (chart.data.datasets || []).forEach((dataset, index) => {
      if (state.datasets[index] !== undefined) dataset.label = translated(String(state.datasets[index] ?? ""), lang);
    });
    chart.update?.("none");
  }

  function translateCharts(lang = language()) {
    const charts = window.HFAdmin?.charts;
    if (!charts) return;
    Object.values(charts).forEach(chart => translateChart(chart, lang));
  }

  function isPickerOption(node) {
    const el = node.nodeType === 1 ? node : node.parentElement;
    return !!el?.closest?.(".hf-language-segment, .hf-language-picker") && (!!el.closest?.("option") || el.tagName === "OPTION" || !!el.closest?.(".hf-language-segment"));
  }

  function translateText(node, lang) {
    if (!node || node.nodeType !== 3 || isPickerOption(node)) return;
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
    if (!el || el.nodeType !== 1 || isPickerOption(el) || ignoredTags.has(el.tagName)) return;
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
    if (root.nodeType === 1) {
      if (ignoredTags.has(root.tagName) || isPickerOption(root)) return;
      translateElement(root, lang);
    }
    // One traversal handles both elements and text nodes; avoid two full DOM passes.
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeType === 1) {
          if (ignoredTags.has(node.tagName) || isPickerOption(node)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
        return isPickerOption(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === 1) translateElement(node, lang);
      else translateText(node, lang);
    }
  }

  function injectStyles() {
    if (document.getElementById("hfLanguageStyles")) return;
    const style = document.createElement("style");
    style.id = "hfLanguageStyles";
    style.textContent =
      ".hf-language-segment{display:inline-flex;align-items:center;gap:3px;flex:0 0 auto;padding:3px;border:1px solid #E5DED4;border-radius:12px;background:#F8F6F1;white-space:nowrap}" +
      ".hf-language-label{padding:0 5px;color:#756D63;font-size:10px;font-weight:750}" +
      ".hf-language-segment button{min-height:31px;padding:5px 10px;border:0;border-radius:8px;background:transparent;color:#5B5660;font:700 11px Inter,system-ui,sans-serif;cursor:pointer;white-space:nowrap}" +
      ".hf-language-segment button.is-active{background:#C97B3D;color:#FFFDF8;box-shadow:0 1px 3px rgba(80,48,24,.14)}" +
      ".hf-language-segment button:focus-visible{outline:2px solid #8B542F;outline-offset:2px}" +
      ".hf-language-picker{display:inline-flex;align-items:center;gap:7px;flex:0 0 auto;white-space:nowrap}" +
      ".hf-language-picker>span{font-size:10px;font-weight:800;letter-spacing:.02em;color:var(--hf-muted,#96A6BE)}" +
      ".hf-language-picker select{max-width:116px;min-width:84px;height:38px;padding:6px 25px 6px 9px;border:1px solid var(--hf-border,#30425C);border-radius:10px;background:var(--hf-surface,#111C2E);color:var(--hf-navy,#E6EDF8);font:600 11px Inter,system-ui,sans-serif}" +
      "body>header .hf-language-picker{margin-left:auto;margin-right:10px}" +
      "body>header .hf-language-picker>span{color:#B9C6D8}" +
      "body>header .hf-language-picker select{background:#17243A;color:#F2F6FF;border-color:#30425C}" +
      "html[data-admin-theme=\"light\"] .hf-language-picker select{background:#FFFDF8;color:#2B2A3D;border-color:#E5E0D6}" +
      "@media(max-width:760px){.admin-topbar{gap:6px!important;height:auto!important;min-height:66px;flex-wrap:wrap;align-content:center;padding-top:10px;padding-bottom:10px}.admin-topbar-spacer{display:none}.admin-global-search{order:10;flex:1 0 100%;width:100%;max-width:none}.admin-topbar-actions{gap:5px;flex-wrap:wrap;justify-content:flex-end}.hf-language-segment{gap:2px;padding:2px}.hf-language-label{display:none}.hf-language-segment button{min-height:30px;padding:5px 8px;font-size:10px}.hf-language-picker{gap:4px}.hf-language-picker>span{display:none}.hf-language-picker select{min-width:70px;width:75px;max-width:75px;padding:6px 4px;font-size:10px}body>header{flex-wrap:wrap;gap:8px}body>header .hf-language-picker{margin-left:auto;margin-right:0}}";
    document.head.appendChild(style);
  }

  function ensurePicker() {
    let segment = document.querySelector(".hf-language-segment");
    if (!segment) {
      const host = document.querySelector(".admin-topbar-actions") ||
        document.querySelector(".admin-topbar") ||
        document.querySelector("body>header");
      if (host) {
        segment = document.createElement("div");
        segment.className = "hf-language-segment";
        segment.setAttribute("role", "group");
        segment.setAttribute("aria-label", "Language");
        segment.innerHTML = '<span class="hf-language-label">Language</span><button type="button" data-hf-language="bn" aria-pressed="false">বাংলা</button><button type="button" data-hf-language="en" aria-pressed="false">English</button>';
        const actions = host.classList?.contains("admin-topbar-actions") ? host : host.querySelector?.(".admin-topbar-actions");
        const target = actions || host;
        target.insertBefore(segment, target.firstChild);
      }
    }
    if (!segment) return;
    if (!segment.dataset.hfBound) {
      segment.addEventListener("click", (event) => {
        const button = event.target.closest("[data-hf-language]");
        if (!button || !segment.contains(button)) return;
        const next = button.dataset.hfLanguage;
        if (next !== "bn" && next !== "en") return;
        try { localStorage.setItem("hf_admin_language", next); } catch (_) {}
        applyLanguage();
      });
      segment.dataset.hfBound = "true";
    }
    const lang = language();
    const label = segment.querySelector(".hf-language-label");
    const labelText = lang === "bn" ? "ভাষা" : "Language";
    if (label && label.textContent !== labelText) label.textContent = labelText;
    segment.querySelectorAll("[data-hf-language]").forEach(button => {
      const active = button.dataset.hfLanguage === lang;
      const pressed = String(active);
      if (button.getAttribute("aria-pressed") !== pressed) button.setAttribute("aria-pressed", pressed);
      if (button.classList.contains("is-active") !== active) button.classList.toggle("is-active", active);
    });
  }

  function applyLanguage() {
    const lang = language();
    document.documentElement.lang = lang === "bn" ? "bn" : "en";
    injectStyles();
    ensurePicker();
    translateTree(document.documentElement, lang);
    document.documentElement.dataset.adminLanguage = lang;
    ensurePicker();
    translateCharts(lang);
  }

  function boot() {
    injectStyles();
    ensurePicker();
    applyLanguage();
    const observer = new MutationObserver(records => {
      const lang = language();
      const addedNodes = new Set();
      for (const record of records) {
        if (record.type === "characterData") {
          if (!isPickerOption(record.target)) translateText(record.target, lang);
          continue;
        }
        if (record.type === "attributes") {
          if (!isPickerOption(record.target)) translateElement(record.target, lang);
          continue;
        }
        if (record.type !== "childList") continue;
        for (const node of record.addedNodes || []) {
          if (!isPickerOption(node)) addedNodes.add(node);
        }
      }
      // Translate only outermost roots to avoid scanning nested subtrees repeatedly.
      const roots = [];
      addedNodes.forEach(node => {
        let parent = node.parentNode, nested = false;
        while (parent && parent !== document.body) {
          if (addedNodes.has(parent)) { nested = true; break; }
          parent = parent.parentNode;
        }
        if (!nested) roots.push(node);
      });
      roots.forEach(node => translateTree(node, lang));
      if (!document.querySelector(".hf-language-segment, .hf-language-picker")) ensurePicker();
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: attrNames });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
  window.HFAdminLanguage = { language, applyLanguage, translateTree, translateChart, translateCharts, t: (value) => translated(String(value ?? ""), language()), dictionary: translations };
})();