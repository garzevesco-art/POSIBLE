/* =========================================================
   HYDRALT S.R.L.
   JAVASCRIPT PRINCIPAL (VERSIÓN CORREGIDA)
   PÁGINA PÚBLICA + CARRITO + ALMACÉN + LOGIN + CHATBOT
========================================================= */


/* =========================================================
   VARIABLES GENERALES
========================================================= */

const WHATSAPP_NUMBER = "51987654321";
const ADMIN_PASSWORD = "hydralt";

let cart = JSON.parse(localStorage.getItem("hydralt_cart")) || [];
/* Productos con los que arranca cualquier navegador nuevo (clientes y otras computadoras).
   Cómo llenarlo: entra al panel > Respaldo y Excel > "Copiar productos como código inicial"
   y pega aquí el resultado, en lugar de []. */
const PRODUCTOS_INICIALES = [];

let inventory = JSON.parse(localStorage.getItem("hydralt_inventory"));
if (!Array.isArray(inventory)) inventory = JSON.parse(JSON.stringify(PRODUCTOS_INICIALES));
let movements = JSON.parse(localStorage.getItem("hydralt_movements")) || [];
let sales = JSON.parse(localStorage.getItem("hydralt_sales")) || [];
let isAdmin = localStorage.getItem("hydralt_admin") === "true";

/* Evita que un texto escrito rompa el HTML */
function escapeHTML(texto) {
    return String(texto).replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}


/* =========================================================
   MODALES
========================================================= */

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add("show");
        document.body.classList.add("modal-open");
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove("show");
        document.body.classList.remove("modal-open");
    }
}

document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => closeModal(btn.dataset.close));
});

document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
            closeModal(overlay.id);
            if (overlay.id === "scannerModal") stopScanner();
        }
    });
});


/* =========================================================
   AVISOS (TOAST)
========================================================= */

function showToast(message, isError = false) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast" + (isError ? " error" : "");
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(20px)";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}


/* =========================================================
   LOGIN / LOGOUT
========================================================= */

const openAdminBtn = document.getElementById("openAdminBtn");
const loginForm = document.getElementById("loginForm");
const adminPanel = document.getElementById("adminPanel");
const logoutBtn = document.getElementById("logoutBtn");
const closeAdminBtn = document.getElementById("closeAdminBtn");

function updateAdminButton() {
    if (!openAdminBtn) return;
    const icono = isAdmin ? "fa-folder-open" : "fa-lock";
    openAdminBtn.innerHTML = `<i class="fa-solid ${icono}"></i><span id="adminBtnText">Almacén</span>`;
}

if (openAdminBtn) {
    openAdminBtn.addEventListener("click", () => {
        if (isAdmin) {
            adminPanel.classList.add("show");
        } else {
            openModal("loginModal");
        }
    });
}

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const password = document.getElementById("loginPassword").value;

        /* Con la sincronización activa, la contraseña se valida en Firebase */
        const sync = window.hydraltSync;
        const acceso = sync && sync.enabled
            ? await sync.login(password)
            : password === ADMIN_PASSWORD;

        if (acceso) {
            isAdmin = true;
            localStorage.setItem("hydralt_admin", "true");
            updateAdminButton();
            closeModal("loginModal");
            adminPanel.classList.add("show");
            showToast("¡Bienvenido administrador!");
            document.getElementById("loginPassword").value = "";
        } else {
            showToast("Contraseña incorrecta", true);
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        if (confirm("¿Estás seguro de cerrar sesión?")) {
            if (window.hydraltSync && window.hydraltSync.enabled) window.hydraltSync.logout();
            isAdmin = false;
            localStorage.removeItem("hydralt_admin");
            updateAdminButton();
            adminPanel.classList.remove("show");
            showToast("Sesión cerrada");
        }
    });
}

if (closeAdminBtn) {
    closeAdminBtn.addEventListener("click", () => {
        adminPanel.classList.remove("show");
    });
}

updateAdminButton();


/* =========================================================
   IMÁGENES DE PRODUCTOS
========================================================= */

function getProductImage(product) {

    /* Si el producto ya tiene una imagen, úsala */
    if (product.image && product.image.trim() !== "") {
        return `Imagen/${product.image}`;
    }

    /* Imágenes de los productos iniciales */
    const imagesById = {
        P001: "comercial.png",
        P002: "fil.png",
        P003: "Osmosis.png",
        P004: "ducha.png",
        P005: "TANQUE FRP.png",
        P006: "filtro_Industrial.png",
        P007: "VALVULA AUTOMATICA, MAGNUM IT 298 742.png",
        P008: "VALVULA AUTOMATICA, PERFORMA 268 740.png",
        P009: "VALVULA AUTOMATICO MODELO TMF63C3.png"
    };

    return `Imagen/${imagesById[product.id] || "comercial.png"}`;
}

/* Imágenes que existen en la carpeta "Imagen".
   Cuando agregues una foto nueva a esa carpeta, escribe su nombre aquí
   para que aparezca en la lista al crear un producto. */
const IMAGENES_PRODUCTOS = [
    "comercial.png",
    "fil.png",
    "Osmosis.png",
    "ducha.png",
    "TANQUE FRP.png",
    "filtro_Industrial.png",
    "VALVULA AUTOMATICA, MAGNUM IT 298 742.png",
    "VALVULA AUTOMATICA, PERFORMA 268 740.png",
    "VALVULA AUTOMATICO MODELO TMF63C3.png"
];

/* Llena la lista de sugerencias con las imágenes conocidas y las ya usadas */
function refreshImageOptions() {
    const list = document.getElementById("imageOptions");
    if (!list) return;

    const usadas = inventory.map(p => p.image).filter(Boolean);
    const todas = [...new Set([...IMAGENES_PRODUCTOS, ...usadas])];

    list.innerHTML = "";
    todas.forEach(nombre => {
        const option = document.createElement("option");
        option.value = nombre;
        list.appendChild(option);
    });
}

function updateImagePreview() {
    const input = document.getElementById("adminProductImage");
    const img = document.getElementById("imagePreview");
    if (!input || !img) return;

    const nombre = input.value.trim();
    if (!nombre) {
        img.style.display = "none";
        return;
    }

    img.onload = () => { img.style.display = "block"; };
    img.onerror = () => { img.style.display = "none"; };
    img.src = `Imagen/${nombre}`;
}

/* Agrega al formulario del producto la lista de imágenes y una vista previa */
function ensureImagePicker() {
    const input = document.getElementById("adminProductImage");
    if (!input || document.getElementById("imageOptions")) return;

    const list = document.createElement("datalist");
    list.id = "imageOptions";
    document.body.appendChild(list);
    input.setAttribute("list", "imageOptions");
    input.setAttribute("autocomplete", "off");
    input.placeholder = "Elige de la lista o escribe el nombre exacto";

    const img = document.createElement("img");
    img.id = "imagePreview";
    img.alt = "Vista previa de la imagen";
    img.style.cssText = "display:none;width:96px;height:96px;object-fit:contain;margin-top:10px;border:1px solid var(--border);border-radius:10px;background:#f3f9fc;";
    input.parentNode.appendChild(img);

    /* Si escribes tú el nombre de la imagen, el sistema ya no lo cambia solo */
    input.addEventListener("input", () => {
        input.dataset.manual = "1";
        updateImagePreview();
    });

    /* Al escribir el nombre del producto nuevo, se propone la imagen que mejor le corresponde */
    const nameInput = document.getElementById("adminProductName");
    if (nameInput) {
        nameInput.addEventListener("input", () => {
            if (input.dataset.manual === "1") return;
            if (document.getElementById("productEditId").value !== "") return;
            input.value = sugerirImagen(nameInput.value);
            updateImagePreview();
        });
    }

    input.placeholder = "Se propone sola; si queda vacío se usa comercial.png";
    refreshImageOptions();
}

/* Elige, entre las imágenes conocidas, la que más se parece al nombre del producto */
function sugerirImagen(nombre) {
    const ignorar = new Set(["de", "del", "la", "el", "los", "las", "para", "con", "agua", "sistema", "alta", "alto", "pulg", "automatico", "automatica", "modelo"]);
    const palabrasClave = (texto) => chatNorm(texto).split(" ")
        .filter(t => t.length > 2 && !ignorar.has(t))
        .map(chatRaiz);

    const palabras = palabrasClave(nombre);
    if (!palabras.length) return "";

    const archivos = [...new Set([...IMAGENES_PRODUCTOS, ...inventory.map(p => p.image).filter(Boolean)])];
    let mejor = "";
    let mejorPuntaje = 0;

    archivos.forEach(archivo => {
        if (archivo === "comercial.png") return;   /* imagen genérica: solo como respaldo */

        const base = archivo.replace(/\.[a-z0-9]+$/i, "").replace(/[_,]/g, " ");
        const tk = palabrasClave(base);
        if (!tk.length) return;

        const coincide = tk.filter(a => palabras.some(b => chatMismaPalabra(a, b))).length;
        if (!coincide) return;

        const puntaje = coincide * 2 + (coincide === tk.length ? 1 : 0);
        if (puntaje > mejorPuntaje) {
            mejorPuntaje = puntaje;
            mejor = archivo;
        }
    });

    return mejor;
}

ensureImagePicker();

/* Explica en el formulario qué significa el stock mínimo */
function ensureStockHelp() {
    const min = document.getElementById("adminProductMinStock");
    if (!min || document.getElementById("minStockHelp")) return;

    const help = document.createElement("small");
    help.id = "minStockHelp";
    help.className = "claim-help";
    help.textContent = "Cuando el stock sea igual o menor a este número, el producto aparece como Bajo y en Alertas.";
    min.parentNode.appendChild(help);
}

ensureStockHelp();

/* Crea un id nuevo que nunca se repite (P001, P002, ...) */
function getNextProductId() {
    const max = inventory.reduce((m, p) =>
        Math.max(m, parseInt(String(p.id).replace(/\D/g, "")) || 0), 0);
    return `P${String(max + 1).padStart(3, "0")}`;
}


/* =========================================================
   PRODUCTOS EN EL CARRUSEL (SWIPER)
========================================================= */

let productsSwiper = null;

function getProductCategorySlug(category) {
    if (category === "Hogar") return "domesticos";
    if (category === "Industrial") return "industriales";
    if (category === "Válvulas" || category === "Tanques") return "valvulas";
    return "todos";
}

/* Productos que coinciden con la categoría y la búsqueda */
function getVisibleProducts() {
    const activeBtn = document.querySelector(".category-btn.active");
    const category = activeBtn ? activeBtn.dataset.category : "todos";
    const search = (document.getElementById("buscador")?.value || "").toLowerCase().trim();

    return inventory.filter(p =>
        (category === "todos" || getProductCategorySlug(p.category) === category) &&
        p.name.toLowerCase().includes(search)
    );
}

function loadProductsToSlider() {
    const productsGrid = document.getElementById("productsGrid");
    if (!productsGrid) return;

    /* Destruir el carrusel anterior antes de volver a dibujarlo */
    if (productsSwiper) {
        productsSwiper.destroy(true, true);
        productsSwiper = null;
    }
    productsGrid.innerHTML = "";

    const products = getVisibleProducts();

    const productDesc = {
        "Hogar": "Ideal para uso doméstico.",
        "Industrial": "Para procesos industriales.",
        "Tanques": "Alta capacidad de almacenamiento.",
        "Válvulas": "Sistema automático de control."
    };

    products.forEach(product => {
        let badge = "";
        if (product.stock === 0) {
            badge = `<span class="product-badge" style="background: var(--danger);">Agotado</span>`;
        } else if (product.stock <= product.minStock) {
            badge = `<span class="product-badge" style="background: var(--warning);">Stock Bajo</span>`;
        }

        const article = document.createElement("article");
        article.className = "swiper-slide product-card";
        article.innerHTML = `
            <div class="product-image">
                ${badge}
                <img src="${getProductImage(product)}" alt="" onerror="this.src='Imagen/comercial.png'">
            </div>
            <div class="product-info">
                <span class="product-category">${escapeHTML(product.category)}</span>
                <h3></h3>
                <p>${productDesc[product.category] || "Producto de calidad."}</p>
                <div class="product-bottom">
                    <strong>S/ ${Number(product.price).toFixed(2)}</strong>
                    <button class="add-cart agregar-carrito" data-id="${escapeHTML(product.id)}"
                        ${product.stock === 0 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ""}>
                        <i class="fa-solid fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        `;
        article.querySelector("h3").textContent = product.name;
        article.querySelector("img").alt = product.name;
        productsGrid.appendChild(article);
    });

    const noProducts = document.getElementById("noProducts");
    if (noProducts) noProducts.classList.toggle("show", products.length === 0);

    const box = document.querySelector(".productsSwiper");
    if (box) box.style.display = products.length ? "" : "none";

    if (products.length && typeof Swiper !== "undefined") {
        productsSwiper = new Swiper(".productsSwiper", {
            slidesPerView: 1,
            spaceBetween: 20,
            loop: products.length > 4,
            speed: 800,
            autoplay: { delay: 3500, disableOnInteraction: false },
            pagination: { el: ".productsSwiper .swiper-pagination", clickable: true },
            navigation: {
                nextEl: ".productsSwiper .swiper-button-next",
                prevEl: ".productsSwiper .swiper-button-prev"
            },
            breakpoints: {
                640: { slidesPerView: 2, spaceBetween: 20 },
                768: { slidesPerView: 3, spaceBetween: 20 },
                1024: { slidesPerView: 4, spaceBetween: 20 }
            }
        });
    }
}

/* Filtros, buscador y botón "agregar al carrito" (se conectan una sola vez) */
function initProductFilters() {
    const buttons = document.querySelectorAll(".category-btn");

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            buttons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            loadProductsToSlider();
        });
    });

    document.getElementById("buscador")?.addEventListener("input", loadProductsToSlider);
    document.getElementById("buscar-btn")?.addEventListener("click", loadProductsToSlider);

    document.getElementById("productsGrid")?.addEventListener("click", (e) => {
        const btn = e.target.closest(".agregar-carrito");
        if (!btn || btn.disabled) return;
        const p = inventory.find(x => x.id === btn.dataset.id);
        if (p) addToCart(p.id, p.name, p.price, getProductImage(p));
    });
}


/* =========================================================
   HERO SWIPER
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    if (typeof Swiper !== "undefined" && document.querySelector(".heroSwiper")) {
        new Swiper(".heroSwiper", {
            loop: true,
            speed: 900,
            autoplay: { delay: 4000, disableOnInteraction: false },
            pagination: { el: ".heroSwiper .swiper-pagination", clickable: true },
            navigation: {
                nextEl: ".heroSwiper .swiper-button-next",
                prevEl: ".heroSwiper .swiper-button-prev"
            }
        });
    }
});


/* =========================================================
   CARRITO
========================================================= */

