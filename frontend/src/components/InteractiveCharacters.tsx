import { useEffect, useRef } from 'react';
import { motion, Variants, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Box } from '@mui/material';

export type ReactionState = 'idle' | 'typing_email' | 'sneaking_password_hidden' | 'sneaking_password_visible' | 'error' | 'hover_forgot_password' | 'hover_register';

interface InteractiveCharactersProps {
    reaction: ReactionState;
}

export function InteractiveCharacters({ reaction }: InteractiveCharactersProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const containerRectRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

    // Raw motion values — these update WITHOUT triggering React re-renders!
    const rawEyeX = useMotionValue(0);
    const rawEyeY = useMotionValue(0);

    // Smooth springs — tiny bit of organic lag (stiffness 800 = near-instant)
    const springConfig = { stiffness: 800, damping: 35, mass: 0.5 };
    const eyeX = useSpring(rawEyeX, springConfig);
    const eyeY = useSpring(rawEyeY, springConfig);

    // Per-character transforms with different maxMove ranges
    const blueEyeX = useTransform(eyeX, v => v * (4 / 6));
    const blueEyeY = useTransform(eyeY, v => v * (4 / 6));
    const orangeEyeX = useTransform(eyeX, v => v * (6 / 6));
    const orangeEyeY = useTransform(eyeY, v => v * (6 / 6));
    const purpleEyeX = useTransform(eyeX, v => v * (7 / 6));
    const purpleEyeY = useTransform(eyeY, v => v * (7 / 6));
    const yellowEyeX = useTransform(eyeX, v => v * (4 / 6));
    const yellowEyeY = useTransform(eyeY, v => v * (4 / 6));

    useEffect(() => {
        const updateRect = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                containerRectRef.current = { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
            }
        };
        setTimeout(updateRect, 100);
        window.addEventListener('resize', updateRect);
        return () => window.removeEventListener('resize', updateRect);
    }, []);

    const reactionRef = useRef(reaction);
    useEffect(() => {
        reactionRef.current = reaction;
        // When leaving idle, snap eyes to center
        if (reaction !== 'idle') {
            rawEyeX.set(0);
            rawEyeY.set(0);
        }
    }, [reaction, rawEyeX, rawEyeY]);

    // Mouse tracking via motion values — NO re-renders, instant DOM updates
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (reactionRef.current !== 'idle') return;
            const rect = containerRectRef.current;
            if (rect.width === 0) return;

            const centerX = rect.x + rect.width / 2;
            const centerY = rect.y + rect.height / 2;
            const maxMove = 6;

            const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
            const distance = Math.min(Math.hypot(e.clientX - centerX, e.clientY - centerY) / 25, maxMove);

            rawEyeX.set(Math.cos(angle) * distance);
            rawEyeY.set(Math.sin(angle) * distance);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [rawEyeX, rawEyeY]);

    // ============================================
    //  SLIDE-IN ANIMATIONS
    // ============================================
    const leftSlideVariants: Variants = {
        hidden: { x: '-120%', opacity: 0 },
        visible: (customIndex: number) => ({
            x: 0,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 50,
                damping: 14,
                mass: 1.5,
                delay: customIndex * 0.15
            }
        })
    };

    const rightSlideVariants: Variants = {
        hidden: { x: '120%', opacity: 0 },
        visible: (customIndex: number) => ({
            x: 0,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 50,
                damping: 14,
                mass: 1.5,
                delay: customIndex * 0.15
            }
        })
    };

    const popUpVariants: Variants = {
        hidden: { y: '100%', opacity: 0 },
        visible: (customIndex: number) => ({
            y: 0,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 60,
                damping: 12,
                mass: 1.8,
                delay: customIndex * 0.15
            }
        })
    };

    // ============================================
    //  PER-CHARACTER BODY REACTIONS
    //  Each character has a distinct personality!
    // ============================================

    // PURPLE GIANT — The "Over-the-Shoulder" Snoop
    // Snooping: physically leans RIGHT to get closer, blatantly staring at the password field
    const purpleBodyVariants: Variants = {
        idle: { y: 0, x: 0, rotate: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } },
        typing_email: { y: -3, x: 0, rotate: 2, transition: { type: 'spring', stiffness: 120, damping: 12 } },
        error: {
            y: [0, -5, 0, -3, 0],
            x: [0, -8, 8, -5, 5, -2, 0],
            rotate: [0, -4, 4, -2, 2, 0],
            transition: { duration: 1.5, ease: "easeOut" }
        },
        hover_register: { rotate: 10, y: -4, transition: { type: 'spring', stiffness: 200, damping: 8 } },
        // Laughing! Throwing head back, bouncing with "you FORGOT?!"
        hover_forgot_password: {
            y: [0, -8, -2, -6, -1, -4, 0],
            rotate: [0, -5, 3, -3, 2, 0],
            transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
        },
        // Not even trying to hide it — leaning right toward the password
        sneaking_password_hidden: { y: -6, x: 12, rotate: 8, transition: { type: 'spring', stiffness: 120, damping: 10 } },
        // Still leaning but relaxed — password is visible anyway
        sneaking_password_visible: { y: -3, x: 8, rotate: 5, transition: { type: 'spring', stiffness: 100, damping: 12 } },
    };

    // ORANGE DOME — The "Trying to See" Snoop
    // Snooping: short guy POPS UP higher on tiptoes to see over the card edge
    const orangeBodyVariants: Variants = {
        idle: { y: 0, x: 0, rotate: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } },
        typing_email: { y: -4, x: 0, rotate: 3, transition: { type: 'spring', stiffness: 150, damping: 10 } },
        error: {
            y: [0, -10, 0, -8, 0, -4, 0],
            x: [0, -10, 10, -7, 7, -3, 0],
            rotate: [0, -6, 6, -4, 4, -1, 0],
            transition: { duration: 1.5 }
        },
        hover_register: { rotate: 14, y: -6, x: 3, transition: { type: 'spring', stiffness: 300, damping: 8 } },
        // Bouncing with laughter — the most animated reaction, can't stop giggling
        hover_forgot_password: {
            y: [0, -12, 0, -10, 0, -6, 0],
            x: [0, 2, -2, 1, -1, 0],
            rotate: [0, 5, -5, 3, -3, 0],
            transition: { duration: 1.0, repeat: Infinity, ease: 'easeInOut' }
        },
        // Standing on tiptoes! Pops up high and leans right toward password
        sneaking_password_hidden: { y: -18, x: 8, rotate: 5, transition: { type: 'spring', stiffness: 180, damping: 8 } },
        // Still stretching but slightly relaxed
        sneaking_password_visible: { y: -12, x: 5, rotate: 3, transition: { type: 'spring', stiffness: 120, damping: 10 } },
    };

    // DARK BLUE SHADOW — The "Squinting Hacker" Snoop
    // Snooping: slides OUT from behind Purple to get a better look, squints at password
    const blueBodyVariants: Variants = {
        idle: { y: 0, x: 0, rotate: -3, transition: { type: 'spring', stiffness: 80, damping: 15 } },
        typing_email: { y: -2, x: -2, rotate: -1, transition: { type: 'spring', stiffness: 100, damping: 12 } },
        error: {
            y: [0, -4, 0, -2, 0],
            x: [0, -12, 12, -8, 8, -3, 0],
            rotate: [0, -10, 10, -5, 5, -1, 0],
            transition: { duration: 1.5 }
        },
        hover_register: { rotate: 6, y: -2, x: 2, transition: { type: 'spring', stiffness: 100, damping: 15 } },
        // Trying to hold it in but failing — shaking with contained laughter
        hover_forgot_password: {
            y: [0, -3, 0, -2, 0],
            x: [0, -3, 3, -2, 2, 0],
            rotate: [0, -4, 4, -2, 2, 0],
            transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' }
        },
        // Slides out from behind Purple, cranes forward to read the dots
        sneaking_password_hidden: { y: -8, x: 15, rotate: 10, transition: { type: 'spring', stiffness: 100, damping: 12 } },
        // Still peeking but less aggressively
        sneaking_password_visible: { y: -4, x: 10, rotate: 5, transition: { type: 'spring', stiffness: 80, damping: 14 } },
    };

    // YELLOW PILL — The "Front Row Seat" Snoop
    // Snooping: already closest to the form, leans LEFT toward the password field
    const yellowBodyVariants: Variants = {
        idle: { y: 0, x: 0, rotate: 2, transition: { type: 'spring', stiffness: 60, damping: 18 } },
        typing_email: { y: -2, x: 0, rotate: 4, transition: { type: 'spring', stiffness: 80, damping: 14 } },
        error: {
            y: [0, -6, 0, -4, 0],
            x: [0, -6, 6, -4, 4, -1, 0],
            rotate: [0, -5, 5, -3, 3, 0],
            transition: { duration: 1.5 }
        },
        hover_register: { rotate: 12, y: -5, transition: { type: 'spring', stiffness: 200, damping: 10 } },
        // Lazy chuckle — swaying side to side, enjoying the moment
        hover_forgot_password: {
            y: [0, -5, 0, -3, 0],
            x: [0, 4, -4, 3, -3, 0],
            rotate: [0, 6, -6, 4, -4, 0],
            transition: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
        },
        // Uncomfortably close lean-in toward the password! Best seat in the house
        sneaking_password_hidden: { y: -5, x: -15, rotate: -12, transition: { type: 'spring', stiffness: 150, damping: 8 } },
        // Still leaning but knows the password is visible
        sneaking_password_visible: { y: -3, x: -10, rotate: -8, transition: { type: 'spring', stiffness: 100, damping: 10 } },
    };

    // ============================================
    //  FACE CONTAINER VARIANTS
    //  Moves the ENTIRE face (eyes + mouth) as a unit
    // ============================================

    const purpleFaceVariants: Variants = {
        idle: { x: 0, y: 0 },
        typing_email: { x: 0, y: 0 },
        // Face shifts toward the password field — looking down-right
        sneaking_password_hidden: { x: 10, y: 8, transition: { type: 'spring', stiffness: 150 } },
        sneaking_password_visible: { x: 6, y: 5, transition: { type: 'spring', stiffness: 120 } },
        error: { x: 0, y: 3 },
        // Face bounces with the laughter
        hover_forgot_password: { x: 0, y: -3, transition: { type: 'spring', stiffness: 200 } },
        hover_register: { x: 3, y: -2 },
    };

    const orangeFaceVariants: Variants = {
        idle: { x: 0, y: 0 },
        typing_email: { x: 0, y: 0 },
        // Face also shifts right — straining to see from below
        sneaking_password_hidden: { x: 12, y: 5, transition: { type: 'spring', stiffness: 180 } },
        sneaking_password_visible: { x: 8, y: 3, transition: { type: 'spring', stiffness: 120 } },
        error: { x: 0, y: 2 },
        hover_forgot_password: { x: 0, y: -2, transition: { type: 'spring', stiffness: 250 } },
        hover_register: { x: 2, y: -3 },
    };

    const blueFaceVariants: Variants = {
        idle: { x: 0, y: 0 },
        typing_email: { x: 0, y: 0 },
        // Craning forward, face pushed out
        sneaking_password_hidden: { x: 8, y: 4, transition: { type: 'spring', stiffness: 100 } },
        sneaking_password_visible: { x: 5, y: 2, transition: { type: 'spring', stiffness: 80 } },
        error: { x: 0, y: 2 },
        hover_forgot_password: { x: 0, y: -2, transition: { type: 'spring', stiffness: 150 } },
        hover_register: { x: 2, y: -1 },
    };

    const yellowFaceVariants: Variants = {
        idle: { x: 0, y: 0 },
        typing_email: { x: 0, y: 0 },
        // Face turns LEFT toward the password — he's closest
        sneaking_password_hidden: { x: -8, y: 6, transition: { type: 'spring', stiffness: 150 } },
        sneaking_password_visible: { x: -5, y: 4, transition: { type: 'spring', stiffness: 120 } },
        error: { x: 0, y: 3 },
        hover_forgot_password: { x: 0, y: -2, transition: { type: 'spring', stiffness: 180 } },
        hover_register: { x: 2, y: -2 },
    };

    // ============================================
    //  EYE VARIANTS
    //  idle = wide-eyed meerkats (mouse tracking handles position)
    //  typing_email = "dedicated readers" — sweep left-to-right like watching typing
    //  error = squeezed shut in cringe
    //  hover_register = BIG dilated pupils — "ooh a new friend!"
    // ============================================

    const purpleEyeVariants: Variants = {
        hidden: { scaleY: 1, scaleX: 1, x: 0, y: 0 },
        // Nosy meerkat — wide open, staring
        idle: { scaleY: 1.15, scaleX: 1.1, x: 0, y: 0, transition: { type: 'spring', stiffness: 100 } },
        // Dedicated reader — eyes sweep left to right following the caret
        typing_email: {
            scaleY: 1.05, scaleX: 1,
            x: [-5, 5, -5],
            y: [1, 1, 1],
            transition: { x: { repeat: Infinity, duration: 2.5, ease: "easeInOut" }, scaleY: { duration: 0.3 } }
        },
        // "I wasn't looking!" — eyes snap to the RIGHT ceiling, pretending innocence
        sneaking_password_hidden: { scaleY: 1.3, scaleX: 1.2, x: 5, y: -5, transition: { type: 'spring', stiffness: 200 } },
        // Even wider — can READ the characters now!
        sneaking_password_visible: { scaleY: 1.5, scaleX: 1.4, x: 6, y: 5, transition: { type: 'spring', stiffness: 200 } },
        // Collective cringe — eyes squeeze nearly shut
        error: { scaleY: 0.08, scaleX: 1.6, x: 0, y: 0, transition: { duration: 0.15 } },
        // Curious look down toward "Forgot Password?"
        // Happy squint — laughing so hard eyes squeeze into crescents
        hover_forgot_password: { scaleY: 0.2, scaleX: 1.3, x: 0, y: 0, transition: { type: 'spring', stiffness: 200 } },
        // Welcome committee — pupils EXPAND, excited wide eyes
        hover_register: { scaleY: 1.5, scaleX: 1.5, x: 2, y: -1, transition: { type: 'spring', stiffness: 200, damping: 10 } },
    };

    const orangeEyeVariants: Variants = {
        hidden: { scaleY: 1, scaleX: 1, x: 0, y: 0 },
        idle: { scaleY: 1.1, scaleX: 1.05, x: 0, y: 0, transition: { type: 'spring', stiffness: 100 } },
        // Nervous reader — faster sweep, slightly jittery
        typing_email: {
            scaleY: 1.1, scaleX: 1,
            x: [-4, 5, -4],
            y: [0, 1, 0],
            transition: { x: { repeat: Infinity, duration: 1.8, ease: "easeInOut" }, scaleY: { duration: 0.3 } }
        },
        // Eyes snap to LEFT CEILING — "definitely not looking at your password!"
        sneaking_password_hidden: { scaleY: 1.2, scaleX: 1.1, x: -5, y: -5, transition: { type: 'spring', stiffness: 250 } },
        // Can see! Eyes go wide with excitement
        sneaking_password_visible: { scaleY: 1.4, scaleX: 1.3, x: 7, y: 4, transition: { type: 'spring', stiffness: 250 } },
        error: { scaleY: 0.08, scaleX: 1.6, x: 0, y: 0, transition: { duration: 0.15 } },
        // Squished happy eyes — can barely see through the laughter
        hover_forgot_password: { scaleY: 0.15, scaleX: 1.4, x: 0, y: 0, transition: { type: 'spring', stiffness: 250 } },
        hover_register: { scaleY: 1.5, scaleX: 1.5, x: 2, y: -1, transition: { type: 'spring', stiffness: 300, damping: 8 } },
    };

    const blueEyeVariants: Variants = {
        hidden: { scaleY: 1, scaleX: 1, x: 0, y: 0 },
        // Suspicious meerkat — slightly squinting even in idle, peeking over shoulder
        idle: { scaleY: 0.85, scaleX: 1, x: -1, y: 0, transition: { type: 'spring', stiffness: 80 } },
        // Slow paranoid sweep — like he's reading YOUR email
        typing_email: {
            scaleY: 0.75, scaleX: 1,
            x: [-3, 4, -3],
            y: [0, -1, 0],
            transition: { x: { repeat: Infinity, duration: 3.2, ease: "easeInOut" }, scaleY: { duration: 0.3 } }
        },
        // Squinting at the LEFT CEILING — trying to look casual but still suspicious
        sneaking_password_hidden: { scaleY: 0.3, scaleX: 0.9, x: -6, y: -6, transition: { type: 'spring', stiffness: 120 } },
        // Still squinting but slightly wider — deciphering the visible text
        sneaking_password_visible: { scaleY: 0.5, scaleX: 0.85, x: 6, y: 3, transition: { type: 'spring', stiffness: 120 } },
        error: { scaleY: 0.08, scaleX: 1.6, x: 0, y: 0, transition: { duration: 0.15 } },
        // Already squinty — now basically shut from laughing, one eye slightly open
        hover_forgot_password: { scaleY: 0.1, scaleX: 1.2, x: 0, y: 0, transition: { type: 'spring', stiffness: 120 } },
        // Even Blue gets excited — but pupils only expand a little (still suspicious)
        hover_register: { scaleY: 1.2, scaleX: 1.2, x: 2, y: -1, transition: { type: 'spring', stiffness: 100, damping: 12 } },
    };

    const yellowEyeVariants: Variants = {
        hidden: { scaleY: 1, scaleX: 1, x: 0, y: 0 },
        // Lazy meerkat — half-attentive
        idle: { scaleY: 1.0, scaleX: 1, x: 0, y: 0, transition: { type: 'spring', stiffness: 60 } },
        // Chill reader — slowest sweep, barely keeping up
        typing_email: {
            scaleY: 1, scaleX: 1,
            x: [-3, 4, -3],
            y: [2, 2, 2],
            transition: { x: { repeat: Infinity, duration: 3.0, ease: "easeInOut" }, scaleY: { duration: 0.3 } }
        },
        // Eyes snap to the RIGHT CEILING — "nope, wasn't peeking at all!"
        sneaking_password_hidden: { scaleY: 1.1, scaleX: 1.0, x: 6, y: -6, transition: { type: 'spring', stiffness: 180 } },
        // Can read it! Eyes widen with delight
        sneaking_password_visible: { scaleY: 1.3, scaleX: 1.2, x: -6, y: 5, transition: { type: 'spring', stiffness: 180 } },
        error: { scaleY: 0.08, scaleX: 1.6, x: 0, y: 0, transition: { duration: 0.15 } },
        // Lazy happy squint — chuckling eyes
        hover_forgot_password: { scaleY: 0.25, scaleX: 1.2, x: 0, y: 0, transition: { type: 'spring', stiffness: 150 } },
        hover_register: { scaleY: 1.4, scaleX: 1.4, x: 2, y: -1, transition: { type: 'spring', stiffness: 200, damping: 10 } },
    };

    // ============================================
    //  MOUTH VARIANTS
    //  idle = neutral, slightly different per character
    //  typing_email = slight "ooh" reading expression
    //  error = CROOKED DISAPPOINTED FROWN — the key visual!
    //  hover_register = wide happy smile
    // ============================================

    // Purple: Boss mouth — straight line idle, dignified frown on error
    const purpleMouthVariants: Variants = {
        hidden: { scaleX: 1, height: 6, borderRadius: "50%", opacity: 0, rotate: 0 },
        idle: { scaleX: 1, height: 6, borderRadius: "50%", opacity: 1, rotate: 0 },
        // Slight "hmm" while reading
        typing_email: { scaleX: 1.1, height: 5, borderRadius: "2px", opacity: 1, rotate: 0 },
        // Concentrating "hmmmm" — mouth forms a focused line
        sneaking_password_hidden: { scaleX: 0.6, height: 5, borderRadius: "50%", opacity: 1, rotate: 0 },
        // Sly smirk — he can see the password!
        sneaking_password_visible: { scaleX: 1.4, height: 8, borderRadius: "4px 4px 50% 50%", opacity: 1, rotate: 5 },
        // Crooked disappointed frown — tilted to one side
        error: { scaleX: 1.8, height: 5, borderRadius: "0 0 50% 50%", opacity: 1, rotate: -8 },
        // Big open laugh — "HAHAHA you forgot?!"
        hover_forgot_password: { scaleX: 1.6, height: 12, borderRadius: "4px 4px 50% 50%", opacity: 1, rotate: 3 },
        // Wide grin — "welcome!"
        hover_register: { scaleX: 1.8, height: 10, borderRadius: "4px 4px 50% 50%", opacity: 1, rotate: 0, transition: { type: 'spring', stiffness: 200 } },
    };

    // Orange: Nervous mouth — wobbly dot idle, HUGE panicked "O" on error
    const orangeMouthVariants: Variants = {
        hidden: { scaleX: 1, height: 6, borderRadius: "50%", opacity: 0, rotate: 0 },
        idle: { scaleX: 0.8, height: 6, borderRadius: "50%", opacity: 1, rotate: 0 },
        typing_email: { scaleX: 0.6, height: 7, borderRadius: "50%", opacity: 1, rotate: 0 },
        // Excited open "oooh" — straining to see
        sneaking_password_hidden: { scaleX: 0.5, height: 10, borderRadius: "50%", opacity: 1, rotate: 0 },
        // Delighted smile — he saw it!
        sneaking_password_visible: { scaleX: 1.2, height: 10, borderRadius: "4px 4px 50% 50%", opacity: 1, rotate: 0 },
        // Crooked distressed frown — tilted the OTHER way from Purple
        error: { scaleX: 1.5, height: 5, borderRadius: "0 0 50% 50%", opacity: 1, rotate: 10 },
        // Huge cackling open mouth — laughing hardest
        hover_forgot_password: { scaleX: 1.4, height: 14, borderRadius: "4px 4px 50% 50%", opacity: 1, rotate: -5 },
        // Huge excited grin
        hover_register: { scaleX: 1.6, height: 12, borderRadius: "4px 4px 50% 50%", opacity: 1, rotate: 0, transition: { type: 'spring', stiffness: 300 } },
    };

    // Blue: Paranoid mouth — tight flat line, disappointed slit on error
    const blueMouthVariants: Variants = {
        hidden: { scaleX: 1, height: 6, borderRadius: "50%", opacity: 0, rotate: 0 },
        idle: { scaleX: 0.9, height: 4, borderRadius: "2px", opacity: 1, rotate: 0 },
        typing_email: { scaleX: 1, height: 3, borderRadius: "2px", opacity: 1, rotate: 0 },
        // Tight focused line — concentrating hard to decode
        sneaking_password_hidden: { scaleX: 0.7, height: 3, borderRadius: "2px", opacity: 1, rotate: 3 },
        // Slight knowing smirk — got it
        sneaking_password_visible: { scaleX: 1.1, height: 5, borderRadius: "4px 4px 50% 50%", opacity: 1, rotate: 5 },
        // Flat angry frown
        error: { scaleX: 1.6, height: 4, borderRadius: "0 0 40% 40%", opacity: 1, rotate: -5 },
        // Tight smirk trying not to laugh — but failing
        hover_forgot_password: { scaleX: 1.3, height: 8, borderRadius: "4px 4px 40% 40%", opacity: 1, rotate: 5 },
        // Small cautious smile — he's warming up
        hover_register: { scaleX: 1.3, height: 8, borderRadius: "4px 4px 50% 50%", opacity: 1, rotate: 0, transition: { type: 'spring', stiffness: 100 } },
    };

    // Yellow: Chill mouth — lazy smile, "dude really?" frown on error
    const yellowMouthVariants: Variants = {
        hidden: { scaleX: 1, height: 6, borderRadius: "50%", opacity: 0, rotate: 0 },
        idle: { scaleX: 0.9, height: 6, borderRadius: "20px 20px 50% 50%", opacity: 1, rotate: 0 },
        // Slight "oooh" whistle while reading
        typing_email: { scaleX: 0.4, height: 8, borderRadius: "50%", opacity: 1, rotate: 0 },
        // Eager grin — he's loving this front row seat
        sneaking_password_hidden: { scaleX: 1.2, height: 8, borderRadius: "20px 20px 50% 50%", opacity: 1, rotate: -3 },
        // Full cheeky grin — knows the password
        sneaking_password_visible: { scaleX: 1.5, height: 10, borderRadius: "4px 4px 50% 50%", opacity: 1, rotate: -5 },
        // Lazy disappointed droop
        error: { scaleX: 1.4, height: 5, borderRadius: "0 0 50% 50%", opacity: 1, rotate: 6 },
        // Wide lazy grin — "dude, seriously?"
        hover_forgot_password: { scaleX: 1.5, height: 12, borderRadius: "4px 4px 50% 50%", opacity: 1, rotate: -3 },
        // Big warm grin — genuinely happy
        hover_register: { scaleX: 1.6, height: 10, borderRadius: "4px 4px 50% 50%", opacity: 1, rotate: 0, transition: { type: 'spring', stiffness: 200 } },
    };

    // ============================================
    //  RENDER — Characters peeking above the card
    // ============================================

    return (
        <Box
            ref={containerRef}
            sx={{
                display: 'flex',
                width: '100%',
                height: '100%',
                backgroundColor: 'transparent',
                position: 'relative',
                alignItems: 'flex-end',
                justifyContent: 'center',
                overflow: 'visible',
            }}
        >
            {/* ========================================== */}
            {/* 1. DARK BLUE SHADOW — The Paranoid Lookout */}
            {/* Suspiciously peeking, slow eye movements   */}
            {/* ========================================== */}
            <motion.div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 'calc(50% - 170px)',
                    width: '60px',
                    height: '140px',
                    backgroundColor: '#1E3A8A',
                    borderRadius: '18px 18px 0 0',
                    zIndex: 2,
                    border: '2px solid rgba(59, 130, 246, 0.2)',
                }}
                variants={leftSlideVariants}
                initial="hidden"
                animate="visible"
                custom={2}
            >
                <motion.div variants={blueBodyVariants} animate={reaction} style={{ width: '100%', height: '100%', position: 'relative' }}>
                    <motion.div variants={blueFaceVariants} animate={reaction} style={{ position: 'absolute', top: '18px', left: 'calc(50% - 16px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <Box sx={{ display: 'flex', gap: '8px' }}>
                            <motion.div
                                style={{ width: '10px', height: '10px', backgroundColor: 'white', borderRadius: '50%', x: blueEyeX, y: blueEyeY }}
                                animate={reaction}
                                variants={blueEyeVariants}
                            />
                            <motion.div
                                style={{ width: '10px', height: '10px', backgroundColor: 'white', borderRadius: '50%', x: blueEyeX, y: blueEyeY }}
                                animate={reaction}
                                variants={blueEyeVariants}
                            />
                        </Box>
                        <motion.div
                            style={{ width: '14px', backgroundColor: 'white' }}
                            variants={blueMouthVariants}
                            animate={reaction}
                        />
                    </motion.div>
                </motion.div>
            </motion.div>

            {/* ========================================== */}
            {/* 2. ORANGE DOME — The Nervous Critter       */}
            {/* Jittery, fast eye sweeps, big reactions     */}
            {/* ========================================== */}
            <motion.div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 'calc(50% - 120px)',
                    width: '100px',
                    height: '90px',
                    backgroundColor: '#F97316',
                    borderRadius: '50px 50px 0 0',
                    zIndex: 4,
                    boxShadow: '0 8px 20px rgba(249, 115, 22, 0.25)',
                    border: '2px solid rgba(245, 158, 11, 0.2)',
                }}
                variants={leftSlideVariants}
                initial="hidden"
                animate="visible"
                custom={0}
            >
                <motion.div variants={orangeBodyVariants} animate={reaction} style={{ width: '100%', height: '100%', position: 'relative' }}>
                    <motion.div variants={orangeFaceVariants} animate={reaction} style={{ position: 'absolute', top: '24px', left: 'calc(50% - 22px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <Box sx={{ display: 'flex', gap: '14px' }}>
                            <motion.div
                                style={{ width: '14px', height: '14px', backgroundColor: 'black', borderRadius: '50%', x: orangeEyeX, y: orangeEyeY }}
                                animate={reaction}
                                variants={orangeEyeVariants}
                            />
                            <motion.div
                                style={{ width: '14px', height: '14px', backgroundColor: 'black', borderRadius: '50%', x: orangeEyeX, y: orangeEyeY }}
                                animate={reaction}
                                variants={orangeEyeVariants}
                            />
                        </Box>
                        <motion.div
                            style={{ width: '22px', backgroundColor: 'black' }}
                            variants={orangeMouthVariants}
                            animate={reaction}
                        />
                    </motion.div>
                </motion.div>
            </motion.div>

            {/* ========================================== */}
            {/* 3. PURPLE GIANT — The Boss Meerkat          */}
            {/* Wide-eyed authority, reads every letter     */}
            {/* ========================================== */}
            <motion.div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 'calc(50% - 55px)',
                    width: '110px',
                    height: '180px',
                    backgroundColor: '#6B21A8',
                    borderRadius: '44px 44px 0 0',
                    zIndex: 3,
                    boxShadow: '0 12px 30px rgba(107, 33, 168, 0.3)',
                    border: '2px solid rgba(139, 92, 246, 0.2)',
                }}
                variants={popUpVariants}
                initial="hidden"
                animate="visible"
                custom={1}
            >
                <motion.div variants={purpleBodyVariants} animate={reaction} style={{ width: '100%', height: '100%', position: 'relative' }}>
                    <motion.div variants={purpleFaceVariants} animate={reaction} style={{ position: 'absolute', top: '30px', left: 'calc(50% - 28px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <Box sx={{ display: 'flex', gap: '12px' }}>
                            <Box sx={{ width: '24px', height: '24px', backgroundColor: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                <motion.div
                                    style={{ width: '12px', height: '12px', backgroundColor: 'black', borderRadius: '50%', x: purpleEyeX, y: purpleEyeY }}
                                    animate={reaction}
                                    variants={purpleEyeVariants}
                                />
                            </Box>
                            <Box sx={{ width: '24px', height: '24px', backgroundColor: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                <motion.div
                                    style={{ width: '12px', height: '12px', backgroundColor: 'black', borderRadius: '50%', x: purpleEyeX, y: purpleEyeY }}
                                    animate={reaction}
                                    variants={purpleEyeVariants}
                                />
                            </Box>
                        </Box>
                        <motion.div
                            style={{ width: '24px', backgroundColor: 'white' }}
                            variants={purpleMouthVariants}
                            animate={reaction}
                        />
                    </motion.div>
                </motion.div>
            </motion.div>

            {/* ========================================== */}
            {/* 4. YELLOW PILL — The Chill Whistler         */}
            {/* Lazy sweep, genuinely happy for newcomers   */}
            {/* ========================================== */}
            <motion.div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 'calc(50% + 70px)',
                    width: '55px',
                    height: '130px',
                    backgroundColor: '#FACC15',
                    borderRadius: '28px 28px 0 0',
                    zIndex: 5,
                    boxShadow: '-4px 8px 16px rgba(250, 204, 21, 0.2)',
                    border: '2px solid rgba(252, 211, 77, 0.2)',
                }}
                variants={rightSlideVariants}
                initial="hidden"
                animate="visible"
                custom={2}
            >
                <motion.div variants={yellowBodyVariants} animate={reaction} style={{ width: '100%', height: '100%', position: 'relative' }}>
                    <motion.div variants={yellowFaceVariants} animate={reaction} style={{ position: 'absolute', top: '22px', left: 'calc(50% - 14px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px' }}>
                        <Box sx={{ display: 'flex', gap: '8px' }}>
                            <motion.div
                                style={{ width: '10px', height: '10px', backgroundColor: 'black', borderRadius: '50%', x: yellowEyeX, y: yellowEyeY }}
                                animate={reaction}
                                variants={yellowEyeVariants}
                            />
                            <motion.div
                                style={{ width: '10px', height: '10px', backgroundColor: 'black', borderRadius: '50%', x: yellowEyeX, y: yellowEyeY }}
                                animate={reaction}
                                variants={yellowEyeVariants}
                            />
                        </Box>
                        <motion.div
                            style={{ width: '12px', backgroundColor: 'black' }}
                            variants={yellowMouthVariants}
                            animate={reaction}
                        />
                    </motion.div>
                </motion.div>
            </motion.div>
        </Box>
    );
}
