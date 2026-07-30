import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineArrowLeft, HiOutlineLockClosed, HiOutlinePaperAirplane,
  HiOutlineShieldCheck, HiOutlineEyeSlash, HiOutlineEye,
  HiOutlineTrash, HiOutlinePlus,
} from 'react-icons/hi2';
import { useNavigate } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { encryptText, decryptText } from '@/services/crypto';
import {
  doc, setDoc, onSnapshot, collection, addDoc, query, orderBy,
} from 'firebase/firestore';
import { db } from '@/services/firebase';

interface SecretMessage {
  id?: string;
  senderId: string;
  ciphertext: string;
  iv: string;
  createdAt: number;
}

const PIN_KEY = 'nova_secret_pin';

function getStoredPin(): string | null {
  return localStorage.getItem(PIN_KEY);
}

function storePin(pin: string) {
  localStorage.setItem(PIN_KEY, pin);
}

export default function SecretChatPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [locked, setLocked] = useState(true);
  const [settingPin, setSettingPin] = useState(false);
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const [confirmDigits, setConfirmDigits] = useState<string[]>(['', '', '', '']);
  const [pinError, setPinError] = useState('');
  const [showPin, setShowPin] = useState(false);

  const [messages, setMessages] = useState<SecretMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const storedPin = getStoredPin();
  const activePin = storedPin || '';

  useEffect(() => {
    if (storedPin) {
      setLocked(true);
    } else {
      setSettingPin(true);
      setLocked(true);
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (locked || !user?.uid || !activePin) return;

    const q = query(
      collection(db, 'secretChats', user.uid, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(q, async (snap) => {
      const decrypted: SecretMessage[] = [];
      for (const d of snap.docs) {
        const data = d.data() as Omit<SecretMessage, 'id'>;
        try {
          const plain = await decryptText(data.ciphertext, activePin, data.iv);
          decrypted.push({ id: d.id, ...data, ciphertext: plain } as any);
        } catch {
          decrypted.push({ id: d.id, ...data, ciphertext: '[decryption failed]' });
        }
      }
      setMessages(decrypted);
      setTimeout(scrollToBottom, 50);
    });

    return () => unsub();
  }, [locked, user?.uid, activePin, scrollToBottom]);

  const handlePinSubmit = (digits: string[]) => {
    const pin = digits.join('');
    if (pin.length !== 4) return;

    if (settingPin) {
      if (!getStoredPin()) {
        storePin(pin);
        setConfirmDigits(['', '', '', '']);
        return;
      }
      const stored = getStoredPin();
      if (pin === stored) {
        setLocked(false);
        setSettingPin(false);
        setPinError('');
      } else {
        setPinError('Incorrect PIN');
        setPinDigits(['', '', '', '']);
      }
    } else {
      const stored = getStoredPin();
      if (pin === stored) {
        setLocked(false);
        setPinError('');
      } else {
        setPinError('Incorrect PIN');
        setPinDigits(['', '', '', '']);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || sending || !user?.uid || !activePin) return;
    setSending(true);
    try {
      const { ciphertext, iv } = await encryptText(inputText.trim(), activePin);
      await addDoc(collection(db, 'secretChats', user.uid, 'messages'), {
        senderId: user.uid,
        ciphertext,
        iv,
        createdAt: Date.now(),
      });
      setInputText('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('Failed to send secret message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = async () => {
    if (!user?.uid) return;
    const confirmed = window.confirm('Clear all secret messages? This cannot be undone.');
    if (!confirmed) return;
    const q = query(collection(db, 'secretChats', user.uid, 'messages'));
    const snap = await import('firebase/firestore').then(m => m.getDocs(q));
    const batch = (await import('firebase/firestore')).writeBatch(db);
    snap.forEach(d => batch.delete(d.ref));
    await batch.commit();
    setMessages([]);
  };

  const PinInput = ({
    digits,
    onChange,
    onSubmit,
  }: {
    digits: string[];
    onChange: (d: string[]) => void;
    onSubmit: (d: string[]) => void;
  }) => {
    const refs = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return;
      const newDigits = [...digits];
      newDigits[index] = value.slice(-1);
      onChange(newDigits);

      if (index < 3 && value) {
        refs.current[index + 1]?.focus();
      }

      const full = newDigits.join('');
      if (full.length === 4) {
        setTimeout(() => onSubmit(newDigits), 100);
      }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' && !digits[index] && index > 0) {
        refs.current[index - 1]?.focus();
      }
    };

    return (
      <div className="flex gap-3 justify-center">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type={showPin ? 'text' : 'password'}
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-14 h-16 text-center text-2xl font-bold rounded-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)]/30"
          />
        ))}
      </div>
    );
  };

  if (locked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--bg-primary)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="premium-card p-8 max-w-[360px] w-full text-center"
        >
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'var(--success-bg)' }}>
            <HiOutlineShieldCheck className="w-8 h-8" style={{ color: 'var(--success)' }} />
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1">Secret Chat</h2>
          <p className="text-[14px] text-[var(--text-muted)] mb-6">
            {settingPin ? 'Set a 4-digit PIN' : 'Enter your 4-digit PIN'}
          </p>

          <div className="flex items-center justify-center mb-2">
            <button
              onClick={() => setShowPin(!showPin)}
              className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] p-1"
            >
              {showPin ? <HiOutlineEyeSlash className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
            </button>
          </div>

          <PinInput
            digits={settingPin ? (confirmDigits[3] !== '' || confirmDigits.some(d => d) ? confirmDigits : pinDigits) : pinDigits}
            onChange={(d) => settingPin ? (getStoredPin() ? setConfirmDigits(d) : setPinDigits(d)) : setPinDigits(d)}
            onSubmit={(d) => {
              if (settingPin && !getStoredPin()) {
                setPinDigits(d);
                storePin(d.join(''));
                setConfirmDigits(['', '', '', '']);
                setLocked(false);
                setSettingPin(false);
              } else {
                handlePinSubmit(d);
              }
            }}
          />

          {pinError && (
            <p className="text-[13px] mt-3" style={{ color: 'var(--danger)' }}>{pinError}</p>
          )}

          <button
            onClick={() => navigate('/')}
            className="mt-6 text-[13px] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          >
            Back to chat
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg-chat)]">
      <div className="h-14 px-4 flex items-center gap-3 border-b border-[var(--border-primary)]" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
        >
          <HiOutlineArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <HiOutlineShieldCheck className="w-5 h-5" style={{ color: 'var(--success)' }} />
          <span className="text-[15px] font-semibold text-[var(--text-primary)]">Secret Chat</span>
          <HiOutlineLockClosed className="w-4 h-4" style={{ color: 'var(--success)' }} />
        </div>
        <div className="ml-auto">
          <button
            onClick={handleClearChat}
            className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
            title="Clear chat"
          >
            <HiOutlineTrash className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <HiOutlineShieldCheck className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--success)', opacity: 0.5 }} />
            <p className="text-[14px] text-[var(--text-muted)]">No messages yet</p>
            <p className="text-[12px] text-[var(--text-muted)] mt-1">Messages are end-to-end encrypted</p>
          </div>
        )}

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] px-4 py-2.5 rounded-[16px] text-[14px] ${
                msg.senderId === user?.uid
                  ? 'rounded-br-[4px]'
                  : 'rounded-bl-[4px]'
              }`}
              style={{
                backgroundColor: msg.senderId === user?.uid ? 'var(--accent-primary)' : 'var(--bg-card)',
                color: msg.senderId === user?.uid ? 'white' : 'var(--text-primary)',
                border: msg.senderId === user?.uid ? 'none' : '1px solid var(--border-primary)',
              }}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <HiOutlineLockClosed className="w-3 h-3 opacity-50" />
                <span className="text-[10px] opacity-60">encrypted</span>
              </div>
              {msg.ciphertext}
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-[var(--border-primary)]" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            placeholder="Type encrypted message..."
            className="flex-1 px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[14px] text-[var(--text-primary)] text-[14px] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)]/30"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || sending}
            className="w-10 h-10 rounded-[12px] flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-gradient-end))' }}
          >
            <HiOutlinePaperAirplane className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
