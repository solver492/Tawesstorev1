import React, { useEffect, useMemo, useState } from "react";
import { getCategories, getProductMedia, getProducts, groupMediaByProduct, hasSupabaseConfig } from "./lib/supabase";
import WhatsAppButton from "./components/WhatsAppButton";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  wholesalePrice: number;
  oldPrice: number;
  unit: string;
  stock: number;
  minOrder: number;
  lotQuantity?: number;
  image: string;
  description: string;
  images?: string[];
  videoUrl?: string;
};

type RemoteProduct = Record<string, unknown>;

const demoProducts: Product[] = [
  { id: "demo-1", name: "Smartphone Nova X", category: "Téléphones", price: 2499, wholesalePrice: 2199, oldPrice: 2899, unit: "pièce", stock: 42, minOrder: 1, image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=85", description: "Un smartphone élégant et rapide pour rester connecté toute la journée." },
  { id: "demo-2", name: "Casque sans fil Pulse", category: "Électronique", price: 349, wholesalePrice: 289, oldPrice: 499, unit: "pièce", stock: 86, minOrder: 5, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85", description: "Son immersif, réduction de bruit et autonomie longue durée." },
  { id: "demo-3", name: "Sac à dos Urban", category: "Mode", price: 299, wholesalePrice: 229, oldPrice: 399, unit: "pièce", stock: 64, minOrder: 10, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85", description: "Un sac résistant et pratique pour le travail, les études ou les voyages." },
  { id: "demo-4", name: "Lampe LED Studio", category: "Maison", price: 179, wholesalePrice: 139, oldPrice: 249, unit: "pièce", stock: 31, minOrder: 8, image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85", description: "Éclairage doux et moderne pour donner du caractère à votre intérieur." },
  { id: "demo-5", name: "Pack soins essentiels", category: "Beauté", price: 459, wholesalePrice: 379, oldPrice: 599, unit: "pack", stock: 25, minOrder: 6, image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=85", description: "Une sélection quotidienne pour prendre soin de soi simplement." },
  { id: "demo-6", name: "Mixeur Kitchen Pro", category: "Électroménager", price: 699, wholesalePrice: 579, oldPrice: 899, unit: "pièce", stock: 18, minOrder: 3, image: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=900&q=85", description: "Puissant, compact et pensé pour les recettes du quotidien." },
  { id: "demo-7", name: "Sneakers Street One", category: "Mode", price: 549, wholesalePrice: 449, oldPrice: 749, unit: "paire", stock: 47, minOrder: 5, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85", description: "Le confort et le style pour accompagner tous vos déplacements." },
  { id: "demo-8", name: "Chaise bureau Confort", category: "Maison", price: 1299, wholesalePrice: 1099, oldPrice: 1599, unit: "pièce", stock: 12, minOrder: 2, image: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=900&q=85", description: "Une assise confortable et un soutien adapté aux longues journées." }
];
const money = (value: unknown) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "MAD", maximumFractionDigits: 0 }).format(Number(value) || 0);
const textValue = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value : fallback;
const numberValue = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const normalizeProduct = (item: RemoteProduct, index: number, media: Record<string, { media_type: string; media_url: string }[]> = {}): Product => {
  const images = Array.isArray(item.images) ? item.images : [];
  const imageCandidate = [item.image_url, item.image, item.thumbnail, images[0]]
    .find((candidate): candidate is string => typeof candidate === "string" && candidate.length > 0);
  const isLot = item.is_lot === true;
  const rows = media[String(item.id)] || [];
  // product_media fait foi pour le carousel et la video : il porte l'ordre
  // d'affichage, alors que products.images n'est qu'une liste de secours.
  const carousel = rows.filter((m) => m.media_type === "image").map((m) => m.media_url);
  const vimeo = rows.find((m) => m.media_type === "vimeo");
  return {
    id: String(item.id || item.uuid || "supabase-" + index),
    name: textValue(item.name || item.title || item.product_name, "Produit Tawes Store"),
    description: textValue(item.description || item.details, "Produit disponible sur Tawes Store."),
    category: textValue(item.category_name || item.category_full_name || item.category || item.type, "Autres"),
    price: numberValue(item.suggested_sale_price || item.price || item.retail_price || item.sale_price || item.wholesale_price),
    wholesalePrice: numberValue(item.wholesale_price || item.lot_unit_price || item.bulk_price || item.grossiste_price),
    oldPrice: numberValue(item.old_price || item.compare_at_price),
    unit: isLot ? "lot" : textValue(item.unit, "pièce"),
    stock: numberValue(item.stock || item.quantity),
    minOrder: isLot ? 1 : numberValue(item.min_order || item.minimum_order_quantity, 1),
    lotQuantity: isLot ? numberValue(item.lot_quantity) : 0,
    image: carousel[0] || imageCandidate || demoProducts[index % demoProducts.length].image,
    images: carousel.length > 1 ? carousel : undefined,
    videoUrl: vimeo ? vimeo.media_url : undefined,
  };
};

/** Galerie multi-images d'un produit. */
function Carousel({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  useEffect(() => { setIndex(0); }, [alt]);
  if (images.length <= 1) {
    return <img className="carousel-main" src={images[0]} alt={alt} />;
  }
  const go = (delta: number) => setIndex((i) => (i + delta + images.length) % images.length);
  return (
    <div className="carousel">
      <img className="carousel-main" src={images[index]} alt={`${alt} — image ${index + 1}/${images.length}`} />
      <button type="button" className="carousel-prev" onClick={() => go(-1)} aria-label="Image précédente">‹</button>
      <button type="button" className="carousel-next" onClick={() => go(1)} aria-label="Image suivante">›</button>
      <div className="carousel-dots">
        {images.map((src, i) => (
          <button key={src} type="button" className={i === index ? "active" : ""} onClick={() => setIndex(i)} aria-label={`Image ${i + 1}`} />
        ))}
      </div>
      <span className="carousel-count">{index + 1} / {images.length}</span>
    </div>
  );
}

/** Lecteur video : iframe Vimeo pour les produits ayant une video diffusee. */
function ProductVideo({ url, title }: { url: string; title: string }) {
  const id = /video\/(\d+)/.exec(url)?.[1];
  if (!id) return null;
  return (
    <div className="product-video">
      <iframe
        src={`https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0&dnt=1`}
        title={`Vidéo — ${title}`}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
function App() {
  const [mode, setMode] = useState("detail"); const [products, setProducts] = useState<Product[]>(demoProducts); const [categories, setCategories] = useState<string[]>([]); const [search, setSearch] = useState(""); const [category, setCategory] = useState("Tous"); const [selectedProduct, setSelectedProduct] = useState<Product | null>(null); const [whatsAppProduct, setWhatsAppProduct] = useState<Product | null>(null); const [cartCount, setCartCount] = useState(0); const [loading, setLoading] = useState(true); const [usingDemo, setUsingDemo] = useState(true);
  useEffect(() => { let active = true; Promise.all([getProducts(), getCategories()]).then(async ([remoteProducts, remoteCategories]) => { if (!active) return; if (remoteProducts.length) { const ids = remoteProducts.map((item, i) => String(item.id || item.uuid || "supabase-" + i)); const mediaRows = await getProductMedia(ids); if (!active) return; const media = groupMediaByProduct(mediaRows); setProducts(remoteProducts.map((item, i) => normalizeProduct(item, i, media))); setUsingDemo(false); } setCategories(remoteCategories.map((item) => typeof item === "string" ? item : textValue(item.name || item.title || item.label, "")).filter(Boolean)); setLoading(false); }).catch(() => active && setLoading(false)); return () => { active = false; }; }, []);
  const allCategories = useMemo(() => ["Tous", ...new Set([...categories, ...products.map((product) => product.category)])], [categories, products]);
  const visibleProducts = useMemo(() => products.filter((product) => (product.name + " " + product.category).toLowerCase().includes(search.toLowerCase()) && (category === "Tous" || product.category === category)), [products, search, category]);
  const addToCart = () => setCartCount((count) => count + 1); const scrollToCatalog = () => document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" });
  return <div className="app-shell">
    <div className="announcement"><span>✦</span> Livraison fiable, prix justes, commerce local <strong>avec Tawes Store</strong></div>
    <header className="topbar"><div className="nav-wrap"><a className="brand" href="#top" aria-label="Tawes Store accueil"><span className="brand-mark">T</span><span>Tawes<span className="brand-accent">Store</span></span></a><div className="search-box"><span className="search-icon">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un produit, une marque..." aria-label="Rechercher" /><button onClick={scrollToCatalog}>Rechercher</button></div><div className="nav-actions"><button className="account-link">♙ <span>Mon compte</span></button><button className="cart-button" onClick={() => alert("Votre panier contient " + cartCount + " article(s).")}>♧ <span>Panier</span><b>{cartCount}</b></button></div></div><div className="mobile-search search-box"><span className="search-icon">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher..." aria-label="Rechercher" /></div></header>
    <nav className="secondary-nav"><div className="nav-wrap"><button onClick={scrollToCatalog}>☰ <span>Catégories</span></button><a href="#catalogue">Nouveautés</a><a href="#grossiste">Espace grossiste</a><a href="#avantages">Nos avantages</a><span className="nav-note">Paiement à la livraison disponible</span></div></nav>
    <main id="top"><section className="hero nav-wrap"><div className="hero-copy"><div className="eyebrow">LA NOUVELLE FAÇON D’ACHETER</div><h1>Tout ce qu’il vous faut.<br /><em>Au bon prix.</em></h1><p>Découvrez une sélection pensée pour votre quotidien, avec des offres claires pour les particuliers comme pour les revendeurs.</p><button className="primary-button" onClick={scrollToCatalog}>Découvrir le catalogue <span>→</span></button><div className="trust-row"><span>✓ Produits sélectionnés</span><span>✓ Livraison au Maroc</span></div></div><div className="hero-visual"><div className="hero-orbit orbit-one"></div><div className="hero-orbit orbit-two"></div><div className="hero-card hero-card-back"><span>OFFRE DU JOUR</span><strong>-30%</strong></div><div className="hero-card hero-card-main"><img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=85" alt="Montre Tawes Store" /><div><small>COLLECTION SIGNATURE</small><strong>Des choix qui durent.</strong></div></div><div className="hero-badge"><b>4.9</b><span>★ ★ ★ ★ ★<br /><small>avis clients</small></span></div></div></section>
    <section className="mode-switcher nav-wrap" id="catalogue"><div><span className="section-kicker">SHOPPING ADAPTÉ À VOTRE BESOIN</span><h2>Choisissez votre expérience</h2></div><div className="mode-tabs"><button className={mode === "detail" ? "active" : ""} onClick={() => setMode("detail")}>Achat au détail <small>Pour vous</small></button><button className={mode === "wholesale" ? "active wholesale-active" : ""} onClick={() => setMode("wholesale")}>Achat en gros <small>Pour revendeurs</small></button></div></section>
    {mode === "wholesale" && <section className="wholesale-banner nav-wrap" id="grossiste"><div className="wholesale-icon">▦</div><div><strong>Votre activité mérite de meilleurs prix.</strong><p>Accédez aux tarifs grossiste, aux minimums de commande et à une sélection faite pour revendre.</p></div><button className="outline-button">Devenir revendeur →</button></section>}
    <section className="catalog-section nav-wrap"><div className="catalog-head"><div><span className="section-kicker">{mode === "wholesale" ? "TARIFS REVENDEURS" : "POUR VOUS"}</span><h2>{mode === "wholesale" ? "Les essentiels à prix grossiste" : "Nos produits du moment"}</h2></div><span className="result-count">{visibleProducts.length} produits</span></div><div className="category-row">{allCategories.map((item) => <button key={item} className={category === item ? "selected" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="data-note">{loading ? "Synchronisation avec votre catalogue..." : usingDemo && hasSupabaseConfig ? "Votre catalogue Supabase est prêt : ajoutez des produits dans products pour les afficher ici." : usingDemo ? "Mode aperçu : renseignez la clé Supabase pour synchroniser votre catalogue." : "Catalogue synchronisé avec Supabase"}</div><div className="product-grid">{visibleProducts.map((product) => <article className="product-card" key={product.id} onClick={() => setSelectedProduct(product)}><div className="product-image"><img src={product.image} alt={product.name} /><span className="heart">♡</span>{product.videoUrl && <span className="media-tag">▶ vidéo</span>}{!product.videoUrl && product.images && product.images.length > 1 && <span className="media-tag">{product.images.length} images</span>}{product.oldPrice > product.price && <span className="discount">-{Math.round((1 - product.price / product.oldPrice) * 100)}%</span>}</div>
<div className="product-info"><span className="product-category">{product.category}</span><h3>{product.name}</h3><div className="rating">★★★★★ <span>(24)</span></div><div className="price-row"><strong>{money(mode === "wholesale" ? product.wholesalePrice : product.price)}</strong>{product.oldPrice > product.price && <del>{money(product.oldPrice)}</del>}</div>{mode === "wholesale" && <div className="minimum">Min. {product.minOrder} {product.unit}(s)</div>}<button className="add-button" onClick={(event) => { event.stopPropagation(); addToCart(); }}>{mode === "wholesale" ? "Ajouter au devis" : "Ajouter au panier"} <span>+</span></button></div></article>)}</div></section>
    <section className="benefits nav-wrap" id="avantages"><div><span className="benefit-icon">◈</span><strong>Qualité choisie</strong><p>Des produits vérifiés avec soin.</p></div><div><span className="benefit-icon">⌁</span><strong>Livraison simple</strong><p>Suivez votre commande sereinement.</p></div><div><span className="benefit-icon">◎</span><strong>Prix transparents</strong><p>Pas de mauvaise surprise.</p></div><div><span className="benefit-icon">♧</span><strong>Support humain</strong><p>Une équipe à votre écoute.</p></div></section></main>
    <footer><div className="nav-wrap footer-main"><div><a className="brand footer-brand" href="#top"><span className="brand-mark">T</span><span>Tawes<span className="brand-accent">Store</span></span></a><p>Une marketplace pensée pour acheter mieux, au détail comme en gros.</p></div><div><h4>Tawes Store</h4><a href="#catalogue">Notre catalogue</a><a href="#grossiste">Espace grossiste</a><a href="#avantages">Nos avantages</a></div><div><h4>Besoin d'aide ?</h4><a href="mailto:bonjour@tawes-store.com">Nous contacter</a><a href="#top">Livraison & retours</a><a href="#top">Questions fréquentes</a></div><div><h4>Restez informé</h4><p>Recevez nos nouveautés et offres.</p><div className="newsletter"><input placeholder="Votre adresse email" /><button>→</button></div></div></div><div className="footer-bottom nav-wrap"><span>© 2026 Tawes Store. Tous droits réservés.</span><span>Commerce en ligne, simplement.</span></div></footer>
    {selectedProduct && <div className="modal-backdrop" onClick={() => setSelectedProduct(null)}><div className="product-modal" onClick={(event) => event.stopPropagation()}><button className="close-modal" onClick={() => setSelectedProduct(null)}>×</button>{selectedProduct.videoUrl ? <ProductVideo url={selectedProduct.videoUrl} title={selectedProduct.name} /> : <Carousel images={selectedProduct.images?.length ? selectedProduct.images : [selectedProduct.image]} alt={selectedProduct.name} />}<div className="modal-content"><span className="product-category">{selectedProduct.category}</span><h2>{selectedProduct.name}</h2>
<div className="rating">★★★★★ <span>Produit disponible</span></div><p>{selectedProduct.description}</p><div className="modal-price"><strong>{money(mode === "wholesale" ? selectedProduct.wholesalePrice : selectedProduct.price)}</strong>{selectedProduct.oldPrice > selectedProduct.price && <del>{money(selectedProduct.oldPrice)}</del>}</div>{mode === "wholesale" && <p className="minimum">Commande minimale : {selectedProduct.minOrder} {selectedProduct.unit}(s){selectedProduct.lotQuantity ? ` — lot de ${selectedProduct.lotQuantity} articles` : ""}</p>}<button className="primary-button full-button" onClick={() => { addToCart(); setSelectedProduct(null); }}>Ajouter au panier <span>→</span></button><button className="primary-button full-button" style={{ background: "#25d366", marginTop: 10 }} onClick={() => { setWhatsAppProduct(selectedProduct); setSelectedProduct(null); }}>Commander sur WhatsApp <span>→</span></button></div></div></div>}
    <WhatsAppButton productName={whatsAppProduct?.name} productPrice={whatsAppProduct ? (mode === "wholesale" ? whatsAppProduct.wholesalePrice : whatsAppProduct.price) : undefined} />
  </div>;
}
export default App;
