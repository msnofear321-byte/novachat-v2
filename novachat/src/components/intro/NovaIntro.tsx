import { useRef, useState, useEffect, useCallback, useMemo, Suspense, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router';
import { FcGoogle } from 'react-icons/fc';
import { HiOutlineEnvelope, HiOutlineLockClosed } from 'react-icons/hi2';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { loginWithEmail, loginWithGoogle } from '@/services/auth';
import { useAuth } from '@/context/AuthContext';

// ─── Sound Engine ──────────────────────────────────────────

function createAudioCtx(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  } catch {
    return null;
  }
}

function playSlideIn() {
  const ctx = createAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  [1200, 1000, 800].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t + i * 0.08);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + i * 0.08 + 0.2);
    gain.gain.setValueAtTime(0.06, t + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t + i * 0.08);
    osc.stop(t + i * 0.08 + 0.25);
  });
}

function playGlassReveal() {
  const ctx = createAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(800, t + 0.3);
  osc.frequency.exponentialRampToValueAtTime(400, t + 0.6);
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.6);

  [2400, 3600, 4800].forEach((freq, i) => {
    const s = ctx.createOscillator();
    const g = ctx.createGain();
    s.type = 'sine';
    s.frequency.setValueAtTime(freq, t + 0.15 + i * 0.05);
    g.gain.setValueAtTime(0.025, t + 0.15 + i * 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4 + i * 0.05);
    s.connect(g).connect(ctx.destination);
    s.start(t + 0.15 + i * 0.05);
    s.stop(t + 0.5 + i * 0.05);
  });
}

function playLogoReveal() {
  const ctx = createAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  [523.25, 659.25, 783.99].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t + i * 0.1);
    gain.gain.setValueAtTime(0.07, t + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t + i * 0.1);
    osc.stop(t + i * 0.1 + 0.35);
  });
}

// ─── Floating Particles ────────────────────────────────────

function FloatingParticles({ count = 80 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const arr: { x: number; y: number; z: number; s: number; speed: number; offset: number }[] = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 24,
        y: (Math.random() - 0.5) * 12,
        z: (Math.random() - 0.5) * 14 - 3,
        s: 0.01 + Math.random() * 0.025,
        speed: 0.08 + Math.random() * 0.2,
        offset: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, [count]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      const p = particles[i];
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.offset) * 0.6,
        p.y + Math.cos(t * p.speed * 0.5 + p.offset) * 0.4,
        p.z,
      );
      const sc = p.s * (0.85 + Math.sin(t * 1.2 + p.offset) * 0.15);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#7C3AED" transparent opacity={0.45} />
    </instancedMesh>
  );
}

function AmbientOrbs({ count = 12 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const orbs = useMemo(() => {
    const arr: { x: number; y: number; z: number; s: number; speed: number; offset: number }[] = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 18,
        y: (Math.random() - 0.5) * 8,
        z: (Math.random() - 0.5) * 8 - 4,
        s: 0.05 + Math.random() * 0.1,
        speed: 0.03 + Math.random() * 0.08,
        offset: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, [count]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      const p = orbs[i];
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.offset) * 1.2,
        p.y + Math.cos(t * p.speed * 0.4 + p.offset) * 0.8,
        p.z,
      );
      const sc = p.s * (0.6 + Math.sin(t * 0.8 + p.offset) * 0.4);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#A855F7" transparent opacity={0.2} />
    </instancedMesh>
  );
}

// ─── Glass Panel ───────────────────────────────────────────

interface GlassPanelHandle {
  enter: (tl: gsap.core.Timeline) => void;
  enterMobile: (tl: gsap.core.Timeline) => void;
}

