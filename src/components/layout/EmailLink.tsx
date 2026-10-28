'use client';

import { useRef, useState, type ComponentType, type MouseEvent } from 'react';
import { Camera, Check, Coffee, Copy, Gamepad2, Headphones, Laptop, Mail, Music, RotateCw, Smartphone, X } from 'lucide-react';

// The address is stored reversed as char codes and only decoded after the challenge is solved.
const encoded = [109, 111, 99, 46, 108, 105, 97, 109, 103, 64, 99, 107, 105, 109, 97, 115, 46, 118, 101, 100];
const decodeEmail = () => String.fromCharCode(...[...encoded].reverse());

type Tile = { name: string; Icon: ComponentType<{ size?: number; strokeWidth?: number }> };

const tiles: Tile[] = [
    { name: 'laptop', Icon: Laptop },
    { name: 'phone', Icon: Smartphone },
    { name: 'camera', Icon: Camera },
    { name: 'coffee cup', Icon: Coffee },
    { name: 'headphones', Icon: Headphones },
    { name: 'game controller', Icon: Gamepad2 },
    { name: 'music note', Icon: Music },
];

// Humans need a moment to look at the grid; instant answers are treated as bots.
const MIN_SOLVE_MS = 1200;

function newChallenge() {
    const target = tiles[Math.floor(Math.random() * tiles.length)];
    const others = tiles.filter(t => t !== target);
    const targetCount = 2 + Math.floor(Math.random() * 3);
    const grid = Array.from({ length: 9 }, (_, i) =>
        i < targetCount ? target : others[Math.floor(Math.random() * others.length)],
    ).sort(() => Math.random() - 0.5);
    return { target, grid, shownAt: Date.now() };
}

type Step = 'checkbox' | 'checking' | 'grid' | 'solved';

export default function EmailLink({ className }: { className?: string }) {
    const dialog = useRef<HTMLDialogElement>(null);
    const [step, setStep] = useState<Step>('checkbox');
    const [challenge, setChallenge] = useState(newChallenge);
    const [selected, setSelected] = useState<number[]>([]);
    const [error, setError] = useState('');
    const [email, setEmail] = useState('');
    const [copied, setCopied] = useState(false);

    const open = () => {
        setStep('checkbox');
        setSelected([]);
        setError('');
        setEmail('');
        setCopied(false);
        dialog.current?.showModal();
    };

    const startCheck = (e: MouseEvent<HTMLButtonElement>) => {
        if (!e.isTrusted || step !== 'checkbox') return;
        setStep('checking');
        setTimeout(() => {
            setChallenge(newChallenge());
            setSelected([]);
            setStep('grid');
        }, 900);
    };

    const toggle = (i: number) => {
        setError('');
        setSelected(s => (s.includes(i) ? s.filter(x => x !== i) : [...s, i]));
    };

    const reshuffle = (message: string) => {
        setError(message);
        setChallenge(newChallenge());
        setSelected([]);
    };

    const verify = (e: MouseEvent<HTMLButtonElement>) => {
        if (!e.isTrusted) return;
        if (Date.now() - challenge.shownAt < MIN_SOLVE_MS) return reshuffle('That was a little too fast. Try again.');
        const answer = challenge.grid.flatMap((t, i) => (t === challenge.target ? [i] : []));
        const correct = answer.length === selected.length && answer.every(i => selected.includes(i));
        if (!correct) return reshuffle('Not quite. Here is a new set.');
        setEmail(decodeEmail());
        setStep('solved');
    };

    const copy = async () => {
        await navigator.clipboard.writeText(email);
        setCopied(true);
    };

    return (
        <>
            <button type="button" className={className} onClick={open}>
                Email me
            </button>
            <dialog
                ref={dialog}
                className="email-captcha"
                aria-labelledby="email-captcha-title"
                onClick={e => e.target === dialog.current && dialog.current?.close()}
            >
                <div className="email-captcha-panel">
                    <header>
                        <h3 id="email-captcha-title">{step === 'solved' ? 'Here you go' : 'View email address'}</h3>
                        <button type="button" className="email-captcha-close" aria-label="Close" onClick={() => dialog.current?.close()}>
                            <X size={18} />
                        </button>
                    </header>

                    {(step === 'checkbox' || step === 'checking') && (
                        <>
                            <p>Quick check so bots don&apos;t fill my inbox.</p>
                            <button type="button" className="captcha-box" onClick={startCheck} disabled={step === 'checking'}>
                                <span className={`captcha-tick${step === 'checking' ? ' is-spinning' : ''}`} aria-hidden="true" />
                                I&apos;m not a robot
                            </button>
                        </>
                    )}

                    {step === 'grid' && (
                        <>
                            <div className="captcha-prompt">
                                Select all images with a <strong>{challenge.target.name}</strong>
                            </div>
                            <div className="captcha-grid" role="group" aria-label={`Select every ${challenge.target.name}`}>
                                {challenge.grid.map(({ name, Icon }, i) => (
                                    <button
                                        key={`${challenge.shownAt}-${i}`}
                                        type="button"
                                        aria-label={name}
                                        aria-pressed={selected.includes(i)}
                                        onClick={() => toggle(i)}
                                    >
                                        <Icon size={34} strokeWidth={1.5} />
                                        {selected.includes(i) && <span className="captcha-selected"><Check size={14} /></span>}
                                    </button>
                                ))}
                            </div>
                            <p className="captcha-error" role="status">{error}</p>
                            <div className="captcha-actions">
                                <button type="button" aria-label="New challenge" onClick={() => reshuffle('')}>
                                    <RotateCw size={18} />
                                </button>
                                <button type="button" className="button button-primary" onClick={verify}>
                                    Verify
                                </button>
                            </div>
                        </>
                    )}

                    {step === 'solved' && (
                        <>
                            <p className="captcha-email">{email}</p>
                            <div className="captcha-actions">
                                <button type="button" className="button button-secondary" onClick={copy}>
                                    {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy'}
                                </button>
                                <a className="button button-primary" href={`mailto:${email}`}>
                                    <Mail size={16} /> Open mail app
                                </a>
                            </div>
                        </>
                    )}
                </div>
            </dialog>
        </>
    );
}
