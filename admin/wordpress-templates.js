(() => {
 "use strict";
 const categories={
  "ecommerce-grocery":"E-commerce & Grocery","clothing-fashion":"Clothing & Fashion","medicine-pharmacy":"Medicine & Pharmacy","hospital-healthcare":"Hospital & Healthcare","real-estate":"Real Estate & Property","restaurant-food":"Restaurant & Food","education-training":"Education & Training","travel-tourism":"Travel & Tourism","hotel-accommodation":"Hotel & Accommodation","beauty-salon":"Beauty & Salon","fitness-gym":"Fitness & Gym","automotive-services":"Automotive & Vehicle Services","professional-services":"Professional & Business Services","construction-interior":"Construction & Interior","events-weddings":"Event & Wedding Services","portfolio-agency":"Portfolio & Creative Agency","news-media":"News & Media","nonprofit-organization":"Nonprofit & Organization","logistics-delivery":"Logistics & Delivery","legal-accounting":"Legal & Accounting"
 };
 const params=new URLSearchParams(location.search);
 const slug=params.get("category")||"ecommerce-grocery";
 const selected=Math.max(1,Math.min(4,Number(params.get("template")||1)));
 const category=categories[slug]||"Business Website";
 const title=document.getElementById("wpTemplateCategoryTitle");
 const intro=document.getElementById("wpTemplateIntro");
 const label=document.getElementById("wpTemplateCategoryLabel");
 const selectedLabel=document.getElementById("wpTemplateSelectedLabel");
 const grid=document.getElementById("wpTemplateSlots");
 if(!grid)return;
 document.title=category+" Templates · Halal Food Admin";
 if(title)title.textContent=category;
 if(intro)intro.textContent="Template slots for "+category+". Designs will be added one by one in a later phase.";
 if(label)label.textContent=category;
 if(selectedLabel)selectedLabel.textContent="Template "+selected;
 grid.innerHTML=Array.from({length:4},(_,index)=>{
  const number=index+1,active=number===selected;
  return '<article class="hf-wpt-slot '+(active?"is-selected":"")+'"><div class="hf-wpt-slot-top"><span class="hf-wpt-slot-number">'+number+'</span><span class="hf-wpt-slot-state">EMPTY SLOT</span></div><h2>Template '+number+'</h2><p>Design not created yet. This slot is reserved for a future '+category.toLowerCase()+' website template.</p></article>';
 }).join("");
 })();