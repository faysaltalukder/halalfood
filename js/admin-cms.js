/* Halal Food Admin CMS — uses the existing MFA-verified Supabase client. */
(function () {
  "use strict";
  const ADMIN_EMAIL = "halalfoodbd.official@gmail.com";
  const PRODUCT_FIELDS = "id,name,slug,category,category_slug,price,unit_type,display_price,image_url,short_description,full_description,stock_quantity,is_active,is_featured,sort_order,seo_title,seo_description,cms_created,cms_managed,updated_at,created_at";
  const CATEGORY_FIELDS = "id,name,slug,description,image_url,is_active,sort_order,cms_created,updated_at,created_at";
  const POST_FIELDS = "id,title,slug,excerpt,content,featured_image_url,category,status,published_at,seo_title,seo_description,cms_created,cms_managed,updated_at,created_at";
  const state = { products: [], categories: [], posts: [], ready: false, loading: false };
  const el = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const money = value => "৳ " + Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 });
  const slugify = value => String(value || "").normalize("NFKD").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
  const stamp = value => value ? new Date(value).toLocaleDateString("en-BD") : "—";
  function notice(id, message, error) {
    const node = el(id);
    if (!node) return;
    node.textContent = message || "";
    node.classList.toggle("error", Boolean(error));
    node.classList.toggle("success", Boolean(message) && !error);
  }
  function adminSession(session) {
    return Boolean(session && String(session.user?.email || "").toLowerCase() === ADMIN_EMAIL);
  }
  function fillCategoryOptions(selected) {
    const choices = state.categories.filter(item => item.is_active || item.slug === selected);
    const html = '<option value="">Choose a category</option>' + choices
      .map(item => '<option value="' + esc(item.slug) + '" data-name="' + esc(item.name) + '"' +
        (item.slug === selected ? " selected" : "") + ">" + esc(item.name) + "</option>").join("");
    if (el("productCategory")) el("productCategory").innerHTML = html;
    if (el("categoryFilter")) {
      const previous = el("categoryFilter").value;
      el("categoryFilter").innerHTML = '<option value="">All categories</option>' +
        state.categories.map(item => '<option value="' + esc(item.slug) + '">' + esc(item.name) + "</option>").join("");
      if (state.categories.some(item => item.slug === previous)) el("categoryFilter").value = previous;
    }
  }
  async function loadAll() {
    if (state.loading) return;
    state.loading = true;
    ["cmsProductMsg", "cmsCategoryMsg", "cmsPostMsg"].forEach(id => notice(id, ""));
    try {
      const results = await Promise.all([
        client.from("products").select(PRODUCT_FIELDS).order("sort_order", { ascending: true }).order("name", { ascending: true }).limit(1000),
        client.from("categories").select(CATEGORY_FIELDS).order("sort_order", { ascending: true }).order("name", { ascending: true }).limit(500),
        client.from("blog_posts").select(POST_FIELDS).order("updated_at", { ascending: false }).limit(500)
      ]);
      const labels = ["Products", "Categories", "Blog posts"];
      for (let i = 0; i < results.length; i++) {
        if (results[i].error) throw new Error(labels[i] + ": " + results[i].error.message);
      }
      state.products = results[0].data || [];
      state.categories = results[1].data || [];
      state.posts = results[2].data || [];
      fillCategoryOptions();
      renderProducts();
      renderCategories();
      renderPosts();
      state.ready = true;
      notice("cmsGlobalMsg", "Catalog synced with the database · " + state.products.length + " products · " + state.categories.length + " categories · " + state.posts.length + " posts");
    } catch (error) {
      notice("cmsGlobalMsg", "Could not load CMS data. " + (error?.message || "Check your admin session and database permissions."), true);
      console.error("Halal Food CMS load failed", error);
    } finally {
      state.loading = false;
    }
  }
  function renderProducts() {
    const body = el("cmsProductsBody");
    if (!body) return;
    const search = String(el("productSearch")?.value || "").trim().toLowerCase();
    const category = el("categoryFilter")?.value || "";
    const status = el("productStatusFilter")?.value || "";
    const rows = state.products.filter(item => {
      const text = [item.name, item.slug, item.category, item.short_description].join(" ").toLowerCase();
      return (!search || text.includes(search)) && (!category || item.category_slug === category) &&
        (!status || (status === "active" ? item.is_active : !item.is_active));
    });
    body.innerHTML = rows.length ? rows.map(item =>
      '<tr><td><div class="cms-product-cell">' +
        (item.image_url ? '<img src="' + esc(item.image_url) + '" alt="" loading="lazy">' : '<span class="cms-image-placeholder">No image</span>') +
        '<div><strong>' + esc(item.name) + '</strong><small>/' + esc(item.slug) + '</small></div></div></td>' +
      '<td>' + esc(item.category || "—") + '</td><td>' + esc(item.display_price || money(item.price)) + '</td>' +
      '<td><span class="cms-status ' + (item.is_active ? "active" : "inactive") + '">' + (item.is_active ? "Active" : "Hidden") + '</span>' +
        (item.is_featured ? '<span class="cms-status featured">Featured</span>' : "") + '</td>' +
      '<td>' + esc(stamp(item.updated_at || item.created_at)) + '</td><td><div class="cms-row-actions">' +
        '<button type="button" class="secondary" data-edit-product="' + esc(item.id) + '">Edit</button>' +
        '<button type="button" class="secondary" data-toggle-product="' + esc(item.id) + '">' + (item.is_active ? "Hide" : "Restore") + '</button>' +
        "</div></td></tr>"
    ).join("") : '<tr><td colspan="6" class="muted">No products match this filter.</td></tr>';
    el("cmsProductsCount").textContent = String(state.products.length);
    el("cmsProductsActive").textContent = String(state.products.filter(x => x.is_active).length);
    el("cmsProductsHidden").textContent = String(state.products.filter(x => !x.is_active).length);
  }
  function renderCategories() {
    const body = el("cmsCategoriesBody");
    if (!body) return;
    body.innerHTML = state.categories.length ? state.categories.map(item =>
      '<tr><td><div class="cms-product-cell">' +
      (item.image_url ? '<img src="' + esc(item.image_url) + '" alt="" loading="lazy">' : '<span class="cms-image-placeholder">Category</span>') +
      '<div><strong>' + esc(item.name) + '</strong><small>/' + esc(item.slug) + '</small></div></div></td>' +
      '<td>' + esc(state.products.filter(p => p.category_slug === item.slug && p.is_active).length) + '</td>' +
      '<td><span class="cms-status ' + (item.is_active ? "active" : "inactive") + '">' + (item.is_active ? "Visible" : "Hidden") + '</span></td>' +
      '<td>' + esc(item.sort_order ?? 0) + '</td><td><div class="cms-row-actions">' +
      '<button type="button" class="secondary" data-edit-category="' + esc(item.id) + '">Edit</button>' +
      '<button type="button" class="secondary" data-toggle-category="' + esc(item.id) + '">' + (item.is_active ? "Hide" : "Restore") + '</button>' +
      "</div></td></tr>"
    ).join("") : '<tr><td colspan="5" class="muted">No categories yet.</td></tr>';
    el("cmsCategoriesCount").textContent = String(state.categories.length);
  }
  function renderPosts() {
    const body = el("cmsPostsBody");
    if (!body) return;
    const search = String(el("postSearch")?.value || "").trim().toLowerCase();
    const status = el("postStatusFilter")?.value || "";
    const rows = state.posts.filter(item => (!search || [item.title, item.slug, item.category, item.excerpt].join(" ").toLowerCase().includes(search)) &&
      (!status || item.status === status));
    body.innerHTML = rows.length ? rows.map(item =>
      '<tr><td><div class="cms-product-cell">' +
      (item.featured_image_url ? '<img src="' + esc(item.featured_image_url) + '" alt="" loading="lazy">' : '<span class="cms-image-placeholder">No image</span>') +
      '<div><strong>' + esc(item.title) + '</strong><small>/blog/post.html?slug=' + esc(item.slug) + '</small></div></div></td>' +
      '<td>' + esc(item.category || "Guides") + '</td><td><span class="cms-status ' + esc(item.status) + '">' + esc(item.status) + '</span></td>' +
      '<td>' + esc(stamp(item.updated_at || item.created_at)) + '</td><td><div class="cms-row-actions">' +
      '<button type="button" class="secondary" data-edit-post="' + esc(item.id) + '">Edit</button>' +
      '<button type="button" class="secondary" data-toggle-post="' + esc(item.id) + '">' +
        (item.status === "published" ? "Unpublish" : item.status === "archived" ? "Restore" : "Publish") +
      "</button></div></td></tr>"
    ).join("") : '<tr><td colspan="5" class="muted">No posts match this filter.</td></tr>';
    el("cmsPostsCount").textContent = String(state.posts.length);
  }
  function openDialog(id) {
    const dialog = el(id);
    if (dialog && typeof dialog.showModal === "function") dialog.showModal();
    else if (dialog) dialog.setAttribute("open", "");
  }
  function closeDialog(id) {
    const dialog = el(id);
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }
  function slugFromName(nameInput, slugInput, lockAfterManual) {
    if (!nameInput || !slugInput) return;
    nameInput.addEventListener("input", () => {
      if (!slugInput.dataset.userEdited || slugInput.dataset.userEdited !== "1") slugInput.value = slugify(nameInput.value);
    });
    slugInput.addEventListener("input", () => { slugInput.dataset.userEdited = "1"; });
  }
  async function uploadImage(fileInput, folder, slug) {
    const file = fileInput?.files?.[0];
    if (!file) return null;
    if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) throw new Error("Choose a JPG, PNG, WebP or AVIF image.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Image size must be 5 MB or less.");
    const extMap = {"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"};
    const path = folder + "/" + slug + "-" + Date.now() + "." + extMap[file.type];
    const { error } = await client.storage.from("store-content").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    if (error) throw error;
    const result = client.storage.from("store-content").getPublicUrl(path);
    return result.data.publicUrl;
  }
  function setImagePreview(fileId, urlId, previewId) {
    const fileInput = el(fileId), urlInput = el(urlId), preview = el(previewId);
    const paint = src => {
      if (!preview) return;
      if (!src) { preview.removeAttribute("src"); preview.classList.add("hidden"); return; }
      preview.src = src; preview.classList.remove("hidden");
    };
    if (fileInput) fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (file) paint(URL.createObjectURL(file));
    });
    if (urlInput) urlInput.addEventListener("input", () => { if (!fileInput?.files?.length) paint(urlInput.value.trim()); });
  }
  function editProduct(id) {
    const item = state.products.find(p => p.id === id);
    const form = el("productForm");
    form.reset();
    el("productId").value = item?.id || "";
    el("productName").value = item?.name || "";
    el("productSlug").value = item?.slug || "";
    el("productSlug").dataset.userEdited = item ? "1" : "";
    fillCategoryOptions(item?.category_slug || "");
    el("productCategory").value = item?.category_slug || "";
    el("productPrice").value = item?.price ?? "";
    el("productUnit").value = item?.unit_type || "piece";
    el("productImageUrl").value = item?.image_url || "";
    el("productShortDescription").value = item?.short_description || "";
    el("productFullDescription").value = item?.full_description || item?.description || "";
    el("productStock").value = item?.stock_quantity ?? "";
    el("productSortOrder").value = item?.sort_order ?? 0;
    el("productSeoTitle").value = item?.seo_title || "";
    el("productSeoDescription").value = item?.seo_description || "";
    el("productActive").checked = item ? Boolean(item.is_active) : true;
    el("productFeatured").checked = item ? Boolean(item.is_featured) : false;
    el("productImageFile").value = "";
    el("productPreview").src = item?.image_url || "";
    el("productPreview").classList.toggle("hidden", !item?.image_url);
    el("productDialogTitle").textContent = item ? "Edit product" : "Add product";
    notice("productFormMsg", "");
    openDialog("productDialog");
  }
  async function saveProduct(event) {
    event.preventDefault();
    const button = el("saveProductBtn");
    button.disabled = true;
    notice("productFormMsg", "Saving product…");
    try {
      const id = el("productId").value || null;
      const name = el("productName").value.trim();
      const slug = slugify(el("productSlug").value || name);
      const categorySlug = el("productCategory").value;
      const category = state.categories.find(c => c.slug === categorySlug);
      const price = Number(el("productPrice").value);
      const unit = el("productUnit").value.trim() || "piece";
      if (!name || !slug || !category) throw new Error("Enter a product name, valid slug, and category.");
      if (!Number.isFinite(price) || price < 0) throw new Error("Price must be zero or greater.");
      if (state.products.some(p => p.slug === slug && p.id !== id)) throw new Error("This product slug is already in use.");
      let image = el("productImageUrl").value.trim() || null;
      const uploaded = await uploadImage(el("productImageFile"), "products", slug);
      if (uploaded) image = uploaded;
      const displayPrice = money(price) + (unit.toLowerCase() === "piece" ? " / piece" : " / " + unit);
      const stockRaw = el("productStock").value.trim();
      const row = {
        name, slug, category: category.name, category_slug: category.slug,
        cms_created: id ? Boolean(state.products.find(p => p.id === id)?.cms_created || state.products.find(p => p.id === id)?.slug !== slug) : true,
        cms_managed: true,
        price, unit_type: unit, display_price: displayPrice, image_url: image,
        short_description: el("productShortDescription").value.trim(),
        full_description: el("productFullDescription").value.trim(),
        description: el("productFullDescription").value.trim(),
        stock_quantity: stockRaw === "" ? null : Number(stockRaw),
        is_active: el("productActive").checked, is_featured: el("productFeatured").checked,
        sort_order: Number(el("productSortOrder").value || 0),
        seo_title: el("productSeoTitle").value.trim() || name + " | Halal Food",
        seo_description: el("productSeoDescription").value.trim() || el("productShortDescription").value.trim().slice(0, 155),
        updated_at: new Date().toISOString()
      };
      const result = id ? await client.from("products").update(row).eq("id", id).select("id").single()
        : await client.from("products").insert(row).select("id").single();
      if (result.error) throw result.error;
      closeDialog("productDialog");
      await loadAll();
      notice("cmsGlobalMsg", "Product saved. Active products update on the storefront when it loads the latest catalog.");
    } catch (error) {
      notice("productFormMsg", error?.message || "Could not save product.", true);
    } finally { button.disabled = false; }
  }
  async function toggleProduct(id) {
    const item = state.products.find(p => p.id === id);
    if (!item) return;
    const action = item.is_active ? "hide" : "restore";
    if (!window.confirm((item.is_active ? "Hide " : "Restore ") + item.name + "? " + (item.is_active ? "It will disappear from the live catalog; order history is kept." : "It will appear in the live catalog again."))) return;
    const { error } = await client.from("products").update({ is_active: !item.is_active, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { notice("cmsProductMsg", "Could not " + action + " product: " + error.message, true); return; }
    await loadAll();
  }
  function editCategory(id) {
    const item = state.categories.find(c => c.id === id);
    el("categoryForm").reset();
    el("categoryId").value = item?.id || "";
    el("categoryName").value = item?.name || "";
    el("categorySlug").value = item?.slug || "";
    el("categorySlug").readOnly = Boolean(item);
    el("categorySlug").dataset.userEdited = item ? "1" : "";
    el("categoryDescription").value = item?.description || "";
    el("categoryImageUrl").value = item?.image_url || "";
    el("categorySortOrder").value = item?.sort_order ?? 0;
    el("categoryActive").checked = item ? Boolean(item.is_active) : true;
    el("categoryImageFile").value = "";
    el("categoryPreview").src = item?.image_url || "";
    el("categoryPreview").classList.toggle("hidden", !item?.image_url);
    el("categoryDialogTitle").textContent = item ? "Edit category" : "Add category";
    notice("categoryFormMsg", "");
    openDialog("categoryDialog");
  }
  async function saveCategory(event) {
    event.preventDefault();
    const button = el("saveCategoryBtn");
    button.disabled = true;
    notice("categoryFormMsg", "Saving category…");
    try {
      const id = el("categoryId").value || null;
      const name = el("categoryName").value.trim();
      const slug = slugify(el("categorySlug").value || name);
      if (!name || !slug) throw new Error("Enter a category name and slug.");
      if (state.categories.some(c => c.slug === slug && c.id !== id)) throw new Error("This category slug is already in use.");
      let image = el("categoryImageUrl").value.trim() || null;
      const uploaded = await uploadImage(el("categoryImageFile"), "categories", slug);
      if (uploaded) image = uploaded;
      const row = { name, slug, cms_created: id ? Boolean(state.categories.find(x => x.id === id)?.cms_created) : true, description: el("categoryDescription").value.trim(), image_url: image,
        sort_order: Number(el("categorySortOrder").value || 0), is_active: el("categoryActive").checked, updated_at: new Date().toISOString() };
      let result;
      if (id) {
        const old = state.categories.find(c => c.id === id);
        result = await client.from("categories").update(row).eq("id", id).select("id").single();
        if (!result.error && old && old.name !== name) {
          const linked = await client.from("products").update({ category: name, updated_at: new Date().toISOString() }).eq("category_slug", old.slug);
          if (linked.error) throw linked.error;
        }
      } else result = await client.from("categories").insert(row).select("id").single();
      if (result.error) throw result.error;
      closeDialog("categoryDialog");
      await loadAll();
      notice("cmsGlobalMsg", "Category saved. Storefront navigation and category listings read the active catalog.");
    } catch (error) {
      notice("categoryFormMsg", error?.message || "Could not save category.", true);
    } finally { button.disabled = false; }
  }
  async function toggleCategory(id) {
    const item = state.categories.find(c => c.id === id);
    if (!item) return;
    if (!window.confirm((item.is_active ? "Hide " : "Restore ") + item.name + "? Products and historical data will be kept.")) return;
    const { error } = await client.from("categories").update({ is_active: !item.is_active, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { notice("cmsCategoryMsg", "Could not update category: " + error.message, true); return; }
    await loadAll();
  }
  function editPost(id) {
    const item = state.posts.find(p => p.id === id);
    el("postForm").reset();
    el("postId").value = item?.id || "";
    el("postTitle").value = item?.title || "";
    el("postSlug").value = item?.slug || "";
    el("postSlug").dataset.userEdited = item ? "1" : "";
    el("postExcerpt").value = item?.excerpt || "";
    el("postContent").value = item?.content || "";
    el("postCategory").value = item?.category || "Guides";
    el("postImageUrl").value = item?.featured_image_url || "";
    el("postSeoTitle").value = item?.seo_title || "";
    el("postSeoDescription").value = item?.seo_description || "";
    el("postStatus").value = item?.status || "draft";
    el("postImageFile").value = "";
    el("postPreview").src = item?.featured_image_url || "";
    el("postPreview").classList.toggle("hidden", !item?.featured_image_url);
    el("postDialogTitle").textContent = item ? "Edit blog post" : "Create blog post";
    notice("postFormMsg", "");
    openDialog("postDialog");
  }
  async function savePost(event) {
    event.preventDefault();
    const button = el("savePostBtn");
    button.disabled = true;
    notice("postFormMsg", "Saving post…");
    try {
      const id = el("postId").value || null;
      const title = el("postTitle").value.trim();
      const slug = slugify(el("postSlug").value || title);
      if (!title || !slug || !el("postContent").value.trim()) throw new Error("Enter a title, slug, and article content.");
      if (state.posts.some(p => p.slug === slug && p.id !== id)) throw new Error("This post slug is already in use.");
      let image = el("postImageUrl").value.trim() || null;
      const uploaded = await uploadImage(el("postImageFile"), "posts", slug);
      if (uploaded) image = uploaded;
      const status = el("postStatus").value;
      const old = state.posts.find(p => p.id === id);
      const row = {
        title, slug, cms_created: id ? Boolean(state.posts.find(p => p.id === id)?.cms_created || state.posts.find(p => p.id === id)?.slug !== slug) : true, cms_managed: true, excerpt: el("postExcerpt").value.trim(), content: el("postContent").value.trim(),
        featured_image_url: image, category: el("postCategory").value.trim() || "Guides", status,
        published_at: status === "published" ? (old?.published_at || new Date().toISOString()) : null,
        seo_title: el("postSeoTitle").value.trim() || title + " | Halal Food Blog",
        seo_description: el("postSeoDescription").value.trim() || el("postExcerpt").value.trim().slice(0, 155),
        updated_at: new Date().toISOString()
      };
      const result = id ? await client.from("blog_posts").update(row).eq("id", id).select("id").single()
        : await client.from("blog_posts").insert(row).select("id").single();
      if (result.error) throw result.error;
      closeDialog("postDialog");
      await loadAll();
      notice("cmsGlobalMsg", status === "published" ? "Post published and available to the live blog listing." : "Post saved as " + status + ".");
    } catch (error) {
      notice("postFormMsg", error?.message || "Could not save post.", true);
    } finally { button.disabled = false; }
  }
  async function togglePost(id) {
    const item = state.posts.find(p => p.id === id);
    if (!item) return;
    const status = item.status === "published" ? "draft" : "published";
    if (!window.confirm((status === "published" ? "Publish " : "Unpublish ") + item.title + "?")) return;
    const { error } = await client.from("blog_posts").update({ status, published_at: status === "published" ? (item.published_at || new Date().toISOString()) : null, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { notice("cmsPostMsg", "Could not update post: " + error.message, true); return; }
    await loadAll();
  }
  function setupEvents() {
    ["productSearch", "categoryFilter", "productStatusFilter"].forEach(id => el(id)?.addEventListener(id === "productSearch" ? "input" : "change", renderProducts));
    ["postSearch", "postStatusFilter"].forEach(id => el(id)?.addEventListener(id === "postSearch" ? "input" : "change", renderPosts));
    el("cmsRefresh")?.addEventListener("click", loadAll);
    el("newProductBtn")?.addEventListener("click", () => editProduct(null));
    el("newCategoryBtn")?.addEventListener("click", () => editCategory(null));
    el("newPostBtn")?.addEventListener("click", () => editPost(null));
    el("productForm")?.addEventListener("submit", saveProduct);
    el("categoryForm")?.addEventListener("submit", saveCategory);
    el("postForm")?.addEventListener("submit", savePost);
    slugFromName(el("productName"), el("productSlug"));
    slugFromName(el("categoryName"), el("categorySlug"));
    slugFromName(el("postTitle"), el("postSlug"));
    setImagePreview("productImageFile", "productImageUrl", "productPreview");
    setImagePreview("categoryImageFile", "categoryImageUrl", "categoryPreview");
    setImagePreview("postImageFile", "postImageUrl", "postPreview");
    document.addEventListener("click", event => {
      const productEdit = event.target.closest("[data-edit-product]");
      if (productEdit) editProduct(productEdit.dataset.editProduct);
      const productToggle = event.target.closest("[data-toggle-product]");
      if (productToggle) toggleProduct(productToggle.dataset.toggleProduct);
      const categoryEdit = event.target.closest("[data-edit-category]");
      if (categoryEdit) editCategory(categoryEdit.dataset.editCategory);
      const categoryToggle = event.target.closest("[data-toggle-category]");
      if (categoryToggle) toggleCategory(categoryToggle.dataset.toggleCategory);
      const postEdit = event.target.closest("[data-edit-post]");
      if (postEdit) editPost(postEdit.dataset.editPost);
      const postToggle = event.target.closest("[data-toggle-post]");
      if (postToggle) togglePost(postToggle.dataset.togglePost);
    });
  }
  function checkSessionAndLoad(session) {
    if (!adminSession(session)) return;
    client.auth.mfa.getAuthenticatorAssuranceLevel().then(result => {
      if (!result.error && result.data?.currentLevel === "aal2") loadAll();
    }).catch(error => console.error("CMS session check failed", error));
  }
  setupEvents();
  client.auth.onAuthStateChange((_event, session) => {
    if (session) queueMicrotask(() => checkSessionAndLoad(session));
  });
  client.auth.getSession().then(({ data }) => checkSessionAndLoad(data.session));
  window.HalalFoodCMS = { reload: loadAll };
})();