const openCartBtn = document.getElementById("openCartBtn");
const cartItemsContainer = document.getElementById("cartItems");
const cartEmpty = document.getElementById("cartEmpty");
const cartSummary = document.getElementById("cartSummary");
const cartTotal = document.getElementById("cartTotal");
const cartBadge = document.getElementById("cartBadge");
const checkoutBtn = document.getElementById("checkoutBtn");

function saveCart() {
    localStorage.setItem("hydralt_cart", JSON.stringify(cart));
}

function updateCartUI() {
    if (!cartItemsContainer || !cartEmpty || !cartSummary) return;

    if (cart.length === 0) {
        cartItemsContainer.style.display = "none";
        cartSummary.style.display = "none";
        cartEmpty.style.display = "block";
    } else {
        cartItemsContainer.style.display = "flex";
        cartSummary.style.display = "block";
        cartEmpty.style.display = "none";
    }

    cartItemsContainer.innerHTML = "";
    let total = 0;

    cart.forEach((item, index) => {
        total += item.price * item.quantity;

        const itemEl = document.createElement("div");
        itemEl.className = "cart-item";
        itemEl.innerHTML = `
            <div class="cart-item-image">
                <img src="${escapeHTML(item.image)}" alt="" onerror="this.src='Imagen/comercial.png'">
            </div>
            <div class="cart-item-info">
                <h4>${escapeHTML(item.name)}</h4>
                <span>S/ ${item.price.toFixed(2)}</span>
                <div class="cart-quantity">
                    <button type="button" onclick="decreaseQuantity(${index})"><i class="fa-solid fa-minus"></i></button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="increaseQuantity(${index})"><i class="fa-solid fa-plus"></i></button>
                </div>
            </div>
            <button type="button" class="remove-cart-item" onclick="removeFromCart(${index})">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;
        cartItemsContainer.appendChild(itemEl);
    });

    if (cartTotal) cartTotal.textContent = `S/ ${total.toFixed(2)}`;
    if (cartBadge) cartBadge.textContent = cart.length;
}

function addToCart(id, name, price, image) {
    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ id, name, price: parseFloat(price), image, quantity: 1 });
    }

    saveCart();
    updateCartUI();
    showToast("Producto agregado al carrito");
}

function increaseQuantity(index) {
    cart[index].quantity++;
    saveCart();
    updateCartUI();
}

function decreaseQuantity(index) {
    if (cart[index].quantity > 1) {
        cart[index].quantity--;
    } else {
        cart.splice(index, 1);
    }
    saveCart();
    updateCartUI();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
    showToast("Producto eliminado");
}

if (openCartBtn) {
    openCartBtn.addEventListener("click", () => {
        updateCartUI();
        openModal("cartModal");
    });
}

/* ----- Datos del cliente en el carrito ----- */

function ensureCartForm() {
    const summary = document.getElementById("cartSummary");
    if (!summary || document.getElementById("cartCustName")) return;

    const guardado = JSON.parse(localStorage.getItem("hydralt_customer") || "{}");

    const section = document.createElement("section");
    section.className = "cart-customer";
    section.innerHTML = `
        <h3 style="font-size:14px;color:var(--dark);margin-bottom:12px;">Tus datos de entrega</h3>
        <div class="form-row">
            <div class="form-group"><label>Nombre completo</label><input type="text" id="cartCustName" autocomplete="name"></div>
            <div class="form-group"><label>Teléfono / WhatsApp</label><input type="tel" id="cartCustPhone" autocomplete="tel"></div>
        </div>
        <div class="form-group"><label>Dirección o ciudad de entrega</label><input type="text" id="cartCustAddress" autocomplete="street-address"></div>
        <div class="form-group"><label>Método de pago</label>
            <select id="cartCustMethod">
                <option>Yape</option>
                <option>Plin</option>
                <option>Transferencia</option>
                <option>Contra entrega</option>
            </select>
        </div>
    `;
    summary.insertBefore(section, summary.firstChild);

    document.getElementById("cartCustName").value = guardado.name || "";
    document.getElementById("cartCustPhone").value = guardado.phone || "";
    document.getElementById("cartCustAddress").value = guardado.address || "";
    if (guardado.method) document.getElementById("cartCustMethod").value = guardado.method;
}

ensureCartForm();

/* Lee y valida los datos del cliente. Devuelve null si falta algo */
function getCartCustomer() {
    const name = document.getElementById("cartCustName").value.trim();
    const phone = document.getElementById("cartCustPhone").value.trim();
    const address = document.getElementById("cartCustAddress").value.trim();
    const method = document.getElementById("cartCustMethod").value;

    if (name.length < 3) {
        showToast("Escribe tu nombre completo", true);
        document.getElementById("cartCustName").focus();
        return null;
    }
    if (phone.replace(/\D/g, "").length < 9) {
        showToast("Escribe un teléfono válido (9 dígitos)", true);
        document.getElementById("cartCustPhone").focus();
        return null;
    }
    if (address.length < 4) {
        showToast("Escribe tu dirección o ciudad de entrega", true);
        document.getElementById("cartCustAddress").focus();
        return null;
    }

    return { name, phone, address, method };
}

function saveCustomer(cliente) {
    localStorage.setItem("hydralt_customer", JSON.stringify(cliente));
}

if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
        if (cart.length === 0) return;

        const cliente = getCartCustomer();
        if (!cliente) return;

        const items = cart.map(i => ({
            productId: i.id,
            name: i.name,
            price: i.price,
            quantity: i.quantity
        }));

        /* Se guarda como pedido pendiente en el panel de Ventas */
        const sale = buildSale({
            customer: cliente.name,
            phone: cliente.phone,
            address: cliente.address,
            method: cliente.method,
            status: "pendiente",
            source: "Web",
            items
        });

        /* Con la sincronización activa, el pedido llega solo al panel del administrador */
        if (window.hydraltSync && window.hydraltSync.enabled) {
            sale.id = window.hydraltSync.newWebId();
            window.hydraltSync.sendWebSale(sale);
        }

        sales.unshift(sale);
        saveSales();
        renderSales();
        saveCustomer(cliente);

        const lineas = items.map(i => `• ${i.name} (x${i.quantity}) - S/ ${(i.price * i.quantity).toFixed(2)}`);
        const message = [
            `Hola, soy ${cliente.name}. Quiero solicitar los siguientes productos:`,
            "",
            ...lineas,
            "",
            `*Total: S/ ${sale.total.toFixed(2)}*`,
            "",
            `Método de pago: ${cliente.method}`,
            `Entrega: ${cliente.address}`,
            `Teléfono: ${cliente.phone}`,
            `N.º de pedido: ${sale.id}`
        ].join("\n");

        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");

        cart = [];
        saveCart();
        updateCartUI();
        closeModal("cartModal");
        showToast(`Pedido ${sale.id} enviado`);
    });
}


/* =========================================================
   MENÚ MÓVIL
========================================================= */

const menuToggle = document.getElementById("menuToggle");
const navbar = document.getElementById("navbar");

if (menuToggle && navbar) {
    menuToggle.addEventListener("click", () => {
        navbar.classList.toggle("open");
        const icon = menuToggle.querySelector("i");
        icon.className = navbar.classList.contains("open") ? "fa-solid fa-xmark" : "fa-solid fa-bars";
    });

    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", () => {
            navbar.classList.remove("open");
            menuToggle.querySelector("i").className = "fa-solid fa-bars";
        });
    });
}


/* =========================================================
   BOTÓN VOLVER ARRIBA
========================================================= */

const btnTop = document.getElementById("btnTop");

if (btnTop) {
    btnTop.style.display = "none";

    window.addEventListener("scroll", () => {
        btnTop.style.display = window.scrollY > 500 ? "grid" : "none";
    });

    btnTop.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}


/* =========================================================
   FORMULARIOS
========================================================= */

// Contacto
const contactForm = document.getElementById("form-contacto");

if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const nombre = document.getElementById("nombre").value;
        const telefono = document.getElementById("telefono").value;
        const correo = document.getElementById("correo").value;
        const tipoConsulta = document.getElementById("tipoConsulta").value;
        const mensaje = document.getElementById("mensaje").value;

        let message = `Hola, mi nombre es ${nombre}.%0A%0ATeléfono: ${telefono}%0A`;
        if (correo) message += `Correo: ${correo}%0A`;
        if (tipoConsulta) message += `Consulta: ${tipoConsulta}%0A`;
        if (mensaje) message += `Mensaje: ${mensaje}`;

        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
        contactForm.reset();
        showToast("Mensaje enviado correctamente");
    });
}

// Laboratorio
const openLabBtn = document.getElementById("openLabBtn");
const labForm = document.getElementById("labForm");

if (openLabBtn) openLabBtn.addEventListener("click", () => openModal("labModal"));

if (labForm) {
    labForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const nombre = document.getElementById("labNombre").value;
        const correo = document.getElementById("labCorreo").value;
        const telefono = document.getElementById("labTelefono").value;
        const tipo = document.getElementById("labTipo").value;
        const mensaje = document.getElementById("labMensaje").value;

        let message = `Hola, solicito un análisis de agua.%0A%0ANombre: ${nombre}%0ACorreo: ${correo}%0ATeléfono: ${telefono}%0ATipo: ${tipo}%0A`;
        if (mensaje) message += `Mensaje: ${mensaje}`;

        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
        labForm.reset();
        closeModal("labModal");
        showToast("Solicitud enviada");
    });
}

// Preguntas frecuentes
document.querySelectorAll(".faq-question").forEach(btn => {
    btn.addEventListener("click", () => {
        btn.closest(".faq-item").classList.toggle("open");
    });
});


/* =========================================================
   ALMACÉN - GUARDAR DATOS
========================================================= */

function saveInventory() {
    localStorage.setItem("hydralt_inventory", JSON.stringify(inventory));
}

function saveMovements() {
    localStorage.setItem("hydralt_movements", JSON.stringify(movements));
}

/* Estado del stock de un producto */
function getStockStatus(product) {
    if (product.stock === 0) return { clase: "out", texto: "Agotado" };
    if (product.stock <= product.minStock) return { clase: "low", texto: "Bajo" };
    return { clase: "ok", texto: "OK" };
}

/* Vuelve a dibujar todo el panel y la página principal */
function refreshAll() {
    saveInventory();
    saveMovements();
    saveSales();
    renderSales();
    renderInventory();
    renderMovements();
    renderDashboard();
    renderAlerts();
    loadProductsToSlider();
}


/* =========================================================
   ALMACÉN - DASHBOARD
========================================================= */

function renderDashboard() {
    const totalProducts = inventory.length;
    const totalStock = inventory.reduce((sum, p) => sum + p.stock, 0);
    const lowStock = inventory.filter(p => p.stock <= p.minStock).length;
    const inventoryValue = inventory.reduce((sum, p) => sum + (p.price * p.stock), 0);

    document.getElementById("statProducts").textContent = totalProducts;
    document.getElementById("statStock").textContent = totalStock;
    document.getElementById("statLowStock").textContent = lowStock;
    document.getElementById("statInventoryValue").textContent = `S/ ${inventoryValue.toFixed(2)}`;

    const stockTable = document.getElementById("dashboardStockTable");
    if (stockTable) {
        stockTable.innerHTML = "";

        inventory.slice(0, 5).forEach(product => {
            const estado = getStockStatus(product);
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><strong>${escapeHTML(product.name)}</strong></td>
                <td>${escapeHTML(product.category)}</td>
                <td>${product.stock}</td>
                <td><span class="status ${estado.clase}">${estado.texto}</span></td>
            `;
            stockTable.appendChild(row);
        });
    }

    const movementsList = document.getElementById("dashboardMovements");
    if (movementsList) {
        movementsList.innerHTML = "";

        movements.slice(0, 5).forEach(mov => {
            const item = document.createElement("div");
            item.className = "movement-item";
            item.innerHTML = `
                <div class="movement-left">
                    <div class="movement-icon ${mov.type}">
                        <i class="fa-solid fa-${mov.type === "entrada" ? "arrow-down" : "arrow-up"}"></i>
                    </div>
                    <div><strong>${escapeHTML(mov.product)}</strong><span>${escapeHTML(mov.reason || "")}</span></div>
                </div>
                <div class="movement-quantity ${mov.type}">${mov.type === "entrada" ? "+" : "-"}${mov.quantity}</div>
            `;
            movementsList.appendChild(item);
        });
    }
}


/* =========================================================
   ALMACÉN - INVENTARIO
========================================================= */

function renderInventory() {
    const table = document.getElementById("inventoryTable");
    if (!table) return;

    table.innerHTML = "";

    inventory.forEach((product, index) => {
        const estado = getStockStatus(product);
        const row = document.createElement("tr");
        row.className = estado.clase === "low" ? "row-low" : estado.clase === "out" ? "row-out" : "";

        row.innerHTML = `
            <td><strong>${escapeHTML(product.name)}</strong></td>
            <td>${escapeHTML(product.category)}</td>
            <td>S/ ${Number(product.price).toFixed(2)}</td>
            <td><input type="number" min="0" class="inline-num" data-inline="stock" data-index="${index}" value="${product.stock}" aria-label="Stock de ${escapeHTML(product.name)}"></td>
            <td><input type="number" min="0" class="inline-num" data-inline="minStock" data-index="${index}" value="${product.minStock}" aria-label="Stock mínimo de ${escapeHTML(product.name)}"></td>
            <td><span class="status ${estado.clase}">${estado.texto}</span></td>
            <td>
                <button type="button" class="table-action" onclick="editProduct(${index})"><i class="fa-solid fa-pen"></i></button>
                <button type="button" class="table-action delete" onclick="deleteProduct(${index})"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        table.appendChild(row);
    });

    filterInventory();
}

function renderMovements() {
    const table = document.getElementById("movementsTable");
    if (!table) return;

    table.innerHTML = "";

    movements.forEach(mov => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${escapeHTML(mov.date)}</td>
            <td><strong>${escapeHTML(mov.product)}</strong></td>
            <td>${escapeHTML(mov.type)}</td>
            <td>${mov.quantity}</td>
            <td>${escapeHTML(mov.reason || "")}</td>
        `;
        table.appendChild(row);
    });
}

/* Número rojo junto a "Alertas" en el menú del almacén */
function updateAlertsBadge(cantidad) {
    const nav = document.querySelector('.admin-nav-btn[data-admin-section="alerts"]');
    if (!nav) return;

    let badge = document.getElementById("alertsBadge");
    if (!badge) {
        badge = document.createElement("span");
        badge.id = "alertsBadge";
        badge.className = "claims-badge alerts-badge";
        nav.appendChild(badge);
    }
    badge.textContent = cantidad;
    badge.hidden = cantidad === 0;
}

