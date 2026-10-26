import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Box, ClipboardList, Share2, X } from 'lucide-react';
import { CollectionPanel, type ReceivedItemEntry } from './components/CollectionPanel';
import { PackBackground } from './components/PackBackground';
import { PackScene } from './components/PackScene';
import { formatPrice, items } from './data/items';
import { assetUrl } from './utils/assetUrl';

const PACK_OPEN_ANIMATION_MS = 1300;
const REVEAL_AUTO_CLAIM_MS = 2000;
const REVEAL_EXIT_ANIMATION_MS = 420;
const PACKS_PER_ROUND = 3;
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
        setRemainingPacks(PACKS_PER_ROUND);
        setLimitDialogOpen(false);
        setRipReady(false);
    };

    const openSurvey = () => {
        window.open(SURVEY_URL, '_blank', 'noopener,noreferrer');
        setSurveyPacksUnlocked(true);
        setRemainingPacks(PACKS_PER_ROUND);
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
                <p className="eyebrow">BLIND PACK THỜI TRANG</p>
                <h1><span>✦</span> XÉ TÚI MÙ <span>✦</span></h1>
                {/* <p className="tagline">Khám phá phong cách của bạn ♡</p> */}
                {!ripReady && <div className="pack-meta"><span className="pill"><Box size={15} />1 món / 1 pack</span></div>}
            </div>
            {!revealedItem && <PackScene opening={opening} ripReady={ripReady} onRipComplete={openPack} />}
            {revealedItem && <motion.div
                className="revealed-item"
                role="status"
                aria-label={`${revealedItem.item.name} đang được thêm vào Item nhận được`}
                initial={{ opacity: 0, scale: .62, rotate: -5, y: 24 }}
                transformTemplate={(_, generatedTransform) => `translate(-50%, -50%) ${generatedTransform}`}
                animate={claimingItem
                    ? { opacity: 0, scale: .68, x: '42vw', rotate: 7 }
                    : { opacity: 1, scale: 1, x: 0, rotate: 0, y: [0, -8, 0] }}
                transition={claimingItem
                    ? { duration: .45, ease: 'easeInOut' }
                    : { opacity: { duration: .24 }, scale: { type: 'spring', stiffness: 230, damping: 18 }, y: { repeat: Infinity, duration: 2.7, ease: 'easeInOut' } }}
            >
                <span className="revealed-card">
                    <span className="revealed-card-visual">
                        <img src={revealedItem.item.image} alt={revealedItem.item.name} />
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
                <span className="revealed-item-prompt">Đang thêm vào Item nhận được...</span>
            </motion.div>}
            <div className="stage-controls">
                {!ripReady && !revealedItem && <button className={`primary ${shouldOpenSurvey || shouldShare ? 'share-primary' : ''}`} disabled={opening || collectionComplete} onClick={shouldOpenSurvey ? openSurvey : shouldShare ? shareOnFacebook : activateRip}>
                    {shouldOpenSurvey && !opening ? <ClipboardList size={20} /> : shouldShare && !opening ? <Share2 size={20} /> : <Box size={20} />}
                    {opening ? 'Đang mở...' : collectionComplete ? 'Đã nhận đủ 8 item' : shouldOpenSurvey ? 'Làm khảo sát' : shouldShare ? 'Share ngay' : 'Mở pack ngay'}
                </button>}
               
            </div>
        </section>

        <CollectionPanel receivedItems={receivedItems} isOpening={opening} hasRevealedItem={Boolean(revealedItem)} />

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
                <p className="pack-limit-kicker">GIỚI HẠN LƯỢT MỞ</p>
                <h2 id="pack-limit-title">Quá giới hạn 3 pack</h2>
                <p id="pack-limit-description">{shouldOpenSurvey
                    ? 'Làm khảo sát để nhận thêm 3 pack.'
                    : 'Share Facebook để nhận thêm 3 pack.'}</p>
                <button className="pack-limit-share" type="button" onClick={shouldOpenSurvey ? openSurvey : shareOnFacebook} autoFocus>
                    {shouldOpenSurvey ? <ClipboardList size={17} /> : <Share2 size={17} />}
                    {shouldOpenSurvey ? 'Làm khảo sát' : 'Share ngay'}
                </button>
            </section>
        </div>}
    </main>;
}

function StartScreen({ onStart }: { onStart: () => void }) {
    return <main className="start-screen" aria-labelledby="start-screen-title">
        <h1 className="visually-hidden" id="start-screen-title">MAYBI — Blind Pack Thời Trang Xé Túi Mù</h1>
        <div className="start-screen-heading">
            <img className="start-screen-logo" src={assetUrl('assets/logo-maybi-white.webp')} alt="MAYBI" />
        </div>
        <picture className="start-screen-art" aria-hidden="true">
            <source media="(max-width: 680px)" srcSet={assetUrl('assets/tui-mu-maybi-start-screen-mobile-clean.png')} />
            <img src={assetUrl('assets/tui-mu-maybi-start-screen-clean.png')} alt="" />
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
            <img className="start-screen-gem start-screen-gem-one" src={assetUrl('assets/start-screen-diamond.png')} alt="" />
            <img className="start-screen-gem start-screen-gem-two" src={assetUrl('assets/start-screen-heart.png')} alt="" />
            <img className="start-screen-gem start-screen-gem-three" src={assetUrl('assets/start-screen-diamond.png')} alt="" />
            <img className="start-screen-gem start-screen-gem-four" src={assetUrl('assets/start-screen-heart.png')} alt="" />
            <img className="start-screen-gem start-screen-gem-five" src={assetUrl('assets/start-screen-diamond.png')} alt="" />
            <img className="start-screen-gem start-screen-gem-six" src={assetUrl('assets/start-screen-heart.png')} alt="" />
        </div>
        <div className="start-screen-pack" aria-hidden="true">
            <img src={assetUrl('assets/MAYBi_pack_04_signature.png')} alt="" />
        </div>
        <button className="start-button" type="button" onClick={onStart}>
            Bắt đầu
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
