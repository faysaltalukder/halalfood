/* Live blog bridge: published posts come from Supabase; static article pages remain the fallback. */
(function () {
  "use strict";
  const API_ROOT = "https://qfwvrcfkrsydycbfjsxf.supabase.co";
  const PUBLIC_KEY = "sb_publishable_X32Rb8W-axGIfgFuppdfZQ_jbc38pcL";
  const SITE_ROOT = "https://faysaltalukder.github.io/halalfood/";
  const $ = (s, root) => (root || document).querySelector(s);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const rootURL = path => new URL(path, SITE_ROOT).href;
  const dateText = value => value ? new Date(value).toLocaleDateString("en-BD",{year:"numeric",month:"short",day:"numeric"}) : "";
  async function readPosts(slug) {
    const params = {
      select:"id,title,slug,excerpt,content,featured_image_url,category,status,published_at,seo_title,seo_description,cms_created,cms_managed,updated_at",
      status:"eq.published",
      or:"(published_at.is.null,published_at.lte." + new Date().toISOString() + ")",
      order:"published_at.desc.nullslast,created_at.desc",
      limit:"250"
    };
    if (slug) { params.slug = "eq." + slug; params.limit = "1"; }
    const response = await fetch(API_ROOT + "/rest/v1/blog_posts?" + new URLSearchParams(params), {
      headers:{apikey:PUBLIC_KEY,Authorization:"Bearer "+PUBLIC_KEY,Accept:"application/json"},
      cache:"no-store"
    });
    if (!response.ok) throw new Error("Blog content request failed ("+response.status+").");
    return response.json();
  }
  function postHref(post) {
    return post.cms_created ? rootURL("blog/post.html?slug="+encodeURIComponent(post.slug)) :
      rootURL("blog/"+encodeURIComponent(post.slug)+".html");
  }
  function renderCard(post) {
    const href = postHref(post);
    return '<article class="blog-card"><a class="blog-card-img" href="'+esc(href)+'">'+
      (post.featured_image_url ? '<img src="'+esc(post.featured_image_url)+'" alt="'+esc(post.title)+'" loading="lazy" decoding="async">' : '<span class="blog-card-img-placeholder" aria-hidden="true"></span>')+
      '</a><div class="blog-card-body"><span class="tag">'+esc(post.category||"Guides")+'</span>'+
      '<h3><a href="'+esc(href)+'">'+esc(post.title)+'</a></h3><p>'+esc(post.excerpt||"")+'</p>'+
      (post.published_at ? '<span class="blog-card-date">'+esc(dateText(post.published_at))+'</span>' : '')+
      '<a class="blog-read-more" href="'+esc(href)+'">Read more →</a></div></article>';
  }
  function renderArticle(post, forceTemplate) {
    const box = $(".blog-post-body");
    if (!box) return;
    const canOverwrite = forceTemplate || Boolean(post.cms_managed);
    if (!canOverwrite) return;
    const title = $("h1", box);
    if (title) title.textContent = post.title;
    let image = $(".blog-post-img-frame img", box);
    if (!image) {
      const frame = document.createElement("span");
      frame.className = "blog-post-img-frame";
      frame.innerHTML = '<img alt="" loading="eager" decoding="async">';
      const h = $("h1",box);
      if (h) h.insertAdjacentElement("afterend",frame);
      image = $("img",frame);
    }
    if (image) {
      if (post.featured_image_url) { image.src=post.featured_image_url; image.alt=post.title; image.classList.remove("hidden"); }
      else image.closest(".blog-post-img-frame")?.classList.add("hidden");
    }
    const crumb = $(".section-eyebrow",box);
    if (crumb) crumb.innerHTML = '<a href="'+esc(rootURL("blog/index.html"))+'">Blog</a> / '+esc(post.category||"Guides");
    let content = $("#live-post-content");
    if (!content) {
      content = document.createElement("div");
      content.id = "live-post-content";
      content.className = "cms-live-post-content";
      const h = $("h1",box);
      const imgFrame = $(".blog-post-img-frame",box);
      (imgFrame || h)?.insertAdjacentElement("afterend",content);
      Array.from(box.children).forEach(node=>{
        if(node===content || node===h || node===imgFrame || node===crumb) return;
        if(node.tagName==="P" || /^H[2-6]$/.test(node.tagName) || node.tagName==="UL" || node.tagName==="OL") node.remove();
      });
    }
    const lines = String(post.content||"").trim().split(/\n{2,}/).map(line=>line.trim()).filter(Boolean);
    content.innerHTML = lines.map(line=>{
      if(line.startsWith("## ")) return "<h2>"+esc(line.slice(3))+"</h2>";
      if(line.startsWith("### ")) return "<h3>"+esc(line.slice(4))+"</h3>";
      if(line.startsWith("- ") || line.startsWith("• ")) return "<p>"+esc(line)+"</p>";
      return "<p>"+esc(line).replace(/\n/g,"<br>")+"</p>";
    }).join("");
    const meta = document.querySelector('meta[name="description"]');
    if(meta) meta.content = post.seo_description || post.excerpt || post.title;
    const canonical = document.querySelector('link[rel="canonical"]');
    if(canonical) canonical.href = post.cms_created ? rootURL("blog/post.html?slug="+encodeURIComponent(post.slug)) : rootURL("blog/"+encodeURIComponent(post.slug)+".html");
    document.title = (post.seo_title || post.title) + " — Halal Food Blog";
  }
  async function start() {
    const pathname = location.pathname;
    const isListing = /\/blog\/(?:index\.html)?$/i.test(pathname);
    const isDynamic = /\/blog\/post\.html$/i.test(pathname);
    if (isListing) {
      const grid = $(".blog-grid");
      if (!grid) return;
      try {
        const posts = await readPosts();
        grid.innerHTML = posts.length ? posts.map(renderCard).join("") : '<p class="muted">No published posts yet.</p>';
        const count = $(".blog-post-count");
        if(count) count.textContent = String(posts.length);
      } catch(error) {
        console.warn("Live blog is unavailable; keeping the existing static blog listing.",error);
      }
      return;
    }
    const slug = isDynamic ? new URLSearchParams(location.search).get("slug") : pathname.split("/").pop().replace(/\.html$/i,"");
    if(!slug) return;
    try {
      const posts = await readPosts(slug);
      if(!posts.length) {
        if(isDynamic) {
          const box = $(".blog-post-body");
          if(box) box.innerHTML = '<p class="section-eyebrow"><a href="'+esc(rootURL("blog/index.html"))+'">Blog</a></p><h1>Post unavailable</h1><p>This post is not published or could not be found.</p>';
        }
        return;
      }
      renderArticle(posts[0],isDynamic);
    } catch(error) {
      console.warn("Live blog article is unavailable; keeping the existing article where possible.",error);
      if(isDynamic) {
        const box=$(".blog-post-body");
        if(box) box.innerHTML='<p class="section-eyebrow"><a href="'+esc(rootURL("blog/index.html"))+'">Blog</a></p><h1>Could not load this post</h1><p>Please refresh the page and try again.</p>';
      }
    }
  }
  document.addEventListener("DOMContentLoaded",()=>start().catch(error=>console.error("Live blog initialization failed",error)));
})();