function renderAlerts() {
    const grid = document.getElementById("alertsGrid");
    if (!grid) return;

    grid.innerHTML = "";

    const lowStockProducts = inventory.filter(p => p.stock <= p.minStock);
    updateAlertsBadge(lowStockProducts.length);

    if (lowStockProducts.length === 0) {
        grid.innerHTML = `
            <div class="alert-ok">
                <i class="fa-solid fa-circle-check" style="font-size:40px;margin-bottom:15px;"></i>
                <h3>Todo en orden</h3>
                <p>No hay productos con stock bajo.</p>
            </div>`;
        return;
    }

    lowStockProducts.forEach(product => {
        const card = document.createElement("div");
        card.className = "alert-card";
        card.innerHTML = `
            <h3>${escapeHTML(product.name)}</h3>
            <p>Categoría: ${escapeHTML(product.category)}<br>Precio: S/ ${Number(product.price).toFixed(2)}</p>
            <div class="alert-stock">Stock: ${product.stock} / Mínimo: ${product.minStock}</div>
        `;
        grid.appendChild(card);
    });
}

/* Cambia el stock o el stock mínimo directamente desde la tabla del inventario */
function updateInlineField(index, field, valor) {
    const p = inventory[index];
    if (!p || (field !== "stock" && field !== "minStock")) return;

    const nuevo = parseInt(valor, 10);
    if (isNaN(nuevo) || nuevo < 0) {
        showToast("Escribe un número válido (0 o más)", true);
        renderInventory();
        return;
    }

    const anterior = p[field];
    if (nuevo === anterior) return;
    p[field] = nuevo;

    if (field === "stock") {
        const diff = nuevo - anterior;
        movements.unshift({
            date: new Date().toLocaleDateString(),
            product: p.name,
            type: diff > 0 ? "entrada" : "salida",
            quantity: Math.abs(diff),
            reason: "Ajuste en inventario"
        });
    }

    refreshAll();

    const estado = getStockStatus(p);
    if (estado.clase === "out") showToast(`${p.name}: agotado. Ya aparece en Alertas.`);
    else if (estado.clase === "low") showToast(`${p.name}: stock bajo. Ya aparece en Alertas.`);
    else showToast(`${p.name} actualizado.`);
}

document.addEventListener("change", (e) => {
    const campo = e.target && e.target.closest ? e.target.closest("[data-inline]") : null;
    if (!campo) return;
    updateInlineField(parseInt(campo.dataset.index, 10), campo.dataset.inline, campo.value);
});

function editProduct(index) {
    const product = inventory[index];
    if (!product) return;

    document.getElementById("productEditId").value = index;
    document.getElementById("adminProductName").value = product.name;
    document.getElementById("adminProductCategory").value = product.category;
    document.getElementById("adminProductPrice").value = product.price;
    document.getElementById("adminProductStock").value = product.stock;
    document.getElementById("adminProductMinStock").value = product.minStock;
    document.getElementById("adminProductImage").value = product.image || "";
    document.getElementById("adminProductImage").dataset.manual = "1";
    refreshImageOptions();
    updateImagePreview();
    document.getElementById("productModalTitle").textContent = "Editar producto";

    openModal("productAdminModal");
}

function deleteProduct(index) {
    if (!inventory[index]) return;

    if (confirm("¿Estás seguro de eliminar este producto?")) {
        const eliminado = inventory[index];
        inventory.splice(index, 1);

        /* Si estaba en el carrito, también se quita */
        cart = cart.filter(item => item.id !== eliminado.id);
        saveCart();
        updateCartUI();

        refreshAll();
        showToast("Producto eliminado");
    }
}

/* ----- Botón "Nuevo producto" ----- */
const newProductBtn = document.getElementById("newProductBtn");
const productAdminForm = document.getElementById("productAdminForm");

if (newProductBtn) {
    newProductBtn.addEventListener("click", () => {
        productAdminForm.reset();
        document.getElementById("productEditId").value = "";
        delete document.getElementById("adminProductImage").dataset.manual;
        refreshImageOptions();
        updateImagePreview();
        document.getElementById("productModalTitle").textContent = "Nuevo producto";
        openModal("productAdminModal");
    });
}

/* ----- Guardar producto (nuevo o editado) ----- */
if (productAdminForm) {
    productAdminForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const editId = document.getElementById("productEditId").value;
        const old = editId !== "" ? inventory[editId] : null;
        const imageInput = document.getElementById("adminProductImage").value.trim();

        const product = {
            id: old ? old.id : getNextProductId(),
            name: document.getElementById("adminProductName").value.trim(),
            category: document.getElementById("adminProductCategory").value,
            price: parseFloat(document.getElementById("adminProductPrice").value),
            stock: parseInt(document.getElementById("adminProductStock").value),
            minStock: parseInt(document.getElementById("adminProductMinStock").value),
            image: imageInput || (old ? old.image : "comercial.png")
        };

        if (old) {
            const diff = product.stock - old.stock;
            inventory[editId] = product;

            if (diff !== 0) {
                movements.unshift({
                    date: new Date().toLocaleDateString(),
                    product: product.name,
                    type: diff > 0 ? "entrada" : "salida",
                    quantity: Math.abs(diff),
                    reason: "Edición del producto"
                });
            }

            const estado = getStockStatus(product);
            if (estado.clase === "out") showToast("Producto actualizado: agotado, ya aparece en Alertas");
            else if (estado.clase === "low") showToast("Producto actualizado: stock bajo, ya aparece en Alertas");
            else showToast("Producto actualizado");
        } else {
            inventory.push(product);

            if (product.stock > 0) {
                movements.unshift({
                    date: new Date().toLocaleDateString(),
                    product: product.name,
                    type: "entrada",
                    quantity: product.stock,
                    reason: "Stock inicial"
                });
            }

            showToast("Producto creado");
        }

        refreshAll();
        closeModal("productAdminModal");
    });
}


/* =========================================================
   ALMACÉN - MOVIMIENTOS
========================================================= */

const newMovementBtn = document.getElementById("newMovementBtn");
const movementForm = document.getElementById("movementForm");
const movementProduct = document.getElementById("movementProduct");

if (newMovementBtn) {
    newMovementBtn.addEventListener("click", () => {
        if (inventory.length === 0) {
            showToast("Primero agrega un producto al inventario", true);
            return;
        }

        if (movementProduct) {
            movementProduct.innerHTML = "";

            inventory.forEach((product, index) => {
                const option = document.createElement("option");
                option.value = index;
                option.textContent = product.name;
                movementProduct.appendChild(option);
            });
        }

        if (movementForm) movementForm.reset();
        openModal("movementModal");
    });
}

if (movementForm) {
    movementForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const productIndex = parseInt(document.getElementById("movementProduct").value);
        const type = document.getElementById("movementType").value;
        const quantity = parseInt(document.getElementById("movementQty").value);
        const reason = document.getElementById("movementReason").value.trim();
        const product = inventory[productIndex];

        if (!product || isNaN(quantity) || quantity < 1) {
            showToast("Revisa los datos del movimiento", true);
            return;
        }

        if (type === "salida" && product.stock < quantity) {
            showToast("Stock insuficiente", true);
            return;
        }

        product.stock += type === "entrada" ? quantity : -quantity;

        movements.unshift({
            date: new Date().toLocaleDateString(),
            product: product.name,
            type,
            quantity,
            reason
        });

        refreshAll();
        closeModal("movementModal");
        showToast("Movimiento registrado");
    });
}


/* =========================================================
   ALMACÉN - FILTRO DEL INVENTARIO
========================================================= */

const inventorySearch = document.getElementById("inventorySearch");
const inventoryCategory = document.getElementById("inventoryCategory");

if (inventorySearch) inventorySearch.addEventListener("input", filterInventory);
if (inventoryCategory) inventoryCategory.addEventListener("change", filterInventory);

function filterInventory() {
    const search = (inventorySearch?.value || "").toLowerCase();
    const category = inventoryCategory?.value || "todos";

    document.querySelectorAll("#inventoryTable tr").forEach(row => {
        const name = row.cells[0].textContent.toLowerCase();
        const cat = row.cells[1].textContent;
        const visible = name.includes(search) && (category === "todos" || cat === category);
        row.style.display = visible ? "" : "none";
    });
}

function updateAdminDate() {
    const dateEl = document.getElementById("adminDate");
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString("es-ES", {
            weekday: "long", year: "numeric", month: "long", day: "numeric"
        });
    }
}


/* =========================================================
   NAVEGACIÓN DEL PANEL DE ALMACÉN
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    const adminNavButtons = document.querySelectorAll(".admin-nav-btn[data-admin-section]");
    const adminSections = document.querySelectorAll(".admin-section");
    const adminPageTitle = document.getElementById("adminPageTitle");
    const adminPageSubtitle = document.getElementById("adminPageSubtitle");

    const sectionInfo = {
        dashboard: { title: "Dashboard", subtitle: "Resumen general de tu almacén." },
        inventory: { title: "Inventario", subtitle: "Administra tus productos y cantidades." },
        movements: { title: "Movimientos", subtitle: "Control de entradas y salidas." },
        sales: { title: "Ventas", subtitle: "Consulta y administra tus ventas." },
        alerts: { title: "Alertas", subtitle: "Productos que requieren atención." },
        claims: { title: "Libro de Reclamaciones", subtitle: "Reclamos y quejas de los clientes." }
    };

    function showAdminSection(sectionName) {
        const targetSection = document.getElementById("admin-" + sectionName);
        if (!targetSection) return;

        adminSections.forEach(section => section.classList.remove("active"));
        targetSection.classList.add("active");

        adminNavButtons.forEach(button => {
            button.classList.toggle("active", button.dataset.adminSection === sectionName);
        });

        if (adminPageTitle && sectionInfo[sectionName]) {
            adminPageTitle.textContent = sectionInfo[sectionName].title;
        }
        if (adminPageSubtitle && sectionInfo[sectionName]) {
            adminPageSubtitle.textContent = sectionInfo[sectionName].subtitle;
        }
    }

    adminNavButtons.forEach(button => {
        button.addEventListener("click", function () {
            showAdminSection(this.dataset.adminSection);
        });
    });

    document.querySelectorAll("[data-admin-section-target]").forEach(button => {
        button.addEventListener("click", function () {
            showAdminSection(this.dataset.adminSectionTarget);
        });
    });
});


/* =========================================================
   ESCÁNER QR / CÓDIGO DE BARRAS
   Formato del QR: nombre|categoría|precio|stock|stockMin|imagen.png
========================================================= */

let scanner = null;

document.addEventListener("DOMContentLoaded", function () {
    const btnEscanear = document.getElementById("scanProductBtn");

    if (btnEscanear) {
        btnEscanear.addEventListener("click", function () {
            openModal("scannerModal");
            setTimeout(startScanner, 300);
        });
    }
});

function stopScanner() {
    if (!scanner) return Promise.resolve();
    const s = scanner;
    scanner = null;
    return s.clear().catch(() => {});
}

function startScanner() {
    const container = document.getElementById("scannerContainer");
    if (!container) return;

    if (typeof Html5QrcodeScanner === "undefined") {
        showToast("No se cargó la librería del escáner. Revisa tu conexión.", true);
        closeModal("scannerModal");
        return;
    }

    stopScanner().then(() => {
        scanner = new Html5QrcodeScanner(
            "scannerContainer",
            { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
            false
        );
        scanner.render(onScanSuccess, onScanFailure);
    });
}

function onScanSuccess(decodedText) {
    stopScanner();
    closeModal("scannerModal");

    const d = decodedText.split("|").map(x => x.trim());

    if (d.length < 5 || !d[0] || isNaN(parseFloat(d[2]))) {
        showToast("Formato incorrecto. Usa: nombre|categoría|precio|stock|stockMin|imagen.png", true);
        return;
    }

    const categorias = ["Hogar", "Industrial", "Válvulas", "Tanques"];
    const categoria = categorias.find(c => c.toLowerCase() === d[1].toLowerCase()) || "Hogar";
    const cantidad = parseInt(d[3]) || 1;
    const existente = inventory.find(p => p.name.toLowerCase() === d[0].toLowerCase());

    if (existente) {
        existente.stock += cantidad;
        showToast(`+${cantidad} a ${existente.name}`);
    } else {
        inventory.push({
            id: getNextProductId(),
            name: d[0],
            category: categoria,
            price: parseFloat(d[2]),
            stock: cantidad,
            minStock: parseInt(d[4]) || 5,
            image: d[5] || "comercial.png"
        });
        showToast(`Producto agregado: ${d[0]}`);
    }

    movements.unshift({
        date: new Date().toLocaleDateString(),
        product: d[0],
        type: "entrada",
        quantity: cantidad,
        reason: "Escaneo QR"
    });

    refreshAll();
}

function onScanFailure() {
    /* No se muestra nada mientras busca un código */
}

document.addEventListener("click", function (e) {
    if (e.target.closest("[data-close='scannerModal']")) {
        stopScanner();
    }
});


/* =========================================================
   VENTAS
   - Pedidos de la web llegan como "pendiente" (no tocan el stock).
   - Al marcar "pagado" se descuenta el stock y se crea la salida.
   - Las ventas hechas en tienda se registran como "pagado".
   - Al anular una venta pagada, el stock se devuelve.
========================================================= */

function saveSales() {
    localStorage.setItem("hydralt_sales", JSON.stringify(sales));
}

function getNextSaleId() {
    /* Solo cuenta las ventas de tienda (V0001...). Los pedidos web llevan otro código. */
    const max = sales
        .filter(s => String(s.id).startsWith("V"))
        .reduce((m, s) => Math.max(m, parseInt(String(s.id).replace(/\D/g, "")) || 0), 0);
    return `V${String(max + 1).padStart(4, "0")}`;
}

/* Arma una venta (todavía no la guarda) */
function buildSale({ customer, phone = "", address = "", method, items, status, source }) {
    return {
        id: getNextSaleId(),
        date: new Date().toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }),
        day: new Date().toDateString(),
        createdAt: Date.now(),
        customer,
        phone,
        address,
        method,
        items,
        total: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
        status,
        source
    };
}

/* Descuenta el stock de una venta. Devuelve un texto si hay error, o null si salió bien */
function descontarStock(sale) {
    for (const it of sale.items) {
        const p = inventory.find(x => x.id === it.productId);
        if (!p) return `El producto "${it.name}" ya no existe en el inventario.`;
        if (p.stock < it.quantity) return `Stock insuficiente de "${it.name}" (hay ${p.stock}).`;
    }

    sale.items.forEach(it => {
        const p = inventory.find(x => x.id === it.productId);
        p.stock -= it.quantity;
        movements.unshift({
            date: new Date().toLocaleDateString(),
            product: p.name,
            type: "salida",
            quantity: it.quantity,
            reason: `Venta ${sale.id}`
        });
    });

    return null;
}

