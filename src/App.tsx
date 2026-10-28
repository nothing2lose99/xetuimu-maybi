import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ClipboardList, Share2, X } from 'lucide-react';
import { CollectionPanel, type ReceivedItemEntry } from './components/CollectionPanel';
import { PackBackground } from './components/PackBackground';
import { PackScene } from './components/PackScene';
import { formatPrice, items } from './data/items';
import { assetUrl } from './utils/assetUrl';

const PACK_OPEN_ANIMATION_MS = 1300;
const REVEAL_AUTO_CLAIM_MS = 2000;
const REVEAL_EXIT_ANIMATION_MS = 420;
const PACKS_PER_ROUND = 3;
const EXTRA_PACKS_PER_REWARD = 1;
const START_SCREEN_ENABLED = true;
const RECEIVED_ITEMS_STORAGE_KEY = 'maybi.received-items.v1';
const PACK_ALLOWANCE_STORAGE_KEY = 'maybi.pack-allowance.v1';
const SURVEY_PACKS_UNLOCKED_STORAGE_KEY = 'maybi.survey-packs-unlocked.v1';
const SURVEY_URL = 'https://forms.gle/4mfvB7hZFzFdqenSA';
let receiptSequence = 0;

type StoredReceivedItem = {
    receiptId: string;
    itemId: number;
};

function isStoredReceivedItem(value: unknown): value is StoredReceivedItem {
    if (typeof value !== 'object' || value === null) return false;
    const entry = value as Partial<StoredReceivedItem>;
    return typeof entry.receiptId === 'string' && typeof entry.itemId === 'number';
}

function loadReceivedItems(): ReceivedItemEntry[] {
    try {
        const savedItems: unknown = JSON.parse(localStorage.getItem(RECEIVED_ITEMS_STORAGE_KEY) ?? '[]');
        if (!Array.isArray(savedItems)) return [];
        return savedItems.flatMap(savedItem => {
            if (!isStoredReceivedItem(savedItem)) return [];
            const item = items.find(candidate => candidate.id === savedItem.itemId);
            return item ? [{ receiptId: savedItem.receiptId, item }] : [];
        });
    } catch {
        return [];
    }
}

function createReceiptId(itemId: number) {
    receiptSequence += 1;
    return `${Date.now()}-${itemId}-${receiptSequence}`;
}

function loadRemainingPacks() {
    try {
        const savedValue = localStorage.getItem(PACK_ALLOWANCE_STORAGE_KEY);
        if (savedValue === null) return PACKS_PER_ROUND;
        const savedAllowance = Number(savedValue);
        return Number.isInteger(savedAllowance) && savedAllowance >= 0 && savedAllowance <= PACKS_PER_ROUND
            ? savedAllowance
            : PACKS_PER_ROUND;
    } catch {
        return PACKS_PER_ROUND;
    }
}