const GlassPanel = forwardRef<GlassPanelHandle>((_props, ref) => {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const logoRef = useRef<THREE.Group>(null);

  useImperativeHandle(ref, () => ({
    enter(tl: gsap.core.Timeline) {
      if (!groupRef.current) return;
      const g = groupRef.current;

      g.visible = true;
      g.position.set(-4.5, 0.5, 0);
      g.scale.set(0.85, 0.85, 0.85);

      playSlideIn();

      tl.to(g.position, {
        x: 0,
        duration: 1.0,
        ease: 'power3.out',
      });

      tl.to(g.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.8,
        ease: 'power2.out',
      }, '<0.1');

      tl.call(() => playGlassReveal(), undefined, '-=0.4');

      if (glowRef.current) {
        const mat = glowRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0;
        tl.to(mat, {
          opacity: 0.18,
          duration: 0.6,
          ease: 'power2.inOut',
        }, '-=0.3');
      }

      tl.call(() => playLogoReveal(), undefined, '-=0.1');

      const mats: THREE.MeshBasicMaterial[] = [];
      if (logoRef.current) {
        logoRef.current.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.isMesh && (mesh.material as THREE.MeshBasicMaterial).opacity !== undefined) {
            mats.push(mesh.material as THREE.MeshBasicMaterial);
          }
        });
      }
      mats.forEach((mat, i) => {
        mat.opacity = 0;
        tl.to(mat, {
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out',
        }, i === 0 ? '-=0.2' : '<');
      });
    },

    enterMobile(tl: gsap.core.Timeline) {
      if (!groupRef.current) return;
      const g = groupRef.current;

      g.visible = true;
      g.position.set(-5, 0.5, 0);
      g.scale.set(0.6, 0.6, 0.6);

      playSlideIn();

      tl.to(g.position, {
        x: 0,
        duration: 0.9,
        ease: 'power3.out',
      });

      tl.to(g.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.7,
        ease: 'power2.out',
      }, '<0.15');

      tl.call(() => playGlassReveal(), undefined, '-=0.3');

      if (glowRef.current) {
        const mat = glowRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0;
        tl.to(mat, {
          opacity: 0.15,
          duration: 0.5,
          ease: 'power2.inOut',
        }, '-=0.2');
      }

      tl.call(() => playLogoReveal(), undefined, '-=0.1');

      const mats: THREE.MeshBasicMaterial[] = [];
      if (logoRef.current) {
        logoRef.current.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.isMesh && (mesh.material as THREE.MeshBasicMaterial).opacity !== undefined) {
            mats.push(mesh.material as THREE.MeshBasicMaterial);
          }
        });
      }
      mats.forEach((mat, i) => {
        mat.opacity = 0;
        tl.to(mat, {
          opacity: 1,
          duration: 0.45,
          ease: 'power2.out',
        }, i === 0 ? '-=0.15' : '<');
      });
    },
  }));

  return (
    <group ref={groupRef} position={[0, 0.5, 0]} visible={false}>
      <RoundedBox args={[3.2, 4.2, 0.08]} radius={0.15} smoothness={4}>
        <meshPhysicalMaterial
          color="#111122"
          transparent
          opacity={0.4}
          roughness={0.05}
          metalness={0.15}
          transmission={0.25}
          thickness={0.5}
          envMapIntensity={0.6}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </RoundedBox>

      <mesh ref={glowRef} position={[0, 0, -0.01]}>
        <RoundedBox args={[3.3, 4.3, 0.01]} radius={0.15} smoothness={4}>
          <meshBasicMaterial color="#7C3AED" transparent opacity={0} />
        </RoundedBox>
      </mesh>

      <mesh position={[0, 0, 0.041]}>
        <RoundedBox args={[3.05, 4.05, 0.01]} radius={0.12} smoothness={4}>
          <meshBasicMaterial color="#A855F7" transparent opacity={0.1} />
        </RoundedBox>
      </mesh>

      <group ref={logoRef} position={[0, 1.0, 0.06]}>
        <mesh>
          <RoundedBox args={[0.9, 0.7, 0.04]} radius={0.15} smoothness={4}>
            <meshBasicMaterial color="#7C3AED" transparent opacity={0.85} />
          </RoundedBox>
        </mesh>
        <mesh position={[-0.25, -0.35, 0]} rotation={[0, 0, -0.3]}>
          <coneGeometry args={[0.12, 0.2, 4]} />
          <meshBasicMaterial color="#7C3AED" transparent opacity={0.85} />
        </mesh>
        <mesh position={[-0.15, 0.02, 0.025]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="white" transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, 0.02, 0.025]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="white" transparent opacity={0.9} />
        </mesh>
        <mesh position={[0.15, 0.02, 0.025]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="white" transparent opacity={0.9} />
        </mesh>
      </group>
    </group>
  );
});