/* Devuelve el stock cuando se anula una venta pagada */
function devolverStock(sale) {
    sale.items.forEach(it => {
        const p = inventory.find(x => x.id === it.productId);
        if (!p) return;
        p.stock += it.quantity;
        movements.unshift({
            date: new Date().toLocaleDateString(),
            product: p.name,
            type: "entrada",
            quantity: it.quantity,
            reason: `Anulación ${sale.id}`
        });
    });
}

function changeSaleStatus(id, newStatus) {
    const sale = sales.find(s => s.id === id);
    if (!sale || sale.status === newStatus) return;

    if (newStatus === "pagado" && sale.status === "pendiente") {
        if (sale.method === "Por confirmar") {
            const metodo = prompt("¿Con qué método pagó el cliente? (Yape, Plin, Transferencia, Efectivo, Contra entrega)");
            if (metodo === null) return;
            sale.method = metodo.trim() || "Otro";
        }

        const error = descontarStock(sale);
        if (error) {
            showToast(error, true);
            return;
        }
        showToast(`Venta ${sale.id} marcada como pagada`);
    }

    if (newStatus === "anulado") {
        const aviso = sale.status === "pagado"
            ? "Se anulará la venta y el stock volverá al inventario. ¿Continuar?"
            : "¿Anular este pedido?";
        if (!confirm(aviso)) return;

        if (sale.status === "pagado") devolverStock(sale);
        showToast(`Venta ${sale.id} anulada`);
    }

    sale.status = newStatus;
    refreshAll();
}

function renderSales() {
    const table = document.getElementById("salesTable");
    if (!table) return;

    /* Tarjetas de resumen */
    const pagadas = sales.filter(s => s.status === "pagado");
    const pendientes = sales.filter(s => s.status === "pendiente");
    const hoy = pagadas.filter(s => s.day === new Date().toDateString());
    const totalVendido = pagadas.reduce((sum, s) => sum + s.total, 0);

    const setText = (id, valor) => {
        const el = document.getElementById(id);
        if (el) el.textContent = valor;
    };
    setText("statSalesPaid", pagadas.length);
    setText("statSalesTotal", `S/ ${totalVendido.toFixed(2)}`);
    setText("statSalesPending", pendientes.length);
    setText("statSalesToday", hoy.length);

    /* Tabla */
    table.innerHTML = "";

    if (sales.length === 0) {
        table.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--muted);">
            Todavía no hay ventas. Los pedidos del carrito aparecerán aquí y también puedes registrar una venta de tienda.
        </td></tr>`;
        return;
    }

    const etiquetas = {
        pagado: { clase: "ok", texto: "Pagado" },
        pendiente: { clase: "low", texto: "Pendiente" },
        anulado: { clase: "out", texto: "Anulado" }
    };

    sales.forEach(sale => {
        const estado = etiquetas[sale.status] || etiquetas.pendiente;
        const productos = sale.items
            .map(i => `${i.quantity} × ${escapeHTML(i.name)}`)
            .join("<br>");

        let acciones = "";
        if (sale.status === "pendiente") {
            acciones += `<button type="button" class="table-action" title="Marcar como pagado" data-sale-pay="${sale.id}"><i class="fa-solid fa-check"></i></button>`;
        }
        if (sale.status !== "anulado") {
            acciones += `<button type="button" class="table-action delete" title="Anular" data-sale-cancel="${sale.id}"><i class="fa-solid fa-ban"></i></button>`;
        }

        const contacto = [sale.phone, sale.address].filter(Boolean).map(escapeHTML).join("<br>");

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${escapeHTML(sale.id)}</strong></td>
            <td>${escapeHTML(sale.date)}</td>
            <td>${escapeHTML(sale.customer)}<br><small style="color:var(--muted);">${escapeHTML(sale.source)}${contacto ? "<br>" + contacto : ""}</small></td>
            <td style="line-height:1.6;">${productos}</td>
            <td>${escapeHTML(sale.method)}</td>
            <td><strong>S/ ${sale.total.toFixed(2)}</strong></td>
            <td><span class="status ${estado.clase}">${estado.texto}</span></td>
            <td>${acciones}</td>
        `;
        table.appendChild(row);
    });
}

/* Botones "pagado" y "anular" de la tabla */
document.addEventListener("click", (e) => {
    const pay = e.target.closest("[data-sale-pay]");
    const cancel = e.target.closest("[data-sale-cancel]");
    if (pay) changeSaleStatus(pay.dataset.salePay, "pagado");
    if (cancel) changeSaleStatus(cancel.dataset.saleCancel, "anulado");
});


/* ----- Registrar una venta de tienda ----- */

/* Si el formulario no está en el HTML, se crea aquí automáticamente */
function ensureSaleModal() {
    if (document.getElementById("saleModal")) return;

    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.id = "saleModal";
    modal.innerHTML = `
        <div class="modal">
            <button class="modal-close" type="button" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>
            <div class="modal-header">
                <span class="modal-icon"><i class="fa-solid fa-cash-register"></i></span>
                <div><h2>Registrar venta</h2><p>Venta realizada en tienda</p></div>
            </div>
            <form id="saleForm">
                <div class="form-row">
                    <div class="form-group"><label>Cliente</label><input type="text" id="saleCustomer" placeholder="Cliente de tienda"></div>
                    <div class="form-group"><label>Método de pago</label>
                        <select id="saleMethod">
                            <option>Efectivo</option>
                            <option>Yape</option>
                            <option>Plin</option>
                            <option>Transferencia</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Producto</label><select id="saleProduct"></select></div>
                    <div class="form-group"><label>Cantidad</label><input type="number" id="saleQty" min="1" value="1"></div>
                </div>
                <button type="button" class="small-btn" id="addSaleItemBtn"><i class="fa-solid fa-plus"></i> Agregar a la venta</button>
                <div class="sale-items" id="saleItems"></div>
                <div class="sale-total"><span>Total</span><span id="saleDraftTotal">S/ 0.00</span></div>
                <button type="submit" class="btn btn-primary submit-btn">Registrar venta</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector(".modal-close").addEventListener("click", () => closeModal("saleModal"));
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal("saleModal");
    });
}

ensureSaleModal();

let saleDraft = [];

function renderSaleDraft() {
    const list = document.getElementById("saleItems");
    const totalEl = document.getElementById("saleDraftTotal");
    if (!list || !totalEl) return;

    if (saleDraft.length === 0) {
        list.innerHTML = `<div class="sale-empty">Aún no agregaste productos.</div>`;
        totalEl.textContent = "S/ 0.00";
        return;
    }

    list.innerHTML = "";
    let total = 0;

    saleDraft.forEach((item, index) => {
        total += item.price * item.quantity;

        const row = document.createElement("div");
        row.className = "sale-item";
        row.innerHTML = `
            <span>${item.quantity} × ${escapeHTML(item.name)}</span>
            <span>
                <strong>S/ ${(item.price * item.quantity).toFixed(2)}</strong>
                <button type="button" class="table-action delete" data-draft-remove="${index}" aria-label="Quitar"><i class="fa-solid fa-xmark"></i></button>
            </span>
        `;
        list.appendChild(row);
    });

    totalEl.textContent = `S/ ${total.toFixed(2)}`;
}

document.addEventListener("click", (e) => {
    if (e.target.closest("#newSaleBtn")) openSaleModal();
});

function openSaleModal() {
    const disponibles = inventory.filter(p => p.stock > 0);
    if (disponibles.length === 0) {
        showToast("No hay productos con stock para vender", true);
        return;
    }

    const select = document.getElementById("saleProduct");
    select.innerHTML = "";
    disponibles.forEach(p => {
        const option = document.createElement("option");
        option.value = p.id;
        option.textContent = `${p.name} (stock ${p.stock}) - S/ ${Number(p.price).toFixed(2)}`;
        select.appendChild(option);
    });

    saleDraft = [];
    document.getElementById("saleForm").reset();
    document.getElementById("saleQty").value = 1;
    renderSaleDraft();
    openModal("saleModal");
}

document.getElementById("addSaleItemBtn")?.addEventListener("click", () => {
    const productId = document.getElementById("saleProduct").value;
    const quantity = parseInt(document.getElementById("saleQty").value);
    const product = inventory.find(p => p.id === productId);

    if (!product || isNaN(quantity) || quantity < 1) {
        showToast("Elige un producto y una cantidad válida", true);
        return;
    }

    const yaAgregado = saleDraft.find(i => i.productId === productId);
    const total = (yaAgregado ? yaAgregado.quantity : 0) + quantity;

    if (total > product.stock) {
        showToast(`Solo hay ${product.stock} unidades de este producto`, true);
        return;
    }

    if (yaAgregado) {
        yaAgregado.quantity = total;
    } else {
        saleDraft.push({
            productId: product.id,
            name: product.name,
            price: Number(product.price),
            quantity
        });
    }

    document.getElementById("saleQty").value = 1;
    renderSaleDraft();
});

document.getElementById("saleItems")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-draft-remove]");
    if (!btn) return;
    saleDraft.splice(parseInt(btn.dataset.draftRemove), 1);
    renderSaleDraft();
});

document.getElementById("saleForm")?.addEventListener("submit", (e) => {
    e.preventDefault();

    if (saleDraft.length === 0) {
        showToast("Agrega al menos un producto", true);
        return;
    }

    const sale = buildSale({
        customer: document.getElementById("saleCustomer").value.trim() || "Cliente de tienda",
        method: document.getElementById("saleMethod").value,
        status: "pagado",
        source: "Tienda",
        items: saleDraft.map(i => ({ ...i }))
    });

    const error = descontarStock(sale);
    if (error) {
        showToast(error, true);
        return;
    }

    sales.unshift(sale);
    saleDraft = [];
    refreshAll();
    closeModal("saleModal");
    showToast(`Venta ${sale.id} registrada`);
});


/* =========================================================
   MÉTODOS DE PAGO DENTRO DEL CARRITO
========================================================= */

const paymentMethodsBtn = document.getElementById("paymentMethodsBtn");
const paymentMethodsContent = document.getElementById("paymentMethodsContent");

if (paymentMethodsBtn && paymentMethodsContent) {
    paymentMethodsBtn.addEventListener("click", () => {
        const abierto = paymentMethodsContent.classList.toggle("active");

        paymentMethodsBtn.classList.toggle("active", abierto);
        paymentMethodsBtn.setAttribute("aria-expanded", abierto ? "true" : "false");
        paymentMethodsContent.setAttribute("aria-hidden", abierto ? "false" : "true");
    });
}


/* =========================================================
   CHATBOT HYDRALT CON VOZ
========================================================= */

const chatbotToggle = document.getElementById("chatbotToggle");
const chatbotContainer = document.getElementById("chatbotContainer");
const chatbotClose = document.getElementById("chatbotClose");
const chatbotMessages = document.getElementById("chatbotMessages");
const chatbotInput = document.getElementById("chatbotInput");
const sendBtn = document.getElementById("sendBtn");
const voiceBtn = document.getElementById("voiceBtn");
const voiceListening = document.getElementById("voiceListening");

function abrirChatbot() {
    if (!chatbotContainer) return;
    chatbotContainer.classList.add("show");
    if (chatbotInput) setTimeout(() => chatbotInput.focus(), 200);
}

function cerrarChatbot() {
    if (!chatbotContainer) return;
    chatbotContainer.classList.remove("show");
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

if (chatbotToggle) {
    chatbotToggle.addEventListener("click", () => {
        if (chatbotContainer && chatbotContainer.classList.contains("show")) {
            cerrarChatbot();
        } else {
            abrirChatbot();
        }
    });
}

if (chatbotClose) chatbotClose.addEventListener("click", cerrarChatbot);
if (sendBtn) sendBtn.addEventListener("click", enviarMensajeChatbot);

if (chatbotInput) {
    chatbotInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            enviarMensajeChatbot();
        }
    });
}

/* Protección contra mensajes repetidos (doble evento, eco del micrófono, doble clic) */
let chatUltimoEnvio = { texto: "", hora: 0 };
let chatEsperandoRespuesta = false;
let chatUltimoMensaje = { texto: "", tipo: "", hora: 0 };

function enviarMensajeChatbot() {
    if (!chatbotInput) return;

    const mensaje = chatbotInput.value.trim();
    if (!mensaje) return;

    const ahora = Date.now();

    /* Si ya está respondiendo, o es el mismo texto recién enviado, se ignora */
    if (chatEsperandoRespuesta ||
        (mensaje === chatUltimoEnvio.texto && ahora - chatUltimoEnvio.hora < 2500)) {
        chatbotInput.value = "";
        return;
    }

    chatUltimoEnvio = { texto: mensaje, hora: ahora };
    chatEsperandoRespuesta = true;

    agregarMensajeChatbot(mensaje, "user");
    chatbotInput.value = "";

    setTimeout(() => {
        try {
            const respuesta = responderChatbot(mensaje);
            agregarMensajeChatbot(respuesta, "bot");
            hablarTexto(respuesta);
        } finally {
            chatEsperandoRespuesta = false;
        }
    }, 450);
}

/* Convierte los enlaces del texto en botones de texto clicables */
function chatLinkify(texto) {
    return escapeHTML(texto).replace(/(https?:\/\/[^\s<]+)/g, (url) => {
        let etiqueta = url;
        if (url.includes("/dir/")) etiqueta = "Abrir ruta en Google Maps";
        else if (url.includes("maps")) etiqueta = "Abrir en Google Maps";
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${etiqueta}</a>`;
    });
}

