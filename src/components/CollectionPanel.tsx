import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Gift, ShoppingBag, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatPrice, items, type FashionItem } from '../data/items';
import { playSoundEffect } from '../audio/soundEffects';

type CollectionPanelProps = {
  receivedItems: ReceivedItemEntry[];
  isOpening: boolean;
  hasRevealedItem: boolean;
};

export type ReceivedItemEntry = {
  receiptId: string;
  item: FashionItem;
};

type ItemImageProps = {
  item: FashionItem;
  onOpenGallery: (item: FashionItem) => void;
};

function PackItemPreview({ item, index, onOpenGallery }: ItemImageProps & { index: number }) {
  return <motion.li
    className="pack-item-preview"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * .04 }}
  >
    <button
      type="button"
      className="preview-image-button"
      onClick={() => onOpenGallery(item)}
      aria-label={`Xem ảnh chi tiết ${item.name}`}
      aria-haspopup="dialog"
    >
      <img src={item.thumbnailImage} alt={item.name} loading="lazy" decoding="async" />
    </button>
  </motion.li>;
}

function ReceivedItem({ item, onOpenGallery }: ItemImageProps) {
  const hasDiscount = item.originalPrice > item.salePrice;

  return <motion.article
    className="received-card"
    initial={{ opacity: 0, scale: .92, y: 16 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: .96, y: -8 }}
    transition={{ type: 'spring', stiffness: 260, damping: 23 }}
  >
    <div className="received-visual">
      <button
        type="button"
        className="received-image-button"
        onClick={() => onOpenGallery(item)}
        aria-label={`Xem ảnh chi tiết ${item.name}`}
        aria-haspopup="dialog"
      >
        <img src={item.image} alt={item.name} loading="lazy" decoding="async" />
      </button>
    </div>
    <div className="received-details">
      <h3>{item.name}</h3>
      <div className="received-footer">
        <p className="received-price">
          <span className="received-sale-line">
            <span className="price-coin" aria-hidden="true">◉</span>
            <span className="sale-price">{formatPrice(item.salePrice)}</span>
          </span>
          {hasDiscount && <del className="original-price">{formatPrice(item.originalPrice)}</del>}
        </p>
        {item.productUrl
          ? <a
            className="buy-now"
            href={item.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Mua ngay ${item.name} — mở trong tab mới`}
            onClick={() => playSoundEffect('packSelect')}
          >Mua ngay</a>
          : <button
            type="button"
            className="buy-now"
            disabled
            title="Sản phẩm chưa có đường dẫn mua hàng"
            aria-label={`Mua ngay ${item.name} — chưa có đường dẫn mua hàng`}
          >Mua ngay</button>}
      </div>
    </div>
  </motion.article>;
}

function ItemGalleryModal({ item, onClose }: { item: FashionItem; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const imageCount = item.galleryImages.length;
  const activeImage = item.galleryImages[activeIndex];

  const showPrevious = () => setActiveIndex(index => (index - 1 + imageCount) % imageCount);
  const showNext = () => setActiveIndex(index => (index + 1) % imageCount);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [item.id]);

  useEffect(() => {
    const navigateWithKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') showPrevious();
      if (event.key === 'ArrowRight') showNext();
    };
    window.addEventListener('keydown', navigateWithKeyboard);
    return () => window.removeEventListener('keydown', navigateWithKeyboard);
  }, [imageCount]);

  return <motion.div
    className="gallery-modal"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClose}
  >
    <motion.section
      className="gallery-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gallery-title"
      initial={{ opacity: 0, scale: .92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: .96, y: 10 }}
      transition={{ type: 'spring', stiffness: 280, damping: 25 }}
      onClick={event => event.stopPropagation()}
    >
      <header className="gallery-header">
        <div>
          <p>CHI TIẾT SẢN PHẨM</p>
          <h2 id="gallery-title">{item.name}</h2>
        </div>
        <button ref={closeButtonRef} type="button" className="gallery-close" onClick={onClose} aria-label="Đóng ảnh chi tiết">
          <X size={20} />
        </button>
      </header>
      <div className={`gallery-carousel ${imageCount === 1 ? 'single-image' : ''}`}>
        {imageCount > 1 && <button type="button" className="gallery-nav gallery-prev" onClick={showPrevious} aria-label="Xem ảnh trước">
          <ChevronLeft size={21} />
        </button>}
        <AnimatePresence mode="wait" initial={false}>
          <motion.figure
            className="gallery-image-frame"
            key={activeImage}
            initial={{ opacity: 0, scale: .975 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: .985 }}
            transition={{ duration: .2 }}
          >
            <img src={activeImage} alt={`${item.name} — ảnh chi tiết ${activeIndex + 1}`} decoding="async" />
          </motion.figure>
        </AnimatePresence>
        {imageCount > 1 && <button type="button" className="gallery-nav gallery-next" onClick={showNext} aria-label="Xem ảnh tiếp theo">
          <ChevronRight size={21} />
        </button>}
      </div>
      <footer className="gallery-footer">
        <p className="gallery-counter" aria-live="polite">{activeIndex + 1} / {imageCount}</p>
      </footer>
    </motion.section>
  </motion.div>;
}

export function CollectionPanel({ receivedItems, isOpening, hasRevealedItem }: CollectionPanelProps) {
  const [galleryItem, setGalleryItem] = useState<FashionItem | null>(null);

  useEffect(() => {
    if (!galleryItem) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setGalleryItem(null);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [galleryItem]);

  return <>
  <aside className="collection" id="collection-panel" aria-label="Thông tin pack">
    <section className="collection-section" aria-labelledby="pack-items-title">
      <header className="section-heading">
        <div className="collection-title">
          <ShoppingBag size={21} aria-hidden="true" />
          <h2 id="pack-items-title">Deal chờ xé</h2>
        </div>
        <span className="item-count">{items.length} item</span>
      </header>

      <ul className="pack-items-grid">
        {items.map((item, index) => <PackItemPreview key={item.id} item={item} index={index} onOpenGallery={setGalleryItem} />)}
      </ul>
    </section>

    <section className="collection-section received-section" aria-labelledby="received-item-title">
      <header className="section-heading">
        <div className="collection-title">
          <Gift size={21} aria-hidden="true" />
          <h2 id="received-item-title">Deal nhận được</h2>
        </div>
      </header>

      <div className={`received-container ${receivedItems.length > 0 ? 'has-item' : ''}`} aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {receivedItems.length > 0
            ? <motion.div className="received-items-list" key="received-items">
              {receivedItems.map(entry => <ReceivedItem
                key={entry.receiptId}
                item={entry.item}
                onOpenGallery={setGalleryItem}
              />)}
            </motion.div>
            : <motion.div
              key={isOpening ? 'opening' : 'empty'}
              className="received-placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Gift size={31} aria-hidden="true" />
              <p>{isOpening
                ? 'Pack đang được mở...'
                : hasRevealedItem
                  ? 'Deal đang được thêm tự động...'
                  : 'Mở pack để khám phá deal của bạn'}</p>
            </motion.div>}
        </AnimatePresence>
      </div>
    </section>
  </aside>
  <AnimatePresence>
    {galleryItem && <ItemGalleryModal item={galleryItem} onClose={() => setGalleryItem(null)} />}
  </AnimatePresence>
  </>;
}