GlassPanel.displayName = 'GlassPanel';

// ─── Camera ────────────────────────────────────────────────

function CameraSetup({ isMobile }: { isMobile: boolean }) {
  const { camera } = useThree();

  useEffect(() => {
    if (isMobile) {
      camera.position.set(0, 1.0, 5.8);
      camera.lookAt(0, 0.3, 0);
    } else {
      camera.position.set(0, 1.3, 5.2);
      camera.lookAt(0, 0.4, 0);
    }
  }, [camera, isMobile]);

  return null;
}

// ─── 3D Scene ──────────────────────────────────────────────

interface SceneProps {
  onReady: () => void;
  isMobile: boolean;
}

function IntroScene({ onReady, isMobile }: SceneProps) {
  const panelRef = useRef<GlassPanelHandle>(null);
  const readyCalled = useRef(false);

  useEffect(() => {
    const tl = gsap.timeline({
      onComplete() {
        if (!readyCalled.current) {
          readyCalled.current = true;
          onReady();
        }
      },
    });

    tl.set({}, { delay: 0.4 });

    if (panelRef.current) {
      if (isMobile) {
        panelRef.current.enterMobile(tl);
      } else {
        panelRef.current.enter(tl);
      }
    }

    tl.set({}, { delay: 0.6 });

    return () => {
      tl.kill();
    };
  }, [onReady, isMobile]);

  return (
    <>
      <CameraSetup isMobile={isMobile} />

      <ambientLight intensity={0.25} />
      <directionalLight
        position={[4, 6, 4]}
        intensity={0.8}
        color="#E8D5FF"
      />
      <pointLight position={[-2, 2, 2]} intensity={0.6} color="#7C3AED" distance={12} />
      <pointLight position={[2, 1.5, -1]} intensity={0.3} color="#A855F7" distance={10} />

      <fog attach="fog" args={['#050508', 8, 20]} />

      <FloatingParticles count={100} />
      <AmbientOrbs count={14} />

      <GlassPanel ref={panelRef} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.8, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial
          color="#050508"
          roughness={0.85}
          metalness={0.15}
          transparent
          opacity={0.9}
        />
      </mesh>

      <ContactShadows
        position={[0, -1.79, 0]}
        opacity={0.3}
        scale={14}
        blur={3}
        far={5}
        color="#2D1B69"
      />

      <Environment preset="night" />
    </>
  );
}

// ─── Login Overlay ─────────────────────────────────────────

interface LoginOverlayProps {
  visible: boolean;
  isMobile: boolean;
}