function agregarMensajeChatbot(texto, tipo) {
    if (!chatbotMessages) return;

    const ahoraMensaje = Date.now();
    if (chatUltimoMensaje.texto === texto && chatUltimoMensaje.tipo === tipo &&
        ahoraMensaje - chatUltimoMensaje.hora < 800) {
        return;
    }
    chatUltimoMensaje = { texto, tipo, hora: ahoraMensaje };

    const mensaje = document.createElement("div");
    mensaje.className = `chatbot-message ${tipo}`;

    if (tipo === "bot") {
        mensaje.innerHTML = `
            <div class="message-content">
                <i class="fa-solid fa-robot"></i>
                <div>
                    <strong>Asistente HYDRALT</strong>
                    <p></p>
                </div>
            </div>
        `;
    } else {
        mensaje.innerHTML = `
            <div class="message-content">
                <p></p>
            </div>
        `;
    }

    const parrafo = mensaje.querySelector("p");
    parrafo.style.whiteSpace = "pre-line";

    if (tipo === "bot") {
        /* Se escapa el texto y solo los enlaces se vuelven clicables */
        parrafo.innerHTML = chatLinkify(texto);
    } else {
        /* textContent evita que lo escrito rompa la página */
        parrafo.textContent = texto;
    }

    chatbotMessages.appendChild(mensaje);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

/* =========================================================
   CEREBRO DEL CHATBOT
   - Entiende tildes, plurales y frases distintas.
   - Responde con los productos y precios reales del inventario.
   - Recuerda el último producto para preguntas como "¿y cuánto cuesta?".
   - Guarda las preguntas que no entendió para que puedas mejorarlo.
========================================================= */

const CHAT_INFO = {
    telefono: "+51 987 654 321",
    horario: ""    /* Ej.: "Lunes a sábado, de 8:00 a. m. a 6:00 p. m." */
};

let chatContext = { lastProduct: null, fallbackCount: 0 };

/* Palabras que no ayudan a reconocer un producto */
const CHAT_STOP = new Set((
    "de del la el los las un una unos unas para por con sin que cual cuales como cuando donde quien quienes porque " +
    "me mi tu su les le lo al y o a e en es son se si no ya muy mas menos tambien " +
    "necesito quiero quisiera busco tienen tiene tengo hacen hace puedo pueden puede podria podrian puedes dime dame favor saber " +
    "informacion info cuanto cuantos cuesta cuestan vale valen precio precios costo costos hay venden vende algun alguna " +
    "este esta ese esa agua sistema sistemas alta alto automatico automatica modelo modelos producto productos equipo equipos " +
    "marca tipo tipos clase opcion opciones buenas buenos dias tardes noches hola"
).split(" "));

/* Cada intención tiene palabras clave ya sin tildes. Con * coincide el inicio de la palabra. */
const CHAT_INTENTS = [
    { id: "saludo", words: ["hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", "buen dia", "hey", "saludos"] },
    { id: "gracias", words: ["gracias", "agradezco"] },
    { id: "despedida", words: ["adios", "chau", "hasta luego", "nos vemos", "bye"] },
    { id: "ayuda", words: ["ayuda", "que puedes hacer", "que sabes", "menu", "opciones"] },
    { id: "pago", words: ["pag*", "yape", "plin", "transferencia", "contra entrega", "contraentrega", "efectivo", "tarjeta", "deposito", "metod*", "cuenta bancaria", "bcp", "cci"] },
    { id: "envio", words: ["envi*", "delivery", "despach*", "entreg*", "llevan", "provincia*", "courier", "flete", "reparto", "a todo el peru"] },
    { id: "instalacion", words: ["instal*", "colocar", "colocan", "montaje", "montar"] },
    { id: "mantenimiento", words: ["mantenim*", "cambio de filtro", "cambiar filtro", "revision", "servicio tecnico", "tecnico", "reparac*", "reparar", "limpieza", "arreglar", "malogr*", "falla*"] },
    { id: "laboratorio", words: ["laboratorio", "analisis", "analizar", "bacteriolog*", "fisicoquimic*", "metales pesados", "calidad del agua", "monitoreo", "muestra*"] },
    { id: "ubicacion", words: ["ubicacion", "ubicad*", "direccion", "donde estan", "donde queda", "donde se encuentran", "donde atienden", "local", "oficina*", "sucursal*", "tienda*", "juliaca", "cusco", "cuzco", "puno", "como llegar", "indicaciones", "ruta", "mapa", "google maps", "maps", "visitar", "visita"] },
    { id: "contacto", words: ["whatsapp", "telefono", "celular", "llamar", "llamada", "numero", "contacto", "contactar", "correo", "email", "comunicar*", "escribir", "hablar con", "asesor*"] },
    { id: "horario", words: ["horario*", "hora*", "abren", "abierto", "atienden", "cierran", "dias de atencion", "sabado", "domingo"] },
    { id: "garantia", words: ["garantia*", "garantizado", "devolucion", "devolver", "cambio", "defectuoso"] },
    { id: "cotizacion", words: ["cotiz*", "presupuesto", "proyecto*", "a medida", "por mayor", "mayorista", "descuento*", "oferta*", "promocion*"] },
    { id: "comprar", words: ["comprar", "compra", "como compro", "pedido", "pedir", "carrito", "ordenar", "reservar", "adquirir"] },
    { id: "reclamos", words: ["reclam*", "queja*", "libro de reclamaciones", "denuncia*", "indecopi", "mal servicio"] },
    { id: "factura", words: ["factura*", "boleta*", "ruc", "comprobante*", "sunat"] },
    { id: "empresa", words: ["quienes son", "quienes somos", "empresa", "hydralt", "experiencia", "anos", "trayectoria", "a que se dedican", "que hacen", "que ofrecen", "que servicios", "servicios"] },
    { id: "stock", words: ["stock", "disponib*", "agotado", "quedan"] },
    { id: "precio", words: ["precio*", "cuanto cuesta", "cuanto vale", "cuanto sale", "cuanto cuestan", "costo*", "cuesta", "cuestan", "vale", "tarifa*", "cuanto"] },
    { id: "productos", words: ["producto*", "catalogo", "que venden", "que tienen", "que vende", "venden", "vender", "lista", "modelos", "equipos"] }
];

/* Intenciones que NO son servicios: se resuelven con el inventario */
const CHAT_NO_SERVICIO = ["precio", "stock", "productos", "saludo", "gracias", "despedida"];

function chatNorm(texto) {
    return String(texto).toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/* "filtros" -> "filtro", "válvulas" -> "valvula" */
function chatRaiz(palabra) {
    return palabra.length > 3 && palabra.endsWith("s") ? palabra.slice(0, -1) : palabra;
}

function chatMismaPalabra(a, b) {
    if (a === b) return true;
    return Math.min(a.length, b.length) >= 5 && (a.startsWith(b) || b.startsWith(a));
}

function chatPuntaje(intent, tokens, padded) {
    let total = 0;

    intent.words.forEach(kw => {
        let coincide;
        if (kw.endsWith("*")) {
            const raiz = kw.slice(0, -1);
            coincide = tokens.some(tk => tk.startsWith(raiz));
        } else {
            coincide = padded.includes(" " + kw + " ");
        }
        if (coincide) total += kw.includes(" ") ? 2 : 1;
    });

    return total;
}

/* Busca productos del inventario nombrados en la pregunta */
function chatProductosMencionados(tokens) {
    const significativos = tokens
        .filter(t => t.length > 2 && !CHAT_STOP.has(t))
        .map(chatRaiz);

    if (!significativos.length) return { lista: [], aciertos: 0 };

    const puntuados = inventory.map(p => {
        const nombre = chatNorm(p.name).split(" ")
            .filter(t => t.length > 2 && !CHAT_STOP.has(t))
            .map(chatRaiz);
        const aciertos = significativos.filter(q => nombre.some(n => chatMismaPalabra(q, n))).length;
        return { p, aciertos };
    }).filter(x => x.aciertos > 0);

    if (!puntuados.length) return { lista: [], aciertos: 0 };

    const max = Math.max(...puntuados.map(x => x.aciertos));
    return {
        lista: puntuados.filter(x => x.aciertos === max).map(x => x.p),
        aciertos: max
    };
}

function chatCategoriaMencionada(tokens) {
    const raices = tokens.map(chatRaiz);
    const tiene = (...inicios) => raices.some(r => inicios.some(i => r.startsWith(i)));

    if (tiene("hogar", "casa", "domestic")) return "Hogar";
    if (tiene("industri", "empresa", "fabrica", "planta")) return "Industrial";
    if (tiene("valvula")) return "Válvulas";
    if (tiene("tanque")) return "Tanques";
    return null;
}

function chatPrecio(p) {
    return "S/ " + Number(p.price).toFixed(2);
}

function chatEstadoStock(p) {
    if (p.stock <= 0) return "Por ahora está agotado.";
    if (p.stock <= p.minStock) return "Quedan pocas unidades.";
    return "Hay disponibilidad.";
}

function respProductos(lista) {
    if (lista.length === 1) {
        const p = lista[0];
        chatContext.lastProduct = p;
        return `${p.name}: ${chatPrecio(p)}. ${chatEstadoStock(p)} Categoría: ${p.category}.\nPuedes agregarlo al carrito en la sección Productos o pedir una cotización por WhatsApp.`;
    }

    const lineas = lista.slice(0, 6).map(p => `• ${p.name}: ${chatPrecio(p)}`).join("\n");
    const extra = lista.length > 6 ? `\ny ${lista.length - 6} más en la sección Productos.` : "";
    return `Tenemos estas opciones:\n${lineas}${extra}\nDime cuál te interesa y te doy los detalles.`;
}

function respCategoria(categoria) {
    const lista = inventory.filter(p => p.category === categoria);
    if (!lista.length) {
        return `Por ahora no tengo productos de ${categoria} cargados. Escríbenos por WhatsApp y te ayudamos.`;
    }
    return `En ${categoria} tenemos:\n` +
        lista.slice(0, 8).map(p => `• ${p.name}: ${chatPrecio(p)}`).join("\n") +
        `\nPregúntame por uno y te cuento más.`;
}

function respCatalogo() {
    if (!inventory.length) {
        return "Estamos actualizando el catálogo. Escríbenos por WhatsApp y te enviamos la lista con precios.";
    }

    if (inventory.length <= 8) {
        return "Estos son nuestros productos:\n" +
            inventory.map(p => `• ${p.name}: ${chatPrecio(p)}`).join("\n") +
            `\nPregúntame por uno y te doy los detalles.`;
    }

    const categorias = [...new Set(inventory.map(p => p.category))];
    const resumen = categorias.map(c => {
        const items = inventory.filter(p => p.category === c);
        const precios = items.map(p => Number(p.price));
        return `• ${c}: ${items.length} productos, desde ${"S/ " + Math.min(...precios).toFixed(2)}`;
    }).join("\n");

    return `Manejamos estas categorías:\n${resumen}\nDime qué buscas y te doy el precio exacto.`;
}

const CHAT_RESP = {
    saludo: () => "¡Hola! Soy el asistente de HYDRALT. Puedo ayudarte con productos y precios, formas de pago, envíos, instalación, mantenimiento, análisis de agua y reclamos. ¿Qué necesitas?",
    gracias: () => "¡Con gusto! Si necesitas algo más, aquí estoy.",
    despedida: () => "¡Hasta pronto! Gracias por visitar HYDRALT.",
    ayuda: () => "Puedo contarte sobre: productos y precios, formas de pago, envíos, instalación, mantenimiento, análisis de agua, garantía, ubicación y cómo hacer un reclamo. ¿Qué te interesa?",
    pago: (t) => {
        if (t.includes("yape")) return "Sí, aceptamos Yape. El número y el código QR los ves en el carrito, en el botón Ver métodos de pago. Después de pagar, envíanos la captura por WhatsApp para confirmar tu pedido.";
        if (t.includes("plin")) return "Sí, aceptamos Plin. El número y el código QR los ves en el carrito, en el botón Ver métodos de pago. Después de pagar, envíanos la captura por WhatsApp.";
        if (t.includes("transferencia") || t.includes("deposito") || t.includes("cuenta")) return "Sí, puedes pagar por transferencia o depósito bancario. Los datos de la cuenta están en el carrito, en Ver métodos de pago. Envíanos el comprobante por WhatsApp.";
        if (t.includes("contra entrega") || t.includes("contraentrega") || t.includes("efectivo")) return "Sí, tenemos pago contra entrega: pagas cuando recibes tu pedido. Coordinamos la dirección, la fecha y la hora por WhatsApp.";
        return "Puedes pagar con Yape, Plin, transferencia bancaria o contra entrega. Los datos están en el carrito, en el botón Ver métodos de pago.";
    },
    envio: () => "Realizamos envíos e instalaciones a todo el Perú. El costo y el tiempo dependen de tu ciudad: escríbenos por WhatsApp con tu ubicación y te confirmamos.",
    instalacion: () => "Sí, hacemos la instalación con servicio técnico especializado. Escríbenos por WhatsApp con tu ciudad y el equipo que necesitas para coordinar una fecha.",
    mantenimiento: () => "Hacemos mantenimiento preventivo, cambio de filtros y servicio técnico para sistemas de tratamiento de agua. Cuéntanos qué equipo tienes por WhatsApp y te cotizamos.",
    laboratorio: () => "Tenemos laboratorio: análisis fisicoquímicos, bacteriológicos, de metales pesados y monitoreo del agua. Entra a la sección Laboratorio y presiona Solicitar análisis.",
    ubicacion: (t) => respUbicacion(t),
    contacto: () => `Puedes escribirnos por WhatsApp o llamar al ${CHAT_INFO.telefono}. También puedes usar el formulario de contacto de la página.`,
    horario: () => CHAT_INFO.horario
        ? `Nuestro horario de atención es: ${CHAT_INFO.horario}`
        : `Para confirmar nuestro horario de atención, escríbenos por WhatsApp o llama al ${CHAT_INFO.telefono}.`,
    garantia: () => "Nuestros productos y servicios cuentan con garantía y asesoría técnica. Escríbenos por WhatsApp con el producto y te explicamos las condiciones.",
    cotizacion: () => "Para cotizar, usa el formulario de contacto o escríbenos por WhatsApp indicando el equipo, la cantidad y tu ciudad. Para proyectos industriales evaluamos tu caso.",
    comprar: () => "Es fácil: agrega los productos al carrito (botón del carrito), completa tus datos, elige Yape, Plin, transferencia o contra entrega y envía el pedido por WhatsApp.",
    reclamos: () => "Puedes registrar un reclamo o queja en el Libro de Reclamaciones: está en la barra superior y en el pie de página de esta web.",
    factura: () => `Si necesitas boleta o factura, indícalo por WhatsApp al confirmar tu pedido (${CHAT_INFO.telefono}) y te indicarán qué datos enviar.`,
    empresa: () => "HYDRALT S.R.L. ofrece soluciones para purificación y tratamiento del agua en hogares, empresas e industrias: venta de equipos, instalación, mantenimiento, análisis de agua y asesoría técnica, con más de 10 años de experiencia."
};

function guardarPreguntaSinRespuesta(texto) {
    try {
        const lista = JSON.parse(localStorage.getItem("hydralt_chat_unknown") || "[]");
        lista.unshift({ fecha: new Date().toLocaleString("es-PE"), texto: String(texto).slice(0, 200) });
        localStorage.setItem("hydralt_chat_unknown", JSON.stringify(lista.slice(0, 100)));
    } catch (e) { /* no se puede guardar */ }
}

function respFallback(original) {
    chatContext.fallbackCount++;
    guardarPreguntaSinRespuesta(original);

    const intros = [
        "No estoy seguro de haber entendido tu pregunta.",
        "Esa consulta no la tengo clara todavía.",
        "No encontré una respuesta para eso."
    ];
    const ejemplos = [
        inventory.length ? `¿Cuánto cuesta ${inventory[0].name}?` : "¿Qué productos tienen?",
        "¿Hacen instalación?",
        "¿Cómo puedo pagar?",
        "¿Envían a provincia?"
    ];

    const intro = intros[(chatContext.fallbackCount - 1) % intros.length];
    const ejemplo = ejemplos[(chatContext.fallbackCount - 1) % ejemplos.length];

    return `${intro} Puedo ayudarte con productos y precios, pagos, envíos, instalación, mantenimiento, análisis de agua y reclamos. Prueba, por ejemplo: ${ejemplo} Si prefieres, un asesor te atiende por WhatsApp al ${CHAT_INFO.telefono}.`;
}

function responderChatbot(mensajeUsuario) {
    const t = chatNorm(mensajeUsuario);
    if (!t) return "No te escuché bien. ¿Puedes repetirlo?";

    const tokens = t.split(" ");
    const padded = ` ${t} `;

    const ranking = CHAT_INTENTS
        .map(i => [i.id, chatPuntaje(i, tokens, padded)])
        .filter(([, puntos]) => puntos > 0)
        .sort((a, b) => b[1] - a[1]);

    const mejor = ranking.length ? ranking[0][0] : null;
    const puntajeDe = (id) => (ranking.find(r => r[0] === id) || [id, 0])[1];
    const pregPrecio = puntajeDe("precio") > 0;
    const pregStock = puntajeDe("stock") > 0;

    /* 1) Saludos, gracias y despedidas (solo si el mensaje es corto) */
    if (tokens.length <= 5 && ["saludo", "gracias", "despedida"].includes(mejor)) {
        return CHAT_RESP[mejor](t);
    }

    const menciones = chatProductosMencionados(tokens);
    const productos = menciones.lista;
    const categoria = chatCategoriaMencionada(tokens);
    const servicio = ranking.find(([id]) => !CHAT_NO_SERVICIO.includes(id));

    /* 2) Preguntas de servicio: pagos, envíos, instalación, etc. */
    if (servicio) {
        let respuesta = CHAT_RESP[servicio[0]](t);
        if (productos.length && (pregPrecio || servicio[0] === "comprar")) {
            respuesta += "\n\n" + respProductos(productos);
        }
        return respuesta;
    }

    /* 3) Producto concreto o categoría */
    if (productos.length) {
        if (categoria && menciones.aciertos <= 1) return respCategoria(categoria);
        return respProductos(productos);
    }
    if (categoria) return respCategoria(categoria);

    /* 4) Seguimiento: "¿y cuánto cuesta?" */
    if ((pregPrecio || pregStock) && puntajeDe("productos") === 0 && chatContext.lastProduct && tokens.length <= 7) {
        const actual = inventory.find(p => p.id === chatContext.lastProduct.id) || chatContext.lastProduct;
        return respProductos([actual]);
    }

    /* 5) Preguntas generales de catálogo */
    if (mejor === "stock") return "En cada producto verás si está disponible, con pocas unidades o agotado. Dime el nombre del producto y te confirmo.";
    if (["precio", "productos"].includes(mejor)) return respCatalogo();

    /* 6) No entendió */
    return respFallback(mensajeUsuario);
}

/* Botones de preguntas rápidas dentro del chat */
function ensureChatChips() {
    const area = document.querySelector(".chatbot-input-area");
    if (!area || document.getElementById("chatbotChips")) return;

    const chips = document.createElement("div");
    chips.className = "chatbot-chips";
    chips.id = "chatbotChips";

    ["Productos y precios", "Formas de pago", "Envíos", "Instalación", "Mantenimiento", "Análisis de agua"].forEach(texto => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = texto;
        b.addEventListener("click", () => {
            chatbotInput.value = texto;
            enviarMensajeChatbot();
        });
        chips.appendChild(b);
    });

    area.parentNode.insertBefore(chips, area);
}

ensureChatChips();

function hablarTexto(texto) {
    if (!("speechSynthesis" in window)) return;

    /* Si el micrófono sigue abierto, se corta para que no grabe la voz del chatbot */
    if (typeof escuchando !== "undefined" && escuchando && reconocimientoVoz) {
        try { reconocimientoVoz.abort(); } catch (e) { /* nada */ }
    }

    window.speechSynthesis.cancel();

    const tieneEnlace = /https?:\/\//.test(texto);
    const limpio = texto
        .replace(/https?:\/\/\S+/g, "")
        .replace(/(Ver en Google Maps|Cómo llegar):\s*/g, "")
        .replace(/S\/\s?([\d.,]+)/g, "$1 soles")
        .replace(/(\d+)\.00(?!\d)/g, "$1")
        .replace(/[•*_]/g, " ")
        + (tieneEnlace ? " Te dejé los enlaces del mapa en el chat." : "");
    const voz = new SpeechSynthesisUtterance(limpio);
    voz.lang = "es-ES";
    voz.rate = 0.95;
    voz.pitch = 1;
    voz.volume = 1;

    const voces = window.speechSynthesis.getVoices();
    const vozEspanol = voces.find((item) => item.lang.startsWith("es"));
    if (vozEspanol) voz.voice = vozEspanol;

    window.speechSynthesis.speak(voz);
}

/* ----- Reconocimiento por micrófono ----- */
let reconocimientoVoz = null;
let escuchando = false;
let vozYaEnviada = false;

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognitionAPI && voiceBtn) {
    reconocimientoVoz = new SpeechRecognitionAPI();
    reconocimientoVoz.lang = "es-PE";
    reconocimientoVoz.continuous = false;
    reconocimientoVoz.interimResults = false;

    reconocimientoVoz.onstart = () => {
        escuchando = true;
        vozYaEnviada = false;
        voiceBtn.classList.add("listening");
        if (voiceListening) voiceListening.classList.add("show");
    };

    reconocimientoVoz.onend = () => {
        escuchando = false;
        voiceBtn.classList.remove("listening");
        if (voiceListening) voiceListening.classList.remove("show");
    };

    reconocimientoVoz.onresult = (event) => {
        /* Solo se toma la frase final y una sola vez por cada vez que hablas */
        if (vozYaEnviada) return;

        let textoReconocido = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) textoReconocido += event.results[i][0].transcript;
        }
        textoReconocido = textoReconocido.trim();
        if (!textoReconocido) return;

        vozYaEnviada = true;
        try { reconocimientoVoz.stop(); } catch (e) { /* ya estaba detenido */ }

        if (chatbotInput) {
            chatbotInput.value = textoReconocido;
            enviarMensajeChatbot();
        }
    };

    reconocimientoVoz.onerror = () => {
        showToast("No se pudo usar el micrófono. Revisa los permisos.", true);
    };

    voiceBtn.addEventListener("click", () => {
        if (escuchando) {
            reconocimientoVoz.stop();
            return;
        }

        /* Si el chatbot está hablando, se calla primero para que el micrófono no lo escuche */
        if (window.speechSynthesis) window.speechSynthesis.cancel();

        setTimeout(() => {
            try { reconocimientoVoz.start(); } catch (e) { /* ya estaba escuchando */ }
        }, 250);
    });
} else if (voiceBtn) {
    voiceBtn.style.display = "none";
}