function loadSurveyPacksUnlocked() {
    try {
        return localStorage.getItem(SURVEY_PACKS_UNLOCKED_STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
}

function pickUnownedItem(receivedItems: ReceivedItemEntry[]) {
    const receivedItemIds = new Set(receivedItems.map(entry => entry.item.id));
    const pool = items.filter(item => !receivedItemIds.has(item.id));
    return pool[Math.floor(Math.random() * pool.length)];
}

export default function App() {
    const [hasStarted, setHasStarted] = useState(!START_SCREEN_ENABLED);
    const [ripReady, setRipReady] = useState(false);
    const [opening, setOpening] = useState(false);
    const [revealedItem, setRevealedItem] = useState<ReceivedItemEntry | null>(null);
    const [claimingItem, setClaimingItem] = useState(false);
    const [receivedItems, setReceivedItems] = useState<ReceivedItemEntry[]>(loadReceivedItems);
    const [remainingPacks, setRemainingPacks] = useState(loadRemainingPacks);
    const [surveyPacksUnlocked, setSurveyPacksUnlocked] = useState(loadSurveyPacksUnlocked);
    const [limitDialogOpen, setLimitDialogOpen] = useState(false);
    const [scrollGuideVisible, setScrollGuideVisible] = useState(false);
    const timerIds = useRef<number[]>([]);
    const receivedItemIds = new Set(receivedItems.map(entry => entry.item.id));
    const collectionComplete = items.every(item => receivedItemIds.has(item.id));

    useEffect(() => () => timerIds.current.forEach(window.clearTimeout), []);

    useEffect(() => {
        try {
            const storedItems: StoredReceivedItem[] = receivedItems.map(entry => ({
                receiptId: entry.receiptId,
                itemId: entry.item.id,
            }));
            localStorage.setItem(RECEIVED_ITEMS_STORAGE_KEY, JSON.stringify(storedItems));
        } catch {
            // The game remains usable if storage is unavailable or blocked by the browser.
        }
    }, [receivedItems]);

    useEffect(() => {
        try {
            localStorage.setItem(PACK_ALLOWANCE_STORAGE_KEY, String(remainingPacks));
        } catch {
            // The current session still enforces the allowance when storage is unavailable.
        }
    }, [remainingPacks]);

    useEffect(() => {
        try {
            localStorage.setItem(SURVEY_PACKS_UNLOCKED_STORAGE_KEY, String(surveyPacksUnlocked));
        } catch {
            // The current session still remembers the survey reward when storage is unavailable.
        }
    }, [surveyPacksUnlocked]);

    useEffect(() => {
        if (!limitDialogOpen) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setLimitDialogOpen(false);
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [limitDialogOpen]);

    useEffect(() => {
        if (!scrollGuideVisible) return;
        const hideGuideAfterScroll = () => {
            if (window.scrollY > 100) setScrollGuideVisible(false);
        };
        window.addEventListener('scroll', hideGuideAfterScroll, { passive: true });
        return () => window.removeEventListener('scroll', hideGuideAfterScroll);
    }, [scrollGuideVisible]);

    const schedule = (callback: () => void, delay: number) => {
        const timerId = window.setTimeout(() => {
            timerIds.current = timerIds.current.filter(id => id !== timerId);
            callback();
        }, delay);
        timerIds.current.push(timerId);
    };

    const activateRip = () => {
        if (opening || ripReady || revealedItem) return;
        if (collectionComplete) return;
        if (remainingPacks === 0) {
            setLimitDialogOpen(true);
            return;
        }
        setRipReady(true);
    };

    const openPack = () => {
        if (opening || !ripReady || remainingPacks === 0 || collectionComplete || revealedItem) return;
        const remainingAfterOpen = remainingPacks - 1;
        setRipReady(false);
        setOpening(true);
        setRemainingPacks(remainingAfterOpen);
        playRevealTone();

        schedule(() => {
            const item = pickUnownedItem(receivedItems);
            if (!item) {
                setRemainingPacks(current => Math.min(PACKS_PER_ROUND, current + 1));
                setOpening(false);
                return;
            }
            const revealedEntry = { receiptId: createReceiptId(item.id), item };
            const completesCollection = receivedItemIds.size + 1 >= items.length;
            setRevealedItem(revealedEntry);
            if (window.matchMedia('(max-width: 680px)').matches && window.scrollY <= 100) setScrollGuideVisible(true);
            setOpening(false);
            schedule(() => setClaimingItem(true), REVEAL_AUTO_CLAIM_MS - REVEAL_EXIT_ANIMATION_MS);
            schedule(() => {
                setReceivedItems(current => [revealedEntry, ...current]);
                setRevealedItem(null);
                setClaimingItem(false);
                if (remainingAfterOpen === 0 && !completesCollection) setLimitDialogOpen(true);
            }, REVEAL_AUTO_CLAIM_MS);
        }, PACK_OPEN_ANIMATION_MS);
    };

    const shareOnFacebook = () => {
        const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
        setRemainingPacks(current => Math.min(PACKS_PER_ROUND, current + EXTRA_PACKS_PER_REWARD));
        setLimitDialogOpen(false);
        setRipReady(false);
    };

    const openSurvey = () => {
        window.open(SURVEY_URL, '_blank', 'noopener,noreferrer');
        setSurveyPacksUnlocked(true);
        setRemainingPacks(current => Math.min(PACKS_PER_ROUND, current + EXTRA_PACKS_PER_REWARD));
        setLimitDialogOpen(false);
        setRipReady(false);
    };

    const outOfPacks = remainingPacks === 0;
    const shouldOpenSurvey = outOfPacks && !surveyPacksUnlocked && !collectionComplete;
    const shouldShare = outOfPacks && surveyPacksUnlocked && !collectionComplete;

    if (!hasStarted) return <StartScreen onStart={() => setHasStarted(true)} />;

    return <main className="app">
        <img src={assetUrl('assets/logo-maybi-white.webp')} className="app-brand-logo" alt="MAYBI" />
        <section className="stage">
            <PackBackground />
            <div className="pack-head">
                <h1><span>✦</span> XÉ TÚI MÙ NHẬN DEAL 199K <span>✦</span></h1>
                {/* <p className="tagline">Khám phá phong cách của bạn ♡</p> */}
            </div>
            {!revealedItem && <PackScene opening={opening} ripReady={ripReady} onRipComplete={openPack} />}
            {revealedItem && <motion.div
                className="revealed-item"
                role="status"
                aria-label={`${revealedItem.item.name} đang được thêm vào Deal nhận được`}
                initial={{ opacity: 0, scale: .62, rotate: -5, y: 24 }}
                transformTemplate={(_, generatedTransform) => `translate(-50%, -50%) ${generatedTransform}`}
                animate={claimingItem
                    ? window.matchMedia('(max-width: 680px)').matches
                        ? { opacity: 0, scale: .68, x: 0, y: '45vh', rotate: 7 }
                        : { opacity: 0, scale: .68, x: '42vw', rotate: 7 }
                    : { opacity: 1, scale: 1, x: 0, rotate: 0, y: [0, -8, 0] }}
                transition={claimingItem
                    ? { duration: .45, ease: 'easeInOut' }
                    : { opacity: { duration: .24 }, scale: { type: 'spring', stiffness: 230, damping: 18 }, y: { repeat: Infinity, duration: 2.7, ease: 'easeInOut' } }}
            >
                <span className="revealed-card">
                    <span className="revealed-card-visual">
                        <img src={revealedItem.item.image} alt={revealedItem.item.name} decoding="async" />
                    </span>
                    <span className="revealed-card-details">
                        <span className="revealed-card-title">{revealedItem.item.name}</span>
                        <span className="revealed-card-footer">
                            <span className="revealed-card-price">
                                <span className="revealed-card-sale">
                                    <span className="price-coin" aria-hidden="true">◉</span>
                                    <span className="sale-price">{formatPrice(revealedItem.item.salePrice)}</span>
                                </span>
                                {revealedItem.item.originalPrice > revealedItem.item.salePrice &&
                                    <del className="original-price">{formatPrice(revealedItem.item.originalPrice)}</del>}
                            </span>
                        </span>
                    </span>
                </span>
                <span className="revealed-item-prompt">Đang thêm vào Deal nhận được...</span>
            </motion.div>}
            <div className="stage-controls">
                {!ripReady && !revealedItem && <button className={`primary ${shouldOpenSurvey || shouldShare ? 'share-primary' : ''}`} disabled={opening || collectionComplete} onClick={shouldOpenSurvey ? openSurvey : shouldShare ? shareOnFacebook : activateRip}>
                    {shouldOpenSurvey && !opening ? <ClipboardList size={20} /> : shouldShare && !opening ? <Share2 size={20} /> : null}
                    {opening ? 'Đang mở...' : collectionComplete ? `Đã nhận đủ ${items.length} item` : shouldOpenSurvey ? 'Làm khảo sát' : shouldShare ? 'Share ngay' : 'XÉ NGAY'}
                </button>}
               
            </div>
        </section>

        <CollectionPanel receivedItems={receivedItems} isOpening={opening} hasRevealedItem={Boolean(revealedItem)} />

        {scrollGuideVisible && <button
            className="scroll-guide"
            type="button"
            aria-label="Cuộn xuống Deal nhận được"
            onClick={() => {
                document.getElementById('collection-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setScrollGuideVisible(false);
            }}
        ><ArrowDown size={25} aria-hidden="true" /></button>}

        {limitDialogOpen && <div className="pack-limit-overlay" onClick={() => setLimitDialogOpen(false)}>
            <section
                className="pack-limit-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="pack-limit-title"
                aria-describedby="pack-limit-description"
                onClick={event => event.stopPropagation()}
            >
                <button className="pack-limit-close" type="button" onClick={() => setLimitDialogOpen(false)} aria-label="Đóng">
                    <X size={17} />
                </button>
                <span className="pack-limit-icon" aria-hidden="true">{shouldOpenSurvey ? <ClipboardList size={22} /> : <Share2 size={22} />}</span>
                <h2 id="pack-limit-title">{shouldOpenSurvey ? 'HẾT LƯỢT!' : 'Hết lượt hôm nay!'}</h2>
                <p id="pack-limit-description">{shouldOpenSurvey
                    ? 'Làm khảo sát để nhận thêm 1 lượt'
                    : 'Share Minigame để nhận thêm lượt'}</p>
                <button className="pack-limit-share" type="button" onClick={shouldOpenSurvey ? openSurvey : shareOnFacebook} autoFocus>
                    {shouldOpenSurvey ? 'Khảo sát' : <><Share2 size={17} />Share ngay</>}
                </button>
            </section>
        </div>}
    </main>;
}

function StartScreen({ onStart }: { onStart: () => void }) {
    const startScreenAssetStyle = {
        '--start-screen-background-desktop': `url("${assetUrl('assets/tui-mu-maybi-start-screen-clean.webp')}")`,
        '--start-screen-background-mobile': `url("${assetUrl('assets/tui-mu-maybi-start-screen-mobile-clean.webp')}")`,
    } as CSSProperties;

    return <main className="start-screen" aria-labelledby="start-screen-title" style={startScreenAssetStyle}>
        <h1 className="visually-hidden" id="start-screen-title">MAYBI — Blind Pack Thời Trang Xé Túi Mù</h1>
        <div className="start-screen-heading">
            <img className="start-screen-logo" src={assetUrl('assets/logo-maybi-white.webp')} alt="MAYBI" />
        </div>
        <picture className="start-screen-art" aria-hidden="true">
            <source media="(max-width: 680px)" srcSet={assetUrl('assets/tui-mu-maybi-start-screen-mobile-clean.webp')} />
            <img src={assetUrl('assets/tui-mu-maybi-start-screen-clean.webp')} alt="" fetchPriority="high" decoding="async" />
        </picture>
        <div className="start-screen-sparkles" aria-hidden="true">
            <span className="scene-sparkle scene-sparkle-one" />
            <span className="scene-sparkle scene-sparkle-two" />
            <span className="scene-sparkle scene-sparkle-three" />
            <span className="scene-sparkle scene-sparkle-four" />
            <span className="scene-sparkle scene-sparkle-five" />
            <span className="scene-sparkle scene-sparkle-six" />
            <span className="scene-sparkle scene-sparkle-seven" />
            <span className="scene-sparkle scene-sparkle-eight" />
            <span className="scene-sparkle scene-sparkle-nine" />
            <span className="scene-sparkle scene-sparkle-ten" />
        </div>
        <div className="start-screen-gems" aria-hidden="true">
            <img className="start-screen-gem start-screen-gem-one" src={assetUrl('assets/start-screen-diamond.webp')} alt="" />
            <img className="start-screen-gem start-screen-gem-two" src={assetUrl('assets/start-screen-heart.webp')} alt="" />
            <img className="start-screen-gem start-screen-gem-three" src={assetUrl('assets/start-screen-diamond.webp')} alt="" />
            <img className="start-screen-gem start-screen-gem-four" src={assetUrl('assets/start-screen-heart.webp')} alt="" />
            <img className="start-screen-gem start-screen-gem-five" src={assetUrl('assets/start-screen-diamond.webp')} alt="" />
            <img className="start-screen-gem start-screen-gem-six" src={assetUrl('assets/start-screen-heart.webp')} alt="" />
        </div>
        <div className="start-screen-pack" aria-hidden="true">
            <img src={assetUrl('assets/maybi-pack-refix-text.webp')} alt="" />
        </div>
        <button className="start-button" type="button" onClick={onStart}>
            PLAY NOW
        </button>
    </main>;
}

function playRevealTone() {
    try {
        const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const context = new AudioContextClass();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.frequency.setValueAtTime(260, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + .45);
        gain.gain.setValueAtTime(.05, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .55);
        oscillator.start();
        oscillator.stop(context.currentTime + .6);
        oscillator.addEventListener('ended', () => void context.close());
    } catch {
        // Audio is an enhancement; pack opening must still work when the browser blocks it.
    }
}