function LoginOverlay({ visible, isMobile }: LoginOverlayProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      setTimeout(() => navigate('/', { replace: true }), 300);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to login';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      setTimeout(() => navigate('/', { replace: true }), 300);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to login with Google';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass = `w-full pl-11 pr-4 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-[14px] text-white text-[15px] placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/40 focus:bg-white/[0.06] transition-all duration-300`;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className={`absolute inset-0 z-20 flex items-center pointer-events-auto ${isMobile ? 'justify-start pl-6' : 'justify-center'}`}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className="w-full max-w-[380px] mx-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="text-center mb-8"
            >
              <div className="inline-flex items-center justify-center mb-4">
                <div
                  className="w-[72px] h-[72px] rounded-[22px] flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(168,85,247,0.2))',
                    border: '1px solid rgba(124,58,237,0.3)',
                    boxShadow: '0 0 40px rgba(124,58,237,0.15)',
                  }}
                >
                  <svg className="w-10 h-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
              <h1 className="text-[32px] font-bold text-white tracking-tight">
                Nova<span className="text-purple-400">Chat</span>
              </h1>
              <p className="text-white/40 text-[14px] mt-1">End-to-end encrypted messaging</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-[24px] p-7 relative overflow-hidden"
              style={{
                background: 'rgba(15, 15, 25, 0.85)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(24px)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(124,58,237,0.08)',
              }}
            >
              <div className="absolute top-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-purple-400/30 to-transparent" />

              <form onSubmit={handleLogin} className="space-y-5">
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <label className="block text-[13px] font-medium text-white/50 mb-2 ml-1">Email</label>
                  <div className="relative group">
                    <HiOutlineEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/30 group-focus-within:text-purple-400 transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder=""
                      required
                      className={inputClass}
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.65, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <label className="block text-[13px] font-medium text-white/50 mb-2 ml-1">Password</label>
                  <div className="relative group">
                    <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/30 group-focus-within:text-purple-400 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder=""
                      required
                      className={`${inputClass} !pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors p-0.5"
                    >
                      {showPassword ? <AiOutlineEyeInvisible className="w-[18px] h-[18px]" /> : <AiOutlineEye className="w-[18px] h-[18px]" />}
                    </button>
                  </div>
                </motion.div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="bg-red-500/10 border border-red-500/20 rounded-[14px] px-4 py-3"
                    >
                      <p className="text-red-400 text-[13px] text-center">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.98 }}
                  className="neon-btn w-full"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.75, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                  ) : (
                    'Sign In'
                  )}
                </motion.button>

                <motion.div
                  className="relative my-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.85 }}
                >
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/[0.08]" />
                  </div>
                  <div className="relative flex justify-center text-[13px]">
                    <span className="px-3 bg-transparent text-white/30 font-medium">or continue with</span>
                  </div>
                </motion.div>

                <motion.button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.01 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.95, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="google-btn w-full py-3.5 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-purple-500/30 text-white font-medium text-[15px] rounded-[14px] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  <FcGoogle className="w-5 h-5" />
                  Google
                </motion.button>
              </form>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="text-center text-white/15 text-[12px] mt-5 font-medium"
            >
              Protected by end-to-end encryption
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main NovaIntro Component ──────────────────────────────

interface NovaIntroProps {
  onReady: () => void;
}

export default function NovaIntro({ onReady }: NovaIntroProps) {
  const [showLogin, setShowLogin] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const { user } = useAuth();

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleIntroComplete = useCallback(() => {
    setTimeout(() => {
      setShowLogin(true);
    }, 200);
  }, []);

  const handleSkip = useCallback(() => {
    if (!hasNavigated) {
      setHasNavigated(true);
      onReady();
    }
  }, [hasNavigated, onReady]);

  useEffect(() => {
    if (showLogin && !hasNavigated) {
      const root = document.getElementById('root');
      if (root) {
        const handler = () => {
          if (!hasNavigated) {
            setHasNavigated(true);
            onReady();
          }
        };
        root.addEventListener('nova-intro-complete', handler);
        return () => root.removeEventListener('nova-intro-complete', handler);
      }
    }
  }, [showLogin, hasNavigated, onReady]);

  return (
    <div className="nova-intro" style={{ background: '#050508' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        camera={{ fov: 45, near: 0.1, far: 50 }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Suspense fallback={null}>
          <IntroScene onReady={handleIntroComplete} isMobile={isMobile} />
        </Suspense>
      </Canvas>

      <LoginOverlay visible={showLogin} isMobile={isMobile} />

      {showLogin && (
        <div
          className={`absolute bottom-8 z-30 ${isMobile ? 'left-1/2 -translate-x-1/2' : 'right-8'}`}
          onClick={handleSkip}
        >
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="px-5 py-2.5 rounded-full text-white/30 text-[13px] font-medium hover:text-white/60 transition-all duration-300 cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {user ? 'Continue to App' : 'Skip'}
          </motion.button>
        </div>
      )}
    </div>
  );
}