/* =========================================================
   LIBRO DE RECLAMACIONES (HOJA DE RECLAMACIÓN VIRTUAL)
   - Aviso visible en la barra superior y en el pie de página.
   - Formulario con los campos de la Hoja de Reclamación.
   - Panel "Reclamos" para ver, responder y controlar el plazo.
========================================================= */

const RECLAMOS_CONFIG = {
    empresa: "HYDRALT S.R.L.",
    ruc: "COMPLETA-TU-RUC",
    domicilio: "COMPLETA LA DIRECCIÓN DEL ESTABLECIMIENTO",
    plazoDias: 30
};

let claims = JSON.parse(localStorage.getItem("hydralt_claims")) || [];
let lastClaim = null;

function saveClaims() {
    localStorage.setItem("hydralt_claims", JSON.stringify(claims));
}

function newClaimId() {
    return "HR-" + new Date().getFullYear() + "-" +
        Date.now().toString(36).toUpperCase().slice(-5) +
        Math.random().toString(36).slice(2, 4).toUpperCase();
}

function validDoc(type, number) {
    if (type === "DNI") return /^\d{8}$/.test(number);
    if (type === "RUC") return /^\d{11}$/.test(number);
    return /^[A-Za-z0-9]{6,15}$/.test(number);
}

function claimDays(claim) {
    return Math.ceil((claim.deadline - Date.now()) / 86400000);
}


/* ---------- Formulario del cliente ---------- */

function claimFormHTML() {
    const c = RECLAMOS_CONFIG;
    return `
        <div class="claim-provider">
            <strong>${escapeHTML(c.empresa)}</strong> · RUC ${escapeHTML(c.ruc)}<br>
            ${escapeHTML(c.domicilio)}<br>
            <small>Fecha: ${new Date().toLocaleDateString("es-PE")}</small>
        </div>

        <form id="claimForm" novalidate>
            <h3 class="claim-title">1. Identificación del consumidor</h3>
            <div class="form-group"><label>Nombre completo *</label><input id="clName" type="text" maxlength="120" autocomplete="name"></div>
            <div class="form-row">
                <div class="form-group"><label>Tipo de documento *</label>
                    <select id="clDocType">
                        <option value="DNI">DNI</option>
                        <option value="CE">Carné de extranjería</option>
                        <option value="Pasaporte">Pasaporte</option>
                        <option value="RUC">RUC</option>
                    </select>
                </div>
                <div class="form-group"><label>N.º de documento *</label><input id="clDocNumber" type="text" maxlength="15"></div>
            </div>
            <div class="form-group"><label>Domicilio *</label><input id="clAddress" type="text" maxlength="200" autocomplete="street-address"></div>
            <div class="form-row">
                <div class="form-group"><label>Teléfono</label><input id="clPhone" type="tel" maxlength="20" autocomplete="tel"></div>
                <div class="form-group"><label>Correo electrónico *</label><input id="clEmail" type="email" maxlength="120" autocomplete="email"></div>
            </div>
            <div class="form-group"><label>Padre, madre o apoderado (solo si eres menor de edad)</label><input id="clGuardian" type="text" maxlength="120"></div>

            <h3 class="claim-title">2. Identificación del bien contratado</h3>
            <div class="form-row">
                <div class="form-group"><label>Tipo *</label>
                    <select id="clGoodType"><option>Producto</option><option>Servicio</option></select>
                </div>
                <div class="form-group"><label>Monto reclamado (S/)</label><input id="clAmount" type="number" min="0" step="0.01"></div>
            </div>
            <div class="form-group"><label>Descripción del producto o servicio *</label><input id="clGoodDesc" type="text" maxlength="200" placeholder="Ej.: Filtro de agua, pedido N.º ..."></div>

            <h3 class="claim-title">3. Detalle de la reclamación y pedido del consumidor</h3>
            <div class="form-group"><label>Tipo *</label>
                <select id="clKind"><option value="reclamo">Reclamo</option><option value="queja">Queja</option></select>
                <small class="claim-help"><b>Reclamo:</b> disconformidad relacionada con los productos o servicios. <b>Queja:</b> malestar o descontento respecto a la atención al público.</small>
            </div>
            <div class="form-group"><label>Detalle *</label><textarea id="clDetail" rows="4" maxlength="3000"></textarea></div>
            <div class="form-group"><label>Pedido del consumidor *</label><textarea id="clPedido" rows="3" maxlength="2000"></textarea></div>

            <p class="claim-note">
                * Campos obligatorios. La formulación del reclamo no impide acudir a otras vías de solución de controversias
                ni es requisito previo para interponer una denuncia ante el INDECOPI. El proveedor debe dar respuesta en un
                plazo no mayor a treinta (30) días calendario, pudiendo ampliarlo hasta por treinta (30) días más, previa
                comunicación al consumidor.
            </p>
            <p class="claim-error" id="claimError" role="alert" hidden></p>
            <button type="submit" class="btn btn-primary submit-btn"><i class="fa-solid fa-paper-plane"></i> Enviar hoja de reclamación</button>
        </form>
    `;
}

function claimDoneHTML(claim) {
    return `
        <div class="claim-done">
            <div class="claim-done-icon"><i class="fa-solid fa-circle-check"></i></div>
            <h3>Tu ${escapeHTML(claim.kind)} fue registrado</h3>
            <p>N.º de hoja de reclamación: <strong>${escapeHTML(claim.id)}</strong></p>
            <p>Fecha: ${escapeHTML(claim.date)}</p>
            <p>Responderemos en un plazo máximo de ${RECLAMOS_CONFIG.plazoDias} días calendario al correo
               <strong>${escapeHTML(claim.email)}</strong>.</p>
            <p class="claim-note">Descarga o imprime tu copia y guárdala como constancia.</p>
            <div class="claim-done-actions">
                <button type="button" class="admin-primary-btn" id="claimPrintBtn"><i class="fa-solid fa-print"></i> Descargar o imprimir mi copia</button>
                <button type="button" class="small-btn" data-close-claims>Cerrar</button>
            </div>
        </div>
    `;
}

function openClaimForm() {
    const body = document.getElementById("claimBody");
    if (!body) return;
    body.innerHTML = claimFormHTML();
    openModal("claimModal");
}

function setClaimError(message) {
    const el = document.getElementById("claimError");
    if (!el) return;
    el.textContent = message;
    el.hidden = !message;
}

function submitClaim(e) {
    e.preventDefault();

    const v = (id) => document.getElementById(id).value.trim();

    const data = {
        name: v("clName"),
        docType: v("clDocType"),
        docNumber: v("clDocNumber"),
        address: v("clAddress"),
        phone: v("clPhone"),
        email: v("clEmail"),
        guardian: v("clGuardian"),
        goodType: v("clGoodType"),
        goodDesc: v("clGoodDesc"),
        amount: v("clAmount"),
        kind: v("clKind"),
        detail: v("clDetail"),
        pedido: v("clPedido")
    };

    if (data.name.length < 3) return setClaimError("Escribe tu nombre completo.");
    if (!validDoc(data.docType, data.docNumber)) return setClaimError("Revisa el número de documento: no tiene el formato correcto.");
    if (data.address.length < 5) return setClaimError("Escribe tu domicilio.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return setClaimError("Escribe un correo electrónico válido.");
    if (data.phone && data.phone.replace(/\D/g, "").length < 7) return setClaimError("El teléfono no es válido.");
    if (data.goodDesc.length < 3) return setClaimError("Indica el producto o servicio.");
    if (data.detail.length < 10) return setClaimError("Cuéntanos con más detalle qué pasó.");
    if (data.pedido.length < 5) return setClaimError("Indica qué solicitas como solución.");

    setClaimError("");

    const now = Date.now();
    const claim = {
        id: newClaimId(),
        createdAt: now,
        date: new Date(now).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }),
        deadline: now + RECLAMOS_CONFIG.plazoDias * 86400000,
        ...data,
        status: "pendiente",
        response: "",
        respondedAt: ""
    };

    /* Con la sincronización activa, el reclamo llega solo al panel */
    if (window.hydraltSync && window.hydraltSync.enabled) {
        window.hydraltSync.sendClaim(claim);
    }

    claims.unshift(claim);
    saveClaims();
    renderClaims();
    lastClaim = claim;

    document.getElementById("claimBody").innerHTML = claimDoneHTML(claim);
}

/* Hoja imprimible (sirve como constancia en PDF o papel) */
function printClaim(claim) {
    const w = window.open("", "_blank");
    if (!w) {
        showToast("Permite las ventanas emergentes para imprimir", true);
        return;
    }

    const e = escapeHTML;
    const c = RECLAMOS_CONFIG;
    const fila = (a, b) => `<tr><td class="l">${a}</td><td>${e(b || "—")}</td></tr>`;

    w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
        <title>Hoja de Reclamación ${e(claim.id)}</title>
        <style>
            body{font-family:Arial,sans-serif;margin:30px;color:#111;font-size:13px}
            h1{font-size:20px;text-align:center;margin:0 0 4px}
            .sub{text-align:center;margin-bottom:14px}
            h2{font-size:13px;background:#e6eef3;padding:6px 8px;margin:16px 0 6px}
            table{width:100%;border-collapse:collapse}
            td{border:1px solid #999;padding:6px 8px;vertical-align:top;white-space:pre-wrap}
            td.l{width:30%;background:#f4f7f9;font-weight:bold}
            .small{font-size:11px;color:#444;margin-top:16px;line-height:1.5}
        </style></head><body>
        <h1>HOJA DE RECLAMACIÓN</h1>
        <div class="sub"><strong>N.º ${e(claim.id)}</strong> · Fecha: ${e(claim.date)}</div>

        <h2>Proveedor</h2>
        <table>${fila("Razón social", c.empresa)}${fila("RUC", c.ruc)}${fila("Domicilio", c.domicilio)}</table>

        <h2>1. Identificación del consumidor</h2>
        <table>
            ${fila("Nombre", claim.name)}
            ${fila("Documento", claim.docType + " " + claim.docNumber)}
            ${fila("Domicilio", claim.address)}
            ${fila("Teléfono", claim.phone)}
            ${fila("Correo electrónico", claim.email)}
            ${fila("Padre, madre o apoderado", claim.guardian)}
        </table>

        <h2>2. Identificación del bien contratado</h2>
        <table>
            ${fila("Tipo", claim.goodType)}
            ${fila("Descripción", claim.goodDesc)}
            ${fila("Monto reclamado", claim.amount ? "S/ " + Number(claim.amount).toFixed(2) : "")}
        </table>

        <h2>3. Detalle de la reclamación y pedido del consumidor</h2>
        <table>
            ${fila("Tipo", claim.kind === "queja" ? "Queja" : "Reclamo")}
            ${fila("Detalle", claim.detail)}
            ${fila("Pedido del consumidor", claim.pedido)}
        </table>

        <h2>4. Observaciones y acciones adoptadas por el proveedor</h2>
        <table>
            ${fila("Respuesta", claim.response)}
            ${fila("Fecha de respuesta", claim.respondedAt)}
        </table>

        <p class="small">Reclamo: disconformidad relacionada con los productos o servicios. Queja: malestar o descontento respecto a la atención al público.
        La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.
        El proveedor debe dar respuesta en un plazo no mayor a treinta (30) días calendario, pudiendo ampliarlo hasta por treinta (30) días más, previa comunicación al consumidor.</p>
        </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
}


/* ---------- Aviso visible + ventana del formulario ---------- */

function ensureClaimsUI() {
    if (document.getElementById("claimModal")) return;

    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.id = "claimModal";
    modal.innerHTML = `
        <div class="modal claim-modal">
            <button class="modal-close" type="button" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>
            <div class="modal-header">
                <span class="modal-icon"><i class="fa-solid fa-book-open"></i></span>
                <div><h2>Libro de Reclamaciones</h2><p>Hoja de Reclamación virtual</p></div>
            </div>
            <div id="claimBody"></div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector(".modal-close").addEventListener("click", () => closeModal("claimModal"));
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal("claimModal"); });

    /* Aviso en la barra superior (visible al entrar a la página de inicio) */
    const topBar = document.querySelector(".top-bar-container");
    if (topBar && !topBar.querySelector("[data-open-claims]")) {
        const wrap = document.createElement("div");
        wrap.innerHTML = `<a href="#" class="claims-link" data-open-claims><i class="fa-solid fa-book-open"></i> Libro de Reclamaciones</a>`;
        topBar.insertBefore(wrap, topBar.lastElementChild);
    }

    /* Aviso en el pie de página */
    const footerBox = document.querySelector(".footer-bottom .container");
    if (footerBox && !footerBox.querySelector("[data-open-claims]")) {
        const p = document.createElement("p");
        p.innerHTML = `<a href="#" class="claims-link" data-open-claims><i class="fa-solid fa-book-open"></i> Libro de Reclamaciones</a>`;
        footerBox.insertBefore(p, footerBox.firstChild);
    }
}

ensureClaimsUI();

document.addEventListener("click", (e) => {
    if (e.target.closest("[data-open-claims]")) {
        e.preventDefault();
        openClaimForm();
    }
    if (e.target.closest("[data-close-claims]")) closeModal("claimModal");
    if (e.target.closest("#claimPrintBtn") && lastClaim) printClaim(lastClaim);
});

document.addEventListener("submit", (e) => {
    if (e.target && e.target.id === "claimForm") submitClaim(e);
});


/* ---------- Panel del administrador ---------- */

function ensureClaimsAdminUI() {
    const nav = document.querySelector(".admin-nav");
    const main = document.querySelector(".admin-main");
    if (!nav || !main || document.getElementById("admin-claims")) return;

    const btn = document.createElement("button");
    btn.className = "admin-nav-btn";
    btn.dataset.adminSection = "claims";
    btn.innerHTML = `<i class="fa-solid fa-book-open"></i> Reclamos <span class="claims-badge" id="claimsBadge" hidden>0</span>`;
    nav.appendChild(btn);

    const section = document.createElement("section");
    section.className = "admin-section";
    section.id = "admin-claims";
    section.innerHTML = `
        <div class="admin-toolbar">
            <div><h2>Libro de Reclamaciones</h2><p>Reclamos y quejas de los clientes. Plazo de respuesta: ${RECLAMOS_CONFIG.plazoDias} días calendario.</p></div>
            <button class="admin-primary-btn" id="exportClaimsBtn" type="button"><i class="fa-solid fa-file-excel"></i> Exportar a Excel</button>
        </div>
        <div class="admin-card">
            <div class="table-wrapper">
                <table>
                    <thead><tr><th>N.º de hoja</th><th>Fecha</th><th>Consumidor</th><th>Tipo</th><th>Detalle</th><th>Plazo</th><th>Estado</th><th>Acciones</th></tr></thead>
                    <tbody id="claimsTable"></tbody>
                </table>
            </div>
        </div>
    `;
    main.appendChild(section);

    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.id = "claimAdminModal";
    modal.innerHTML = `
        <div class="modal claim-modal">
            <button class="modal-close" type="button" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>
            <div class="modal-header">
                <span class="modal-icon"><i class="fa-solid fa-book-open"></i></span>
                <div><h2 id="claimAdminTitle">Reclamo</h2><p id="claimAdminSub"></p></div>
            </div>
            <div id="claimAdminBody"></div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector(".modal-close").addEventListener("click", () => closeModal("claimAdminModal"));
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal("claimAdminModal"); });

    document.getElementById("exportClaimsBtn").addEventListener("click", exportClaimsCSV);
}

ensureClaimsAdminUI();

function renderClaims() {
    const table = document.getElementById("claimsTable");
    const badge = document.getElementById("claimsBadge");
    if (!table) return;

    const pendientes = claims.filter(c => c.status === "pendiente").length;
    if (badge) {
        badge.textContent = pendientes;
        badge.hidden = pendientes === 0;
    }

    table.innerHTML = "";

    if (claims.length === 0) {
        table.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--muted);">Todavía no hay reclamos ni quejas.</td></tr>`;
        return;
    }

    claims.forEach(c => {
        const dias = claimDays(c);
        let estado = { clase: "ok", texto: "Atendido" };
        let plazo = `Respondido`;

        if (c.status === "pendiente") {
            if (dias < 0) {
                estado = { clase: "out", texto: "Vencido" };
                plazo = `Venció hace ${Math.abs(dias)} d.`;
            } else {
                estado = { clase: dias <= 5 ? "low" : "low", texto: "Pendiente" };
                plazo = `${dias} días (hasta ${new Date(c.deadline).toLocaleDateString("es-PE")})`;
            }
        }

        const resumen = c.detail.length > 70 ? c.detail.slice(0, 70) + "…" : c.detail;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${escapeHTML(c.id)}</strong></td>
            <td>${escapeHTML(c.date)}</td>
            <td>${escapeHTML(c.name)}<br><small style="color:var(--muted);">${escapeHTML(c.docType)} ${escapeHTML(c.docNumber)}<br>${escapeHTML(c.email)}${c.phone ? "<br>" + escapeHTML(c.phone) : ""}</small></td>
            <td>${c.kind === "queja" ? "Queja" : "Reclamo"}</td>
            <td style="max-width:220px;">${escapeHTML(resumen)}</td>
            <td style="${c.status === "pendiente" && dias <= 5 ? "color:var(--danger);font-weight:700;" : ""}">${plazo}</td>
            <td><span class="status ${estado.clase}">${estado.texto}</span></td>
            <td><button type="button" class="table-action" title="Ver y responder" data-claim-open="${escapeHTML(c.id)}"><i class="fa-solid fa-eye"></i></button></td>
        `;
        table.appendChild(row);
    });
}

function openClaimAdmin(id) {
    const c = claims.find(x => x.id === id);
    if (!c) return;

    const e = escapeHTML;
    const filas = [
        ["Consumidor", c.name],
        ["Documento", `${c.docType} ${c.docNumber}`],
        ["Domicilio", c.address],
        ["Teléfono", c.phone],
        ["Correo", c.email],
        ["Padre, madre o apoderado", c.guardian],
        ["Bien contratado", `${c.goodType}: ${c.goodDesc}`],
        ["Monto reclamado", c.amount ? "S/ " + Number(c.amount).toFixed(2) : ""],
        ["Tipo", c.kind === "queja" ? "Queja" : "Reclamo"],
        ["Detalle", c.detail],
        ["Pedido del consumidor", c.pedido]
    ].map(([a, b]) => `<tr><td class="l">${a}</td><td>${e(b || "—")}</td></tr>`).join("");

    document.getElementById("claimAdminTitle").textContent = `Hoja ${c.id}`;
    document.getElementById("claimAdminSub").textContent = `${c.date} · vence el ${new Date(c.deadline).toLocaleDateString("es-PE")}`;

    document.getElementById("claimAdminBody").innerHTML = `
        <table class="claim-table">${filas}</table>

        <div class="form-group" style="margin-top:16px;">
            <label>Respuesta del proveedor (observaciones y acciones adoptadas)</label>
            <textarea id="claimResponse" rows="5" maxlength="3000">${e(c.response || "")}</textarea>
        </div>

        <div class="claim-admin-actions">
            <button type="button" class="admin-primary-btn" data-claim-save="${e(c.id)}"><i class="fa-solid fa-check"></i> Guardar y marcar atendido</button>
            <button type="button" class="small-btn" data-claim-mail="${e(c.id)}"><i class="fa-solid fa-envelope"></i> Responder por correo</button>
            <button type="button" class="small-btn" data-claim-print="${e(c.id)}"><i class="fa-solid fa-print"></i> Imprimir hoja</button>
        </div>
    `;

    openModal("claimAdminModal");
}

function saveClaimResponse(id) {
    const c = claims.find(x => x.id === id);
    const texto = document.getElementById("claimResponse").value.trim();
    if (!c) return;

    if (texto.length < 5) {
        showToast("Escribe la respuesta antes de guardar", true);
        return;
    }

    c.response = texto;
    c.respondedAt = new Date().toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
    c.status = "atendido";

    saveClaims();
    renderClaims();
    closeModal("claimAdminModal");
    showToast(`Hoja ${c.id} marcada como atendida`);
}

function mailClaimResponse(id) {
    const c = claims.find(x => x.id === id);
    const texto = document.getElementById("claimResponse").value.trim();
    if (!c) return;

    const asunto = `Respuesta a su ${c.kind} N.º ${c.id} - ${RECLAMOS_CONFIG.empresa}`;
    const cuerpo = `Estimado(a) ${c.name}:\n\nRespecto a su ${c.kind} N.º ${c.id}:\n\n${texto}\n\nAtentamente,\n${RECLAMOS_CONFIG.empresa}`;
    window.location.href = `mailto:${c.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}

document.addEventListener("click", (e) => {
    const abrir = e.target.closest("[data-claim-open]");
    const guardar = e.target.closest("[data-claim-save]");
    const correo = e.target.closest("[data-claim-mail]");
    const imprimir = e.target.closest("[data-claim-print]");

    if (abrir) openClaimAdmin(abrir.dataset.claimOpen);
    if (guardar) saveClaimResponse(guardar.dataset.claimSave);
    if (correo) mailClaimResponse(correo.dataset.claimMail);
    if (imprimir) {
        const c = claims.find(x => x.id === imprimir.dataset.claimPrint);
        if (c) printClaim(c);
    }
});

function exportClaimsCSV() {
    downloadCSV(
        `hydralt-reclamos-${todayStamp()}.csv`,
        ["N.º de hoja", "Fecha", "Tipo", "Consumidor", "Documento", "Teléfono", "Correo", "Bien contratado", "Monto reclamado", "Detalle", "Pedido", "Estado", "Respuesta", "Fecha de respuesta"],
        claims.map(c => [
            c.id, c.date, c.kind, c.name, `${c.docType} ${c.docNumber}`, c.phone || "", c.email,
            `${c.goodType}: ${c.goodDesc}`, c.amount || "", c.detail, c.pedido, c.status,
            c.response || "", c.respondedAt || ""
        ])
    );
}


/* =========================================================
   TIENDAS Y UBICACIÓN (GOOGLE MAPS)
   - Sección "Dónde estamos" con mapa de cada tienda.
   - El chatbot responde con enlaces de Google Maps.
   Completa los datos reales en TIENDAS.
========================================================= */

const TIENDAS = [
    {
        ciudad: "Juliaca",
        tipo: "Oficina principal",
        nombre: "HYDRALT SRL Ingeniería del agua",
        direccion: "",      /* Opcional: escribe la dirección, ej.: "Jr. Ejemplo 123" */
        referencia: "",     /* Opcional: ej.: "frente al parque" */
        horario: "",        /* Opcional: ej.: "Lunes a sábado, 8:00 a. m. a 6:00 p. m." */
        telefono: "",       /* Opcional */
        lat: "-15.491793",
        lng: "-70.134084",
        mapa: "https://maps.google.com/?cid=12633336695200055347",
        embed: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3844.863124650245!2d-70.13408402570376!3d-15.491792915575042!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9167f35459f01255%3A0xaf52a0ca3d4e8033!2sHYDRALT%20SRL%20Ingenier%C3%ADa%20del%20agua!5e0!3m2!1ses-419!2spe!4v1792438161446!5m2!1ses-419!2spe"
    },
    {
        ciudad: "Cusco",
        tipo: "Sucursal",
        nombre: "HYDRALT CUSCO",
        direccion: "",      /* Opcional */
        referencia: "",
        horario: "",
        telefono: "",
        lat: "-13.526133",
        lng: "-71.963933",
        mapa: "https://maps.google.com/?cid=1115315984064160042",
        embed: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3879.154104073306!2d-71.96393262491381!3d-13.526132686842603!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x916dd5e07a522fa9%3A0xf7a65fa7275a12a!2sHYDRALT%20CUSCO!5e0!3m2!1ses-419!2spe!4v1792438088631!5m2!1ses-419!2spe"
    }
];

/* ¿Tiene la dirección escrita? */
function tiendaConfigurada(t) {
    return !!t.direccion && !t.direccion.startsWith("COMPLETA");
}

/* ¿Se puede ubicar en Google Maps? (dirección, coordenadas o enlace) */
function tieneUbicacion(t) {
    return tiendaConfigurada(t) || !!(t.lat && t.lng) || !!t.mapa;
}

/* Texto que Google Maps usa para ubicar la tienda (las coordenadas son lo más exacto) */
function tiendaConsulta(t) {
    if (t.lat && t.lng) return `${t.lat},${t.lng}`;
    return tiendaConfigurada(t)
        ? `${t.direccion}, ${t.ciudad}, Perú`
        : `${t.ciudad}, Perú`;
}

function tiendaLinkMapa(t) {
    return t.mapa || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tiendaConsulta(t))}`;
}

function tiendaLinkRuta(t) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(tiendaConsulta(t))}`;
}

function tiendaEmbed(t) {
    return t.embed || `https://maps.google.com/maps?q=${encodeURIComponent(tiendaConsulta(t))}&output=embed`;
}

/* Respuesta del chatbot sobre ubicación */
function respUbicacion(t) {
    const tokens = t.split(" ");
    const pideCusco = tokens.some(x => x === "cusco" || x === "cuzco");
    const pideJuliaca = tokens.some(x => x === "juliaca" || x === "puno");

    let lista = TIENDAS;
    if (pideCusco && !pideJuliaca) lista = TIENDAS.filter(x => x.ciudad === "Cusco");
    if (pideJuliaca && !pideCusco) lista = TIENDAS.filter(x => x.ciudad === "Juliaca");

    const bloques = lista.map(x => {
        if (!tieneUbicacion(x)) {
            return `${x.tipo} en ${x.ciudad}: escríbenos por WhatsApp al ${CHAT_INFO.telefono} y te enviamos la dirección exacta.`;
        }

        let b = `${x.tipo} en ${x.ciudad} (${x.nombre}):`;
        if (tiendaConfigurada(x)) b += `\n${x.direccion}${x.referencia ? " (" + x.referencia + ")" : ""}`;
        if (x.horario) b += `\nHorario: ${x.horario}`;
        b += `\nVer en Google Maps: ${tiendaLinkMapa(x)}`;
        b += `\nCómo llegar: ${tiendaLinkRuta(x)}`;
        return b;
    });

    return bloques.join("\n\n") + (lista.length > 1 ? "\n\nAtendemos a todo el Perú." : "");
}

/* Sección con mapas dentro de la página */
function ensureStoresSection() {
    if (document.getElementById("tiendas")) return;

    const contacto = document.getElementById("contacto");
    if (!contacto) return;

    const section = document.createElement("section");
    section.id = "tiendas";
    section.className = "section stores-section";
    section.innerHTML = `
        <div class="container">
            <div class="section-header">
                <span class="section-tag">Dónde estamos</span>
                <h2>Visítanos en <span>Juliaca y Cusco</span></h2>
                <p>Encuentra nuestras tiendas y llega fácil con Google Maps.</p>
            </div>
            <div class="stores-grid">
                ${TIENDAS.map(t => `
                    <article class="store-card">
                        <div class="store-info">
                            <span class="store-type">${escapeHTML(t.tipo)}</span>
                            <h3>${escapeHTML(t.ciudad)}</h3>
                            <p class="store-name">${escapeHTML(t.nombre || "")}</p>
                            <p class="store-line"><i class="fa-solid fa-location-dot"></i>
                                <span>${tiendaConfigurada(t)
                                    ? escapeHTML(t.direccion) + (t.referencia ? " (" + escapeHTML(t.referencia) + ")" : "")
                                    : "Mira la ubicación exacta en el mapa de Google."}</span></p>
                            ${t.horario ? `<p class="store-line"><i class="fa-regular fa-clock"></i><span>${escapeHTML(t.horario)}</span></p>` : ""}
                            ${t.telefono ? `<p class="store-line"><i class="fa-solid fa-phone"></i><span>${escapeHTML(t.telefono)}</span></p>` : ""}
                            <div class="store-actions">
                                <a class="btn btn-primary" href="${escapeHTML(tiendaLinkMapa(t))}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-map-location-dot"></i> Ver en Google Maps</a>
                                <a class="btn store-btn-ghost" href="${escapeHTML(tiendaLinkRuta(t))}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-route"></i> Cómo llegar</a>
                            </div>
                        </div>
                        <iframe class="store-map" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen
                            title="Mapa de ${escapeHTML(t.nombre || t.ciudad)}"
                            src="${escapeHTML(tiendaEmbed(t))}"></iframe>
                    </article>
                `).join("")}
            </div>
        </div>
    `;

    contacto.parentNode.insertBefore(section, contacto);
}

ensureStoresSection();


/* =========================================================
   RESPALDO Y EXPORTACIÓN
   - Respaldo completo (.json) para guardar o restaurar todo.
   - Inventario y ventas en .csv (se abren con Excel).
========================================================= */

function downloadFile(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function todayStamp() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function csvCell(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadCSV(name, headers, rows) {
    /* El \ufeff hace que Excel muestre bien las tildes */
    const text = "\ufeff" + [headers, ...rows].map(r => r.map(csvCell).join(",")).join("\r\n");
    downloadFile(name, text, "text/csv;charset=utf-8");
}

function updateLastBackupLabel() {
    const el = document.getElementById("lastBackup");
    if (!el) return;
    const last = localStorage.getItem("hydralt_last_backup");
    el.textContent = last ? `Último respaldo: ${last}` : "Todavía no hiciste ningún respaldo.";
}

function exportBackup() {
    const data = {
        app: "hydralt",
        exportedAt: new Date().toLocaleString("es-PE"),
        inventory,
        movements,
        sales,
        claims
    };
    downloadFile(`hydralt-respaldo-${todayStamp()}.json`, JSON.stringify(data, null, 2), "application/json");
    localStorage.setItem("hydralt_last_backup", data.exportedAt);
    updateLastBackupLabel();
    showToast("Respaldo descargado");
}

function exportInventoryCSV() {
    downloadCSV(
        `hydralt-inventario-${todayStamp()}.csv`,
        ["Producto", "Categoría", "Precio", "Stock", "Stock mínimo"],
        inventory.map(p => [p.name, p.category, Number(p.price).toFixed(2), p.stock, p.minStock])
    );
}

function exportSalesCSV() {
    downloadCSV(
        `hydralt-ventas-${todayStamp()}.csv`,
        ["N.º", "Fecha", "Cliente", "Teléfono", "Dirección", "Productos", "Pago", "Total", "Estado", "Origen"],
        sales.map(v => [
            v.id, v.date, v.customer, v.phone || "", v.address || "",
            v.items.map(i => `${i.quantity} x ${i.name}`).join(" | "),
            v.method, Number(v.total).toFixed(2), v.status, v.source
        ])
    );
}

/* Genera el código de tus productos actuales, con la imagen que muestra cada uno hoy */
function exportSeed() {
    const limpio = inventory.map(p => {
        const efectiva = p.image && !String(p.image).startsWith("data:")
            ? p.image
            : getProductImage(p).replace(/^Imagen\//, "");
        return {
            id: p.id,
            name: p.name,
            category: p.category,
            price: p.price,
            stock: p.stock,
            minStock: p.minStock,
            image: efectiva
        };
    });

    const texto = "const PRODUCTOS_INICIALES = " + JSON.stringify(limpio, null, 4) + ";";
    const area = document.getElementById("seedText");
    area.value = texto;
    area.hidden = false;
    area.focus();
    area.select();

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(
            () => showToast("Copiado. Pégalo en script.js"),
            () => showToast("Selecciona el texto y copia con Ctrl + C")
        );
    } else {
        showToast("Selecciona el texto y copia con Ctrl + C");
    }
}

/* Reemplaza el inventario de este navegador por los productos iniciales del código */
function resetToSeed() {
    if (!PRODUCTOS_INICIALES.length) {
        showToast("Todavía no pegaste los productos iniciales en script.js", true);
        return;
    }
    if (!confirm("Esto reemplaza el inventario de este navegador por los productos iniciales. ¿Continuar?")) return;

    inventory = JSON.parse(JSON.stringify(PRODUCTOS_INICIALES));
    refreshAll();
    closeModal("backupModal");
    showToast("Productos iniciales restaurados");
}

function restoreBackup(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);

            if (data.app !== "hydralt" || !Array.isArray(data.inventory) ||
                !Array.isArray(data.movements) || !Array.isArray(data.sales)) {
                throw new Error("formato");
            }

            const aviso = `Se reemplazarán los datos actuales por el respaldo del ${data.exportedAt}:\n` +
                `${data.inventory.length} productos, ${data.sales.length} ventas, ${data.movements.length} movimientos.\n\n¿Continuar?`;
            if (!confirm(aviso)) return;

            inventory = data.inventory;
            movements = data.movements;
            sales = data.sales;
            if (Array.isArray(data.claims)) {
                claims = data.claims;
                saveClaims();
                renderClaims();
            }

            refreshAll();
            closeModal("backupModal");
            showToast("Respaldo restaurado");
        } catch {
            showToast("El archivo no es un respaldo válido de Hydralt", true);
        }
    };
    reader.readAsText(file);
}

/* Crea el botón "Respaldo" en el menú del almacén y su ventana */
function ensureBackupUI() {
    const bottom = document.querySelector(".admin-sidebar-bottom");
    if (!bottom || document.getElementById("backupBtn")) return;

    const btn = document.createElement("button");
    btn.id = "backupBtn";
    btn.type = "button";
    btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-down"></i> Respaldo y Excel`;
    bottom.insertBefore(btn, bottom.firstChild);

    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.id = "backupModal";
    modal.innerHTML = `
        <div class="modal">
            <button class="modal-close" type="button" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>
            <div class="modal-header">
                <span class="modal-icon"><i class="fa-solid fa-database"></i></span>
                <div><h2>Respaldo y Excel</h2><p id="lastBackup"></p></div>
            </div>
            <div class="backup-actions">
                <button type="button" class="admin-primary-btn" id="doBackup"><i class="fa-solid fa-download"></i> Descargar respaldo completo</button>
                <button type="button" class="small-btn" id="doInventoryCSV"><i class="fa-solid fa-file-excel"></i> Exportar inventario a Excel</button>
                <button type="button" class="small-btn" id="doSalesCSV"><i class="fa-solid fa-file-excel"></i> Exportar ventas a Excel</button>
                <button type="button" class="small-btn" id="doSeed"><i class="fa-solid fa-code"></i> Copiar productos como código inicial</button>
                <button type="button" class="small-btn" id="doResetSeed"><i class="fa-solid fa-rotate-left"></i> Volver a los productos iniciales</button>
                <label class="small-btn backup-restore">
                    <i class="fa-solid fa-upload"></i> Restaurar desde un respaldo
                    <input type="file" id="restoreFile" accept=".json,application/json" hidden>
                </label>
            </div>
            <textarea id="seedText" class="seed-text" rows="8" readonly hidden></textarea>
            <p class="backup-note">Haz un respaldo cada semana y guárdalo fuera de esta computadora (correo, Drive o USB).</p>
        </div>
    `;
    document.body.appendChild(modal);

    btn.addEventListener("click", () => {
        updateLastBackupLabel();
        openModal("backupModal");
    });
    modal.querySelector(".modal-close").addEventListener("click", () => closeModal("backupModal"));
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal("backupModal"); });

    document.getElementById("doBackup").addEventListener("click", exportBackup);
    document.getElementById("doInventoryCSV").addEventListener("click", exportInventoryCSV);
    document.getElementById("doSalesCSV").addEventListener("click", exportSalesCSV);
    document.getElementById("doSeed").addEventListener("click", exportSeed);
    document.getElementById("doResetSeed").addEventListener("click", resetToSeed);
    document.getElementById("restoreFile").addEventListener("change", (e) => {
        restoreBackup(e.target.files[0]);
        e.target.value = "";
    });
}

ensureBackupUI();


/* =========================================================
   SINCRONIZACIÓN ENTRE PESTAÑAS
   Si la página está abierta en dos pestañas del mismo navegador
   (una como cliente y otra con el panel), lo que pase en una
   aparece en la otra sin recargar.
========================================================= */

window.addEventListener("storage", (e) => {
    const claves = ["hydralt_inventory", "hydralt_movements", "hydralt_sales", "hydralt_cart", "hydralt_claims"];
    if (!claves.includes(e.key)) return;

    inventory = JSON.parse(localStorage.getItem("hydralt_inventory")) || [];
    movements = JSON.parse(localStorage.getItem("hydralt_movements")) || [];
    sales = JSON.parse(localStorage.getItem("hydralt_sales")) || [];
    cart = JSON.parse(localStorage.getItem("hydralt_cart")) || [];
    claims = JSON.parse(localStorage.getItem("hydralt_claims")) || [];

    loadProductsToSlider();
    updateCartUI();
    renderDashboard();
    renderInventory();
    renderMovements();
    renderAlerts();
    renderSales();
    renderClaims();
});


/* =========================================================
   INICIALIZACIÓN
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    initProductFilters();
    loadProductsToSlider();
    updateCartUI();
    renderDashboard();
    renderInventory();
    renderMovements();
    renderAlerts();
    renderSales();
    renderClaims();
    updateAdminDate();
    updateAdminButton();
});
