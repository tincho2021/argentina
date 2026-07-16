/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Volume2, 
  VolumeX, 
  Play, 
  RotateCcw, 
  Trophy, 
  Zap, 
  Sparkles, 
  Timer, 
  Activity, 
  Flame, 
  ChevronRight, 
  Info, 
  X,
  Target
} from "lucide-react";
import { sound } from "./sound";
import { 
  Player, 
  Defender, 
  Goalkeeper, 
  Ball, 
  Particle, 
  GameAlert, 
  MatchStats 
} from "./types";

// Pitch Dimension Constants
const FIELD_WIDTH = 2400;
const FIELD_HEIGHT = 600;
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 600;

const TOP_LINE = 100;
const BOTTOM_LINE = 530;
const GOAL_X = 2300;
const GOAL_TOP = 200;
const GOAL_BOTTOM = 400;

// Commentaries lists
const DRIBBLE_COMMENTS = [
  "¡Qué gambeta del 10!",
  "¡La pelota siempre al 10!",
  "¡Dejó pagando al rival!",
  "¡Y de repente... magia!",
  "¡Desparramó a la defensa!",
  "¡Lleva la pelota atada!",
  "¡Fútbol total!"
];

const KICK_COMMENTS = [
  "¡Saca el bombazo!",
  "¡Le pegó con la zurda mágica!",
  "¡A colocar!",
  "¡Fuego en los botines del 10!",
  "¡Disparo tremendo!"
];

const GOAL_COMMENTS = [
  "¡¡¡GOLAZO ARGENTINO!!! ⚽🔥",
  "¡¡¡Y gol, gol, gol del 10!!!",
  "¡¡¡La colgó del ángulo!!!",
  "¡Anulo mufa!",
  "¡Histórico gol del 10!",
  "¡De colección!"
];

const TACKLE_COMMENTS = [
  "¡Uff, durísima entrada!",
  "¡Siga, siga!",
  "¡Hay que levantarse, campeón!",
  "¡Fuerte golpe de los ingleses!",
  "¡Eso era penal!"
];

const MAGIC_COMMENTS = [
  "¡¡¡EL 10 ESTÁ IMPARABLE!!!",
  "¡Se encendió la magia celestial!",
  "¡Súbanse a la Scaloneta!",
  "¡Fútbol de otro planeta!"
];

const getTerrainType = (x: number, y: number) => {
  const dxWest = x - 600;
  const dyWest = y - 315;
  const onWestIsland = (dxWest * dxWest) / (520 * 520) + (dyWest * dyWest) / (205 * 205) <= 1;
  
  const dxEast = x - 1800;
  const dyEast = y - 315;
  const onEastIsland = (dxEast * dxEast) / (510 * 510) + (dyEast * dyEast) / (205 * 205) <= 1;
  
  return (onWestIsland || onEastIsland) ? "land" : "water";
};

export default function App() {
  const [gameState, setGameState] = useState<"start" | "playing" | "celebrating" | "gameover">("start");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  
  // High-score state
  const [stats, setStats] = useState<MatchStats>({
    score: 0,
    goals: 0,
    dribbles: 0,
    timeRemaining: 60,
    highScore: 0
  });

  const [activeAlert, setActiveAlert] = useState<string | null>(null);

  // References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  
  // Game Entities Refs
  const playerRef = useRef<Player>({
    x: 150,
    y: 300,
    vx: 0,
    vy: 0,
    width: 45,
    height: 60,
    speed: 6.5,
    facing: "right",
    energy: 100,
    magic: 0,
    isDribbling: false,
    dribbleCooldown: 0,
    invincibilityTime: 0,
    isMagicActive: false,
    magicTimer: 0,
    stunTimer: 0
  });

  const defendersRef = useRef<Defender[]>([]);
  const goalkeeperRef = useRef<Goalkeeper>({
    x: 2240,
    y: 300,
    width: 50,
    height: 70,
    speed: 4.5,
    diveTimer: 0,
    diveY: 300
  });

  const ballRef = useRef<Ball>({
    x: 180,
    y: 310,
    vx: 0,
    vy: 0,
    radius: 11,
    height: 0,
    vHeight: 0,
    owner: "player",
    angle: 0
  });

  const particlesRef = useRef<Particle[]>([]);
  const alertsRef = useRef<GameAlert[]>([]);
  
  // Timers and system refs
  const timeRemainingRef = useRef<number>(60);
  const scoreRef = useRef<number>(0);
  const goalsRef = useRef<number>(0);
  const dribblesRef = useRef<number>(0);
  const gameActiveRef = useRef<boolean>(false);
  const runCycleRef = useRef<number>(0);
  const lastAlertIdRef = useRef<number>(0);

  // Load HighScore
  useEffect(() => {
    const saved = localStorage.getItem("el_10_high_score");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed)) {
        setStats(prev => ({ ...prev, highScore: parsed }));
      }
    }
  }, []);

  // Set up Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const trackedKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "w", "a", "s", "d", "W", "A", "S", "D", " ", "Shift", "e", "E"];
      if (trackedKeys.includes(e.key) || e.code === "Space") {
        if (gameState === "playing") {
          e.preventDefault(); // Prevent page scrolling
        }
      }
      
      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;
      if (e.code === "Space") {
        keysPressed.current["space"] = true;
      }
      
      // Fast triggers on down
      if (gameState === "playing") {
        if (key === "e") {
          triggerDribble();
        }
        if (e.code === "Space") {
          triggerKick();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = false;
      if (e.code === "Space") {
        keysPressed.current["space"] = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameState]);

  // Initialise defenders
  const initDefenders = () => {
    const defenders: Defender[] = [];
    const baseLines = [500, 850, 1200, 1550, 1850, 2100];
    
    baseLines.forEach((lineX, index) => {
      defenders.push({
        id: index,
        x: lineX,
        y: TOP_LINE + Math.random() * (BOTTOM_LINE - TOP_LINE),
        vx: 0,
        vy: 0,
        baseX: lineX,
        width: 50,
        height: 70,
        speed: 2.8 + Math.random() * 0.8,
        state: "patrol",
        patrolDir: Math.random() > 0.5 ? 1 : -1,
        patrolRange: 100 + Math.random() * 100
      });
    });

    defendersRef.current = defenders;
  };

  // Reset play positions (e.g. after a goal or tackle stun reset)
  const resetPlayPosition = (keepScore = true) => {
    // Reset El 10
    playerRef.current.x = 150;
    playerRef.current.y = 300;
    playerRef.current.vx = 0;
    playerRef.current.vy = 0;
    playerRef.current.invincibilityTime = 0.5; // brief fade-in shield
    
    // Reset Ball
    ballRef.current.x = 180;
    ballRef.current.y = 310;
    ballRef.current.vx = 0;
    ballRef.current.vy = 0;
    ballRef.current.height = 0;
    ballRef.current.vHeight = 0;
    ballRef.current.owner = "player";

    // Reset Goalkeeper
    goalkeeperRef.current.x = 2240;
    goalkeeperRef.current.y = 300;
    goalkeeperRef.current.diveTimer = 0;

    // Reposition Defenders slightly
    defendersRef.current.forEach((def) => {
      def.x = def.baseX;
      def.y = TOP_LINE + Math.random() * (BOTTOM_LINE - TOP_LINE);
      def.state = "patrol";
    });

    // Clear alert list but keep fireworks particles
    alertsRef.current = [];
  };

  // Start the entire match
  const startMatch = () => {
    sound.startCrowdHum();
    sound.playWhistle();

    // Reset stats
    scoreRef.current = 0;
    goalsRef.current = 0;
    dribblesRef.current = 0;
    timeRemainingRef.current = 60;

    // Reset player attributes
    playerRef.current.energy = 100;
    playerRef.current.magic = 0;
    playerRef.current.isMagicActive = false;
    playerRef.current.magicTimer = 0;
    playerRef.current.stunTimer = 0;

    initDefenders();
    resetPlayPosition();
    
    gameActiveRef.current = true;
    setGameState("playing");
    updateReactStats();

    // Spawn stadium introductory alerts
    spawnAlert("¡EL PARTIDO COMENZÓ!", 600, 150, "#f59e0b");
  };

  // Sound muter helper
  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Update statistics back to React state smoothly
  const updateReactStats = () => {
    setStats(prev => ({
      ...prev,
      score: scoreRef.current,
      goals: goalsRef.current,
      dribbles: dribblesRef.current,
      timeRemaining: Math.max(0, Math.ceil(timeRemainingRef.current))
    }));
  };

  // Add alerts visually on top of the turf
  const spawnAlert = (text: string, x: number, y: number, color = "#ffffff") => {
    lastAlertIdRef.current += 1;
    alertsRef.current.push({
      id: `alert-${lastAlertIdRef.current}`,
      text,
      x,
      y,
      color,
      timer: 1.8,
      scale: 1
    });
    setActiveAlert(text);
  };

  // Trigger special dribble "Gambeta"
  const triggerDribble = () => {
    const p = playerRef.current;
    if (p.stunTimer > 0 || p.isDribbling || p.dribbleCooldown > 0) return;

    p.isDribbling = true;
    p.dribbleCooldown = 0.8; // seconds cooldown
    sound.playDribble();

    // Check if near any English defenders to award points and charge Magia
    let success = false;
    defendersRef.current.forEach((def) => {
      const dist = Math.hypot(p.x - def.x, p.y - def.y);
      if (dist < 140) {
        success = true;
        // Make defender temporarily stunned/confused
        def.vx = -def.vx * 1.5;
        def.vy = -def.vy * 1.5;
      }
    });

    if (success) {
      dribblesRef.current += 1;
      const points = 20;
      scoreRef.current += points;
      
      // Charge Magia del 10
      if (!p.isMagicActive) {
        p.magic = Math.min(100, p.magic + 25);
        if (p.magic >= 100) {
          spawnAlert("¡MAGIA DEL 10 AL 100%! ¡ACTÍVALA!", p.x, p.y - 40, "#38bdf8");
        }
      }

      // Add cool spark particles
      for (let i = 0; i < 15; i++) {
        particlesRef.current.push({
          x: p.x,
          y: p.y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          color: i % 2 === 0 ? "#38bdf8" : "#ffffff",
          size: Math.random() * 5 + 3,
          alpha: 1,
          decay: 0.04
        });
      }

      const randomComment = DRIBBLE_COMMENTS[Math.floor(Math.random() * DRIBBLE_COMMENTS.length)];
      spawnAlert(randomComment, p.x, p.y - 40, "#60a5fa");
      updateReactStats();
    } else {
      // Just a dashing wind wave effect
      for (let i = 0; i < 8; i++) {
        particlesRef.current.push({
          x: p.x,
          y: p.y,
          vx: (Math.random() - 0.5) * 4 - (p.facing === "right" ? 3 : -3),
          vy: (Math.random() - 0.5) * 2,
          color: "rgba(255, 255, 255, 0.4)",
          size: Math.random() * 4 + 2,
          alpha: 0.8,
          decay: 0.06
        });
      }
    }
  };

  // Shoot the ball towards the rival goal
  const triggerKick = () => {
    const p = playerRef.current;
    const b = ballRef.current;
    if (p.stunTimer > 0) return;

    // Can only kick if the ball is close or owned by the player
    if (b.owner === "player" || Math.hypot(p.x - b.x, p.y - b.y) < 65) {
      b.owner = "none";
      
      // Speed base
      const kickPower = p.isMagicActive ? 22 : 14;
      
      // Aiming vector towards English goal center
      const targetX = GOAL_X;
      // Allow minor aiming adjustment up/down if player pressing keys
      let targetY = 300;
      if (keysPressed.current["arrowup"] || keysPressed.current["w"]) targetY = GOAL_TOP + 30;
      if (keysPressed.current["arrowdown"] || keysPressed.current["s"]) targetY = GOAL_BOTTOM - 30;

      const angle = Math.atan2(targetY - b.y, targetX - b.x);
      b.vx = Math.cos(angle) * kickPower;
      b.vy = Math.sin(angle) * kickPower + (Math.random() - 0.5) * 2;
      
      // Make it loft into 3D space!
      b.vHeight = p.isMagicActive ? 8 : 6; 
      
      sound.playKick();

      // Spawn puff of dust
      for (let i = 0; i < 10; i++) {
        particlesRef.current.push({
          x: b.x,
          y: b.y,
          vx: -b.vx * 0.3 + (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          color: "rgba(240, 240, 240, 0.6)",
          size: Math.random() * 6 + 3,
          alpha: 0.8,
          decay: 0.05
        });
      }

      const comment = KICK_COMMENTS[Math.floor(Math.random() * KICK_COMMENTS.length)];
      spawnAlert(comment, p.x, p.y - 30, "#34d399");
    }
  };

  // Turn on the legendary "Magia del 10" special ability
  const activateMagia = () => {
    const p = playerRef.current;
    if (p.magic < 100 || p.isMagicActive) return;

    p.isMagicActive = true;
    p.magicTimer = 10; // 10 seconds of pure gold
    p.magic = 0;
    p.energy = Math.min(100, p.energy + 40); // Restore energy as well!

    sound.playSpecialAbility();

    const comment = MAGIC_COMMENTS[Math.floor(Math.random() * MAGIC_COMMENTS.length)];
    spawnAlert(comment, p.x, p.y - 40, "#f59e0b");

    // Blast celestial and white fireworks around Messi
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 7;
      particlesRef.current.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: i % 2 === 0 ? "#38bdf8" : "#ffffff",
        size: Math.random() * 6 + 4,
        alpha: 1,
        decay: 0.02,
        gravity: 0.05
      });
    }
  };

  // Game Engine Loop
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      if (gameState === "playing" && gameActiveRef.current) {
        // Decrease timer
        timeRemainingRef.current -= dt;
        if (timeRemainingRef.current <= 0) {
          timeRemainingRef.current = 0;
          endMatch();
        }

        updatePhysics(dt);
        drawGame();
        
        // Push stats to React every few frames to avoid bottlenecking
        if (Math.random() < 0.15) {
          updateReactStats();
        }
      } else if (gameState === "celebrating" || gameState === "gameover") {
        // Continue rendering animated particles/fireworks even if paused or celebrating
        updateVisualOnly(dt);
        drawGame();
      }

      requestRef.current = requestAnimationFrame(loop);
    };

    if (gameState === "playing" || gameState === "celebrating" || gameState === "gameover") {
      requestRef.current = requestAnimationFrame(loop);
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState]);

  // Visuals only physics updates during celebrations/gameover
  const updateVisualOnly = (dt: number) => {
    // Update active fireworks particles
    particlesRef.current.forEach((part, index) => {
      part.x += part.vx;
      part.y += part.vy + (part.gravity || 0);
      part.alpha -= part.decay;
      if (part.alpha <= 0) {
        particlesRef.current.splice(index, 1);
      }
    });

    // Update alerts
    alertsRef.current.forEach((alert, index) => {
      alert.timer -= dt;
      alert.y -= 1.2; // Float up
      if (alert.timer <= 0) {
        alertsRef.current.splice(index, 1);
      }
    });
  };

  // Update Game Logic and Entities Physics
  const updatePhysics = (dt: number) => {
    const p = playerRef.current;
    const b = ballRef.current;
    const gk = goalkeeperRef.current;

    runCycleRef.current += dt * (p.isMagicActive ? 15 : 10);

    // Dynamic camera tracking player
    let targetCamX = p.x - CANVAS_WIDTH / 3; // Keep Messi in left-third for better forward vision
    targetCamX = Math.max(0, Math.min(FIELD_WIDTH - CANVAS_WIDTH, targetCamX));

    // Handle Stun
    if (p.stunTimer > 0) {
      p.stunTimer -= dt;
      p.vx = 0;
      p.vy = 0;
      if (p.stunTimer <= 0) {
        p.energy = 100; // restore
      }
    } else {
      // Input running mechanics
      let ax = 0;
      let ay = 0;
      if (keysPressed.current["arrowleft"] || keysPressed.current["a"]) ax = -1;
      if (keysPressed.current["arrowright"] || keysPressed.current["d"]) ax = 1;
      if (keysPressed.current["arrowup"] || keysPressed.current["w"]) ay = -1;
      if (keysPressed.current["arrowdown"] || keysPressed.current["s"]) ay = 1;

      // Normalize diagonal speed
      if (ax !== 0 && ay !== 0) {
        ax *= 0.707;
        ay *= 0.707;
      }

      // Calculate speed with water resistance
      const isWater = getTerrainType(p.x, p.y) === "water";
      let currentSpeed = p.speed;
      if (p.isMagicActive) currentSpeed *= 1.6; // Speed boost!
      if (p.isDribbling) currentSpeed *= 1.3; // Slight surge during dribble
      if (isWater) currentSpeed *= 0.76; // Water drag

      p.vx = ax * currentSpeed;
      p.vy = ay * currentSpeed;

      // Update position
      p.x += p.vx;
      p.y += p.vy;

      // Constrain player to football pitch boundaries
      p.x = Math.max(40, Math.min(FIELD_WIDTH - 60, p.x));
      p.y = Math.max(TOP_LINE, Math.min(BOTTOM_LINE, p.y));

      // Facing orientation
      if (p.vx > 0) p.facing = "right";
      else if (p.vx < 0) p.facing = "left";

      // Spawn dust trails or water splashes
      if ((p.vx !== 0 || p.vy !== 0) && Math.random() < 0.28) {
        if (isWater) {
          particlesRef.current.push({
            x: p.x - (p.facing === "right" ? 10 : -10),
            y: p.y + 12 + (Math.random() - 0.5) * 4,
            vx: -p.vx * 0.15 + (Math.random() - 0.5) * 2,
            vy: -1.5 - Math.random() * 2,
            color: "rgba(186, 230, 253, 0.8)", // light blue water splash
            size: Math.random() * 5 + 2.2,
            alpha: 0.85,
            decay: 0.05
          });
        } else {
          particlesRef.current.push({
            x: p.x - (p.facing === "right" ? 15 : -15),
            y: p.y + 20,
            vx: -p.vx * 0.2 + (Math.random() - 0.5) * 1,
            vy: (Math.random() - 0.5) * 1,
            color: "rgba(255, 255, 255, 0.25)",
            size: Math.random() * 4 + 2,
            alpha: 0.6,
            decay: 0.05
          });
        }
      }
    }

    // Cooldown reductions
    if (p.dribbleCooldown > 0) p.dribbleCooldown -= dt;
    if (p.isDribbling && p.dribbleCooldown < 0.5) p.isDribbling = false; // complete spin
    if (p.invincibilityTime > 0) p.invincibilityTime -= dt;

    // Handle Active Magic mode
    if (p.isMagicActive) {
      p.magicTimer -= dt;
      
      // Ambient sparkles around Lionel
      if (Math.random() < 0.4) {
        particlesRef.current.push({
          x: p.x + (Math.random() - 0.5) * 40,
          y: p.y + (Math.random() - 0.5) * 50,
          vx: (Math.random() - 0.5) * 1,
          vy: -1 - Math.random() * 2,
          color: Math.random() > 0.5 ? "#38bdf8" : "#ffffff",
          size: Math.random() * 5 + 2,
          alpha: 0.9,
          decay: 0.03
        });
      }

      if (p.magicTimer <= 0) {
        p.isMagicActive = false;
        spawnAlert("¡SE ACABÓ LA MAGIA!", p.x, p.y - 40, "#94a3b8");
      }
    }

    // Ball Physics
    if (b.owner === "player") {
      // Locked to Lionel's feet
      const ballOffset = p.facing === "right" ? 22 : -22;
      b.x = p.x + ballOffset;
      b.y = p.y + 12;
      b.vx = 0;
      b.vy = 0;
      b.height = 0;
      
      // Roll ball visually
      if (p.vx !== 0 || p.vy !== 0) {
        b.angle += (p.vx > 0 ? 0.15 : -0.15);
      }
    } else if (b.owner === "none") {
      // Free rolling physics
      b.x += b.vx;
      b.y += b.vy;
      b.angle += (b.vx / 10);

      // Check ball terrain
      const isBallWater = getTerrainType(b.x, b.y) === "water";

      // Friction
      if (isBallWater && b.height < 15) {
        b.vx *= 0.94; // water slows down the rolling ball
        b.vy *= 0.94;

        if (Math.hypot(b.vx, b.vy) > 1 && Math.random() < 0.3) {
          particlesRef.current.push({
            x: b.x + (Math.random() - 0.5) * 6,
            y: b.y + (Math.random() - 0.5) * 4,
            vx: (Math.random() - 0.5) * 1.5,
            vy: -0.6 - Math.random() * 1.5,
            color: "rgba(224, 242, 254, 0.75)",
            size: Math.random() * 4.5 + 1.5,
            alpha: 0.75,
            decay: 0.06
          });
        }
      } else {
        b.vx *= 0.975;
        b.vy *= 0.975;
      }

      // 3D Ball Altitude arc
      if (b.height > 0 || b.vHeight !== 0) {
        b.height += b.vHeight;
        b.vHeight -= 0.45; // gravity pulling down
        
        if (b.height <= 0) {
          b.height = 0;
          b.vHeight = -b.vHeight * 0.4; // Bounce dampening
          b.vx *= 0.8;
          b.vy *= 0.8;
          
          if (Math.abs(b.vHeight) < 0.8) {
            b.vHeight = 0;
          }
        }
      }

      // Bound ball to field lines
      if (b.y < TOP_LINE + 15) {
        b.y = TOP_LINE + 15;
        b.vy = -b.vy * 0.6;
      }
      if (b.y > BOTTOM_LINE - 10) {
        b.y = BOTTOM_LINE - 10;
        b.vy = -b.vy * 0.6;
      }
      if (b.x < 30) {
        b.x = 30;
        b.vx = -b.vx * 0.6;
      }

      // Ball spark trail when flying
      if (Math.hypot(b.vx, b.vy) > 5) {
        particlesRef.current.push({
          x: b.x,
          y: b.y - b.height,
          vx: (Math.random() - 0.5) * 1,
          vy: (Math.random() - 0.5) * 1,
          color: p.isMagicActive ? "#f59e0b" : "rgba(255, 255, 255, 0.4)",
          size: p.isMagicActive ? Math.random() * 6 + 3 : Math.random() * 3 + 1,
          alpha: 0.8,
          decay: 0.04
        });
      }

      // Re-possess ball if Lionel walks into it
      if (p.stunTimer <= 0 && b.height < 25) {
        const pDist = Math.hypot(p.x - b.x, p.y - b.y);
        if (pDist < 35) {
          b.owner = "player";
        }
      }
    } else if (b.owner === "keeper") {
      // Locked to keeper's chest
      b.x = gk.x - 18;
      b.y = gk.y;
      b.height = 10;
      b.vx = 0;
      b.vy = 0;
    }

    // Goalkeeper AI
    const ballInRivalSide = b.x > 1500;
    const gkReactSpeed = p.isMagicActive ? gk.speed * 0.35 : gk.speed; // Slow down gk in Magic mode!

    if (ballInRivalSide) {
      // Track ball Y-position
      const dy = b.y - gk.y;
      if (Math.abs(dy) > 10) {
        gk.y += Math.sign(dy) * gkReactSpeed;
      }
    } else {
      // Return to center of goal
      const dy = 300 - gk.y;
      if (Math.abs(dy) > 5) {
        gk.y += Math.sign(dy) * (gkReactSpeed * 0.5);
      }
    }
    // Clamp keeper within goal posts
    gk.y = Math.max(GOAL_TOP + 10, Math.min(GOAL_BOTTOM - 10, gk.y));

    // Keeper Intercepts / Saves Ball
    if (b.owner === "none" && b.x > 2180 && b.x < 2250) {
      const gkDistY = Math.abs(b.y - gk.y);
      // Keeper can save if ball is within reach Y and not too high
      const maxGkReachY = p.isMagicActive ? 40 : 80;
      const maxGkReachHeight = p.isMagicActive ? 30 : 65;

      if (gkDistY < maxGkReachY && b.height < maxGkReachHeight) {
        b.owner = "keeper";
        gk.diveTimer = 0.8; // trigger dive layout
        spawnAlert("¡Atajó el arquero inglés!", gk.x - 30, gk.y - 40, "#ef4444");
        
        // Keeper boots it away after delay
        setTimeout(() => {
          if (b.owner === "keeper") {
            b.owner = "none";
            b.vx = -14 - Math.random() * 4;
            b.vy = (Math.random() - 0.5) * 8;
            b.vHeight = 5;
            sound.playKick();
            spawnAlert("¡Salida del arquero!", gk.x, gk.y - 40, "#10b981");
          }
        }, 800);
      }
    }

    // Goal Scored Detection!
    if (b.owner === "none" && b.x >= GOAL_X) {
      if (b.y >= GOAL_TOP && b.y <= GOAL_BOTTOM) {
        triggerGoalCelebration();
      } else {
        // Out of bounds / goal kick reset
        b.x = 2200;
        b.y = 300;
        b.vx = -12;
        b.vy = (Math.random() - 0.5) * 4;
        b.height = 4;
        spawnAlert("¡Saque de arco!", 2100, 300, "#94a3b8");
      }
    }

    // Defenders AI & Interactions
    defendersRef.current.forEach((def) => {
      const distToPlayer = Math.hypot(p.x - def.x, p.y - def.y);
      const isOpponentLent = p.isMagicActive;

      // Bellingham tackle celebration countdown
      if (def.tackleCelebrateTimer && def.tackleCelebrateTimer > 0) {
        def.tackleCelebrateTimer -= dt;
        def.vx = 0;
        def.vy = 0;

        // Spawn gold stars/sparkles over Bellingham celebrating
        if (Math.random() < 0.15) {
          particlesRef.current.push({
            x: def.x + (Math.random() - 0.5) * 20,
            y: def.y - def.height - 10,
            vx: (Math.random() - 0.5) * 1,
            vy: -1 - Math.random() * 1.5,
            color: "#fbbf24", // Gold stars
            size: Math.random() * 3 + 1.5,
            alpha: 0.9,
            decay: 0.05
          });
        }
      } else {
        const isDefWater = getTerrainType(def.x, def.y) === "water";
        let currentSpeed = isOpponentLent ? def.speed * 0.45 : def.speed;
        if (isDefWater) currentSpeed *= 0.78; // slow down in water!

        // Decision State
        if (p.stunTimer <= 0 && distToPlayer < 320) {
          def.state = "chase";
        } else {
          def.state = "patrol";
        }

        // Movement behavior
        if (def.state === "chase") {
          const angle = Math.atan2(p.y - def.y, p.x - def.x);
          def.vx = Math.cos(angle) * currentSpeed;
          def.vy = Math.sin(angle) * currentSpeed;
        } else {
          // Patrol up/down in their defense lines
          def.vx = 0;
          def.vy = def.patrolDir * (currentSpeed * 0.8);
          
          // Boundaries
          if (def.y < TOP_LINE + 20) {
            def.y = TOP_LINE + 20;
            def.patrolDir = 1;
          }
          if (def.y > BOTTOM_LINE - 20) {
            def.y = BOTTOM_LINE - 20;
            def.patrolDir = -1;
          }
        }
      }

      def.x += def.vx;
      def.y += def.vy;

      // Clamp defenders horizontally to their designated area to keep a uniform defense line
      const bounds = 180;
      def.x = Math.max(def.baseX - bounds, Math.min(def.baseX + bounds, def.x));

      // COLLISION WITH PLAYER (Tackles)
      if (distToPlayer < 30 && p.stunTimer <= 0 && p.invincibilityTime <= 0 && !p.isDribbling) {
        p.energy = Math.max(0, p.energy - 20);
        sound.playTackled();

        // Trigger Jude Bellingham open arms pose!
        def.tackleCelebrateTimer = 1.6;
        def.vx = 0;
        def.vy = 0;

        // Bounce back effect
        const angle = Math.atan2(p.y - def.y, p.x - def.x);
        p.x += Math.cos(angle) * 40;
        p.y += Math.sin(angle) * 40;
        p.invincibilityTime = 1.0; // Invincibility grace

        // Spark red collision particles
        for (let i = 0; i < 10; i++) {
          particlesRef.current.push({
            x: p.x,
            y: p.y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            color: "#ef4444",
            size: Math.random() * 5 + 2,
            alpha: 1,
            decay: 0.05
          });
        }

        if (p.energy <= 0) {
          // Stun player
          p.stunTimer = 1.5;
          timeRemainingRef.current = Math.max(0, timeRemainingRef.current - 5); // 5 sec penalty!
          b.owner = "none";
          b.vx = (Math.random() - 0.5) * 4;
          b.vy = (Math.random() - 0.5) * 4;
          
          spawnAlert("¡LESIONADO! -5 SEGUNDOS", p.x, p.y - 45, "#ef4444");
        } else {
          const comment = TACKLE_COMMENTS[Math.floor(Math.random() * TACKLE_COMMENTS.length)];
          spawnAlert(comment, p.x, p.y - 40, "#f87171");
        }
        updateReactStats();
      }
    });

    // Update Particles
    particlesRef.current.forEach((part, index) => {
      part.x += part.vx;
      part.y += part.vy + (part.gravity || 0);
      part.alpha -= part.decay;
      if (part.alpha <= 0) {
        particlesRef.current.splice(index, 1);
      }
    });

    // Update alerts
    alertsRef.current.forEach((alert, index) => {
      alert.timer -= dt;
      alert.y -= 1.0; // Float up
      if (alert.timer <= 0) {
        alertsRef.current.splice(index, 1);
      }
    });
  };

  // Triggers Goal Event!
  const triggerGoalCelebration = () => {
    gameActiveRef.current = false;
    setGameState("celebrating");
    sound.playGoal();

    // Stats increase
    goalsRef.current += 1;
    scoreRef.current += 100;
    updateReactStats();

    const randomGoalComment = GOAL_COMMENTS[Math.floor(Math.random() * GOAL_COMMENTS.length)];
    spawnAlert(randomGoalComment, 2200, 300, "#f59e0b");

    // Blast celebration fireworks
    for (let f = 0; f < 5; f++) {
      setTimeout(() => {
        const fireworkX = 1800 + Math.random() * 500;
        const fireworkY = 100 + Math.random() * 200;
        
        // Colors: Celeste, White, Gold
        const colors = ["#38bdf8", "#ffffff", "#f59e0b", "#34d399"];
        const color = colors[Math.floor(Math.random() * colors.length)];

        for (let i = 0; i < 40; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 8;
          particlesRef.current.push({
            x: fireworkX,
            y: fireworkY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color,
            size: Math.random() * 6 + 3,
            alpha: 1,
            decay: 0.02,
            gravity: 0.04
          });
        }
      }, f * 250);
    }

    // Reset positions after celebration banner finishes
    setTimeout(() => {
      if (timeRemainingRef.current > 0) {
        resetPlayPosition();
        gameActiveRef.current = true;
        setGameState("playing");
      }
    }, 3200);
  };

  // Complete Match Ending
  const endMatch = () => {
    gameActiveRef.current = false;
    setGameState("gameover");
    sound.playWhistle();
    sound.stopCrowdHum();

    // Check High Score
    const saved = localStorage.getItem("el_10_high_score");
    const currentHighScore = saved ? parseInt(saved, 10) : 0;
    if (scoreRef.current > currentHighScore) {
      localStorage.setItem("el_10_high_score", scoreRef.current.toString());
      setStats(prev => ({ ...prev, highScore: scoreRef.current }));
      spawnAlert("¡NUEVO RÉCORD HISTÓRICO!", 600, 300, "#f59e0b");
    }
    updateReactStats();
  };

  // CANVAS DRAWING ENGINE
  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear Screen
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const cameraX = Math.max(0, Math.min(FIELD_WIDTH - CANVAS_WIDTH, playerRef.current.x - CANVAS_WIDTH / 3));

    // 1. Draw Sky & Stadium Stands
    drawStadium(ctx, cameraX);

    // 2. Draw Green Grass and White lines
    drawPitch(ctx, cameraX);

    // 3. Draw Goalkeeper
    drawGoalkeeper(ctx, goalkeeperRef.current, cameraX);

    // 4. Draw English Defenders
    drawDefenders(ctx, defendersRef.current, cameraX);

    // 5. Draw Player (El 10)
    drawPlayer(ctx, playerRef.current, cameraX);

    // 6. Draw Ball
    drawBall(ctx, ballRef.current, cameraX);

    // 7. Draw Confetti & Spray particles
    drawParticles(ctx, cameraX);

    // 8. Draw Alerts (Comic popups)
    drawAlerts(ctx, cameraX);
  };

  const drawStadium = (ctx: CanvasRenderingContext2D, cameraX: number) => {
    // Midnight Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 110);
    skyGrad.addColorStop(0, "#0b0f19");
    skyGrad.addColorStop(1, "#1e293b");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, 110);

    // Stadium Floodlights
    const lightPositions = [150, 450, 750, 1050, 1350, 1650, 1950, 2250];
    lightPositions.forEach((lx) => {
      const rx = lx - cameraX;
      if (rx < -80 || rx > CANVAS_WIDTH + 80) return;

      // Glow cone
      const glowGrad = ctx.createLinearGradient(rx, 15, rx, 110);
      glowGrad.addColorStop(0, "rgba(253, 224, 71, 0.25)");
      glowGrad.addColorStop(1, "rgba(253, 224, 71, 0)");
      ctx.fillStyle = glowGrad;

      ctx.beginPath();
      ctx.moveTo(rx, 15);
      ctx.lineTo(rx - 70, 110);
      ctx.lineTo(rx + 70, 110);
      ctx.closePath();
      ctx.fill();

      // Metallic light structure
      ctx.fillStyle = "#475569";
      ctx.fillRect(rx - 15, 2, 30, 8);
      ctx.fillStyle = "#fef08a"; // illuminated bulbs
      ctx.beginPath();
      ctx.arc(rx - 8, 8, 4, 0, Math.PI * 2);
      ctx.arc(rx, 8, 4, 0, Math.PI * 2);
      ctx.arc(rx + 8, 8, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Crowd Stands (Dotted texture representing cheering people)
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 60, CANVAS_WIDTH, 45);

    // Red, Blue, White spectators waving
    ctx.font = "8px sans-serif";
    const dotSpacing = 7;
    for (let x = 0; x < CANVAS_WIDTH; x += dotSpacing) {
      // Create wave offset
      const wave = Math.sin((x + cameraX) * 0.05 + runCycleRef.current * 0.5) * 4;
      
      // Argentine fans on left side, english on right side
      const pitchGlobalX = x + cameraX;
      const isArgentinaSec = pitchGlobalX < FIELD_WIDTH * 0.7;

      ctx.fillStyle = isArgentinaSec 
        ? (x % 3 === 0 ? "#38bdf8" : (x % 3 === 1 ? "#ffffff" : "#0284c7")) // Celeste-White
        : (x % 3 === 0 ? "#ef4444" : (x % 3 === 1 ? "#ffffff" : "#1e3a8a")); // Red-White

      ctx.beginPath();
      ctx.arc(x, 75 + wave, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Occasional flashing phone camera flares
      if (Math.random() < 0.003) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x, 75 + wave, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Ad banners behind touchline
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 95, CANVAS_WIDTH, 12);
    
    // Draw ad slogans
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 8px monospace";
    const sloganSpacing = 350;
    for (let s = 0; s < 10; s++) {
      const sx = (s * sloganSpacing) - cameraX;
      if (sx > -150 && sx < CANVAS_WIDTH + 150) {
        ctx.fillText("⭐ LA PELOTA SIEMPRE AL 10 ⭐", sx, 104);
        ctx.fillStyle = "#38bdf8";
        ctx.fillText("EL 10 CONTRA INGLATERRA", sx + 160, 104);
        ctx.fillStyle = "#ffffff";
      }
    }
  };

  // Falkland/Malvinas Islands Path Helpers
  const drawWestFalklandPath = (c: CanvasRenderingContext2D, cX: number, scaleOffset = 0) => {
    c.beginPath();
    c.moveTo(80 - cX - scaleOffset, 240 - scaleOffset);
    c.bezierCurveTo(150 - cX, 120 - scaleOffset, 450 - cX, 90 - scaleOffset, 650 - cX, 130 - scaleOffset); // North coast
    c.bezierCurveTo(750 - cX, 150, 900 - cX, 120, 1000 - cX + scaleOffset, 180 - scaleOffset); // Indentation
    c.bezierCurveTo(1100 - cX + scaleOffset, 220, 1120 - cX + scaleOffset, 320, 1080 - cX + scaleOffset, 420 + scaleOffset); // East coast
    c.bezierCurveTo(1000 - cX, 480, 850 - cX, 530 + scaleOffset, 650 - cX, 520 + scaleOffset); // South-east coast
    c.bezierCurveTo(450 - cX, 510, 250 - cX, 540 + scaleOffset, 150 - cX - scaleOffset, 480 + scaleOffset); // Southwest
    c.bezierCurveTo(70 - cX - scaleOffset, 440, 50 - cX - scaleOffset, 320, 80 - cX - scaleOffset, 240 - scaleOffset);
    c.closePath();
  };

  const drawEastFalklandPath = (c: CanvasRenderingContext2D, cX: number, scaleOffset = 0) => {
    c.beginPath();
    c.moveTo(1320 - cX - scaleOffset, 180 - scaleOffset);
    c.bezierCurveTo(1450 - cX, 110 - scaleOffset, 1850 - cX, 100 - scaleOffset, 2150 - cX + scaleOffset, 140 - scaleOffset); // North coast
    c.bezierCurveTo(2280 - cX + scaleOffset, 160, 2350 - cX + scaleOffset, 250, 2320 - cX + scaleOffset, 350 + scaleOffset); // East coast
    c.bezierCurveTo(2250 - cX + scaleOffset, 420, 2050 - cX + scaleOffset, 440, 1950 - cX + scaleOffset, 420 + scaleOffset); // Southeast
    c.bezierCurveTo(1850 - cX, 460, 1850 - cX, 540 + scaleOffset, 1750 - cX, 530 + scaleOffset); // Lafonia southern bulge
    c.bezierCurveTo(1600 - cX, 520, 1550 - cX, 480, 1520 - cX, 390); // Isthmus indent near Goose Green
    c.bezierCurveTo(1480 - cX, 370, 1400 - cX, 390, 1340 - cX - scaleOffset, 440 + scaleOffset); // Southwest
    c.bezierCurveTo(1260 - cX - scaleOffset, 320, 1260 - cX - scaleOffset, 240, 1320 - cX - scaleOffset, 180 - scaleOffset);
    c.closePath();
  };

  const drawPitch = (ctx: CanvasRenderingContext2D, cameraX: number) => {
    // 1. Draw Deep Blue Ocean Background
    const oceanGrad = ctx.createLinearGradient(0, TOP_LINE, 0, CANVAS_HEIGHT);
    oceanGrad.addColorStop(0, "#0284c7"); // beautiful deep sky-blue ocean
    oceanGrad.addColorStop(1, "#0369a1");
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, TOP_LINE, CANVAS_WIDTH, FIELD_HEIGHT - TOP_LINE);

    // Scrolling ocean waves
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 2;
    const waveSpacing = 60;
    const waveOffset = (runCycleRef.current * 1.5) % waveSpacing;
    for (let y = TOP_LINE + 10; y < BOTTOM_LINE + 50; y += waveSpacing) {
      ctx.beginPath();
      for (let x = 0; x < CANVAS_WIDTH + 40; x += 40) {
        const waveY = y + Math.sin((x + cameraX) * 0.01 + runCycleRef.current * 0.25) * 5 - waveOffset;
        if (x === 0) ctx.moveTo(x, waveY);
        else ctx.lineTo(x, waveY);
      }
      ctx.stroke();
    }

    // 2. Draw Falkland Sound Shallow Water (Turquoise Strait of San Carlos)
    // Centered horizontally around 1200
    const soundLeft = 1110 - cameraX;
    const soundRight = 1290 - cameraX;
    if (soundRight > 0 && soundLeft < CANVAS_WIDTH) {
      const shallowGrad = ctx.createLinearGradient(soundLeft, 0, soundRight, 0);
      shallowGrad.addColorStop(0, "rgba(56, 189, 248, 0.15)");
      shallowGrad.addColorStop(0.3, "rgba(56, 189, 248, 0.45)"); // shallower at center sandbar
      shallowGrad.addColorStop(0.7, "rgba(56, 189, 248, 0.45)");
      shallowGrad.addColorStop(1, "rgba(56, 189, 248, 0.15)");
      ctx.fillStyle = shallowGrad;
      ctx.fillRect(soundLeft, TOP_LINE, 180, FIELD_HEIGHT - TOP_LINE);

      // Shallow sand ripples
      ctx.strokeStyle = "rgba(253, 224, 71, 0.12)";
      ctx.lineWidth = 1.5;
      for (let ry = TOP_LINE + 15; ry < BOTTOM_LINE + 40; ry += 35) {
        ctx.beginPath();
        ctx.arc(soundLeft + 90, ry, 60, Math.PI * 0.8, Math.PI * 1.2);
        ctx.stroke();
      }
    }

    // 3. Draw Sandy Beach Outline for both islands (rendered slightly larger)
    ctx.fillStyle = "#fde047"; // Warm golden sand
    drawWestFalklandPath(ctx, cameraX, 9);
    ctx.fill();
    drawEastFalklandPath(ctx, cameraX, 9);
    ctx.fill();

    // 4. Draw Grassy Surface (the interior of the islands) with turf stripes
    // West Falkland interior
    ctx.save();
    drawWestFalklandPath(ctx, cameraX, 0);
    ctx.clip();
    const stripeWidth = 80;
    const startStripe = Math.floor(cameraX / stripeWidth);
    const endStripe = Math.ceil((cameraX + CANVAS_WIDTH) / stripeWidth);
    for (let s = startStripe; s <= endStripe; s++) {
      ctx.fillStyle = s % 2 === 0 ? "#15803d" : "#166534"; // rich lawn greens
      const rx = s * stripeWidth - cameraX;
      ctx.fillRect(rx, 0, stripeWidth, CANVAS_HEIGHT);
    }
    ctx.restore();

    // East Falkland interior
    ctx.save();
    drawEastFalklandPath(ctx, cameraX, 0);
    ctx.clip();
    for (let s = startStripe; s <= endStripe; s++) {
      ctx.fillStyle = s % 2 === 0 ? "#15803d" : "#166534";
      const rx = s * stripeWidth - cameraX;
      ctx.fillRect(rx, 0, stripeWidth, CANVAS_HEIGHT);
    }
    ctx.restore();

    // 5. White Chalk Boundary Outline following the coastlines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
    ctx.lineWidth = 3.5;
    
    ctx.save();
    drawWestFalklandPath(ctx, cameraX, 0);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    drawEastFalklandPath(ctx, cameraX, 0);
    ctx.stroke();
    ctx.restore();

    // 6. Traditional Soccer Chalk markings (semi-transparent overlays)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 3;

    // Center circle & Center line (crossing the Sound playfully!)
    const midX = FIELD_WIDTH / 2 - cameraX;
    if (midX > -150 && midX < CANVAS_WIDTH + 150) {
      ctx.beginPath();
      ctx.arc(midX, 315, 75, 0, Math.PI * 2);
      ctx.moveTo(midX, TOP_LINE + 10);
      ctx.lineTo(midX, BOTTOM_LINE - 10);
      ctx.stroke();
    }

    // Penalty area (on right island / East Falkland)
    const penAreaLeft = 2050 - cameraX;
    if (penAreaLeft < CANVAS_WIDTH) {
      ctx.beginPath();
      ctx.rect(penAreaLeft, 180, 250, 270);
      ctx.stroke();

      // Penalty Spot
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.beginPath();
      ctx.arc(GOAL_X - 110 - cameraX, 315, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Draw Rustic Wooden Bridge crossing the Sound
    // Connects West & East Falkland in the center (around y = 265 to 365)
    if (soundRight > 0 && soundLeft < CANVAS_WIDTH) {
      const bridgeY = 265;
      const bridgeH = 100;

      // Under support poles
      ctx.fillStyle = "#451a03"; // dark wood
      ctx.fillRect(soundLeft + 30, bridgeY - 5, 8, bridgeH + 15);
      ctx.fillRect(soundRight - 38, bridgeY - 5, 8, bridgeH + 15);

      // Main bridge deck (draw planks)
      const plankW = 10;
      for (let px = soundLeft + 4; px <= soundRight - 4; px += plankW + 2) {
        ctx.fillStyle = (Math.floor(px) % 3 === 0) ? "#7c2d12" : "#9a3412"; // warm timber wood
        ctx.fillRect(px, bridgeY, plankW, bridgeH);
        // lines between planks
        ctx.fillStyle = "#451a03";
        ctx.fillRect(px + plankW, bridgeY, 2, bridgeH);
      }

      // Handrails / Ropes
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(soundLeft, bridgeY + 3);
      ctx.lineTo(soundRight, bridgeY + 3);
      ctx.moveTo(soundLeft, bridgeY + bridgeH - 3);
      ctx.lineTo(soundRight, bridgeY + bridgeH - 3);
      ctx.stroke();

      // Rail rope details (vertical ties)
      ctx.strokeStyle = "#ea580c";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let px = soundLeft + 15; px <= soundRight - 15; px += 30) {
        ctx.moveTo(px, bridgeY);
        ctx.lineTo(px, bridgeY + 8);
        ctx.moveTo(px, bridgeY + bridgeH);
        ctx.lineTo(px, bridgeY + bridgeH - 8);
      }
      ctx.stroke();
    }

    // 8. Draw Cute Animated Cartoon Penguin standing on a Rock in the Sound
    if (soundRight > 0 && soundLeft < CANVAS_WIDTH) {
      const px = 1200 - cameraX;
      const py = 160;

      // Draw rock
      ctx.fillStyle = "#64748b";
      ctx.beginPath();
      ctx.ellipse(px, py + 8, 15, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#475569";
      ctx.beginPath();
      ctx.ellipse(px - 3, py + 5, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw little penguin
      ctx.save();
      ctx.translate(px, py);
      
      // Idle bounce
      const bounce = Math.abs(Math.sin(runCycleRef.current * 0.15)) * 2.2;
      ctx.translate(0, -bounce);

      // penguin body
      ctx.fillStyle = "#0f172a"; // dark grey/black body
      ctx.beginPath();
      ctx.ellipse(0, 0, 8.5, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // white belly
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(0, 2, 5.2, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // yellow feet
      ctx.fillStyle = "#ea580c";
      ctx.beginPath();
      ctx.ellipse(-4, 11, 3.5, 2, 0, 0, Math.PI * 2);
      ctx.ellipse(4, 11, 3.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Flippers
      ctx.fillStyle = "#0f172a";
      ctx.save();
      // Wave flippers if celebrated
      if (gameState === "celebrating") {
        ctx.rotate(Math.sin(runCycleRef.current * 0.8) * 0.5);
      }
      ctx.fillRect(-11, -3, 3, 7);
      ctx.restore();

      ctx.save();
      if (gameState === "celebrating") {
        ctx.rotate(-Math.sin(runCycleRef.current * 0.8) * 0.5);
      }
      ctx.fillRect(8, -3, 3, 7);
      ctx.restore();

      // head angle tracking the ball!
      const ball = ballRef.current;
      const angleToBall = Math.atan2(ball.y - py, (ball.x - 1200));
      ctx.translate(0, -9);
      ctx.rotate(angleToBall * 0.35); // turn head slightly to follow ball!

      // head base
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
      ctx.fill();

      // eyes
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-2, -1, 1.9, 0, Math.PI * 2);
      ctx.arc(2, -1, 1.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(-2, -1, 0.9, 0, Math.PI * 2);
      ctx.arc(2, -1, 0.9, 0, Math.PI * 2);
      ctx.fill();

      // beak
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.moveTo(0, -0.5);
      ctx.lineTo(4.5, 1);
      ctx.lineTo(0, 2.5);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    // 9. Draw Rival Goal Frame and netting
    const rx = GOAL_X - cameraX;
    // Goal post shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.fillRect(rx, GOAL_TOP, 100, GOAL_BOTTOM - GOAL_TOP + 10);

    // Goal Nets
    ctx.strokeStyle = "rgba(241, 245, 249, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = GOAL_TOP; y <= GOAL_BOTTOM; y += 10) {
      ctx.moveTo(rx, y);
      ctx.lineTo(rx + 60, y);
    }
    for (let xOffset = 0; xOffset <= 60; xOffset += 10) {
      ctx.moveTo(rx + xOffset, GOAL_TOP);
      ctx.lineTo(rx + xOffset, GOAL_BOTTOM);
    }
    ctx.stroke();

    // White goalposts
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(rx, GOAL_BOTTOM); // bottom-left post base
    ctx.lineTo(rx, GOAL_TOP);    // top corner
    ctx.lineTo(rx + 60, GOAL_TOP); // depth top bar
    ctx.lineTo(rx + 60, GOAL_BOTTOM); // back base post
    ctx.stroke();

    // Top crossbar
    ctx.beginPath();
    ctx.moveTo(rx, GOAL_TOP);
    ctx.lineTo(rx, GOAL_BOTTOM);
    ctx.stroke();
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, p: Player, cameraX: number) => {
    const rx = p.x - cameraX;
    const ry = p.y;

    // Drawing stun stars
    if (p.stunTimer > 0) {
      ctx.fillStyle = "#fef08a";
      const starAngle = runCycleRef.current * 0.8;
      for (let s = 0; s < 3; s++) {
        const sx = rx + Math.cos(starAngle + (s * Math.PI * 2) / 3) * 18;
        const sy = ry - p.height - 10 + Math.sin(starAngle + (s * Math.PI * 2) / 3) * 6;
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Special Magic Aura Ring
    if (p.isMagicActive) {
      const pulse = Math.abs(Math.sin(runCycleRef.current * 0.5)) * 10;
      ctx.strokeStyle = "rgba(56, 189, 248, 0.8)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(rx, ry + 15, 24 + pulse, 10 + pulse * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(rx, ry + 15, 14 + pulse * 0.5, 6 + pulse * 0.2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Invincibility shield opacity
    ctx.save();
    if (p.invincibilityTime > 0 && Math.floor(timeRemainingRef.current * 15) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Running limb motion
    const leftLegOffset = Math.sin(runCycleRef.current) * 14;
    const rightLegOffset = -Math.sin(runCycleRef.current) * 14;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(rx, ry + 15, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- LEGS ---
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    // Left Leg
    ctx.strokeStyle = "#000000"; // socks/pants black
    ctx.beginPath();
    ctx.moveTo(rx - 6, ry + 4);
    ctx.lineTo(rx - 8 + leftLegOffset * 0.4, ry + 15);
    ctx.stroke();
    // Shoes Left (Argentine gold spark)
    ctx.fillStyle = "#eab308";
    ctx.beginPath();
    ctx.arc(rx - 8 + leftLegOffset * 0.4 + (p.facing === "right" ? 3 : -3), ry + 15, 4, 0, Math.PI * 2);
    ctx.fill();

    // Right Leg
    ctx.strokeStyle = "#000000";
    ctx.beginPath();
    ctx.moveTo(rx + 6, ry + 4);
    ctx.lineTo(rx + 4 + rightLegOffset * 0.4, ry + 15);
    ctx.stroke();
    // Shoes Right
    ctx.fillStyle = "#eab308";
    ctx.beginPath();
    ctx.arc(rx + 4 + rightLegOffset * 0.4 + (p.facing === "right" ? 3 : -3), ry + 15, 4, 0, Math.PI * 2);
    ctx.fill();

    // --- TORSO (Camiseta Celeste y Blanca #10) ---
    // Width is slimmer to portray low stature messi
    const torsoW = 22;
    const torsoH = 26;
    const tx = rx - torsoW / 2;
    const ty = ry - torsoH;

    // Base White shirt
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(tx, ty, torsoW, torsoH);

    // Celeste vertical stripes
    ctx.fillStyle = "#7dd3fc";
    ctx.fillRect(tx + 2, ty, 4, torsoH);
    ctx.fillRect(tx + 9, ty, 4, torsoH);
    ctx.fillRect(tx + 16, ty, 4, torsoH);

    // Black Shorts
    ctx.fillStyle = "#111827";
    ctx.fillRect(tx, ty + torsoH - 5, torsoW, 6);

    // Arm details with Captain Armband
    ctx.fillStyle = "#7dd3fc";
    const armX = p.facing === "right" ? rx - 13 : rx + 9;
    ctx.fillRect(armX, ty + 2, 4, 12);
    
    // Captain armband
    ctx.fillStyle = "#fef08a"; // gold yellow
    ctx.fillRect(armX, ty + 5, 4, 4);
    ctx.fillStyle = "#111827";
    ctx.font = "bold 5px sans-serif";
    ctx.fillText("C", armX + 0.5, ty + 9);

    ctx.fillStyle = "#fbcfe8"; // skin hand
    ctx.fillRect(armX, ty + 14, 4, 4);

    // Number 10 print on back (facing left displays rear side of shirt, facing right prints number)
    ctx.fillStyle = "#0284c7";
    ctx.font = "bold 10px sans-serif";
    if (p.facing === "right") {
      ctx.fillText("10", rx - 8, ry - 11);
    } else {
      ctx.fillText("10", rx - 4, ry - 11);
    }

    // --- HEAD (Messiesque facial features, dark hair, beard) ---
    const headRadius = 13;
    const hx = rx;
    const hy = ry - torsoH - headRadius + 3;

    // Beard
    ctx.fillStyle = "#2d1a10"; // copper brown beard
    ctx.beginPath();
    ctx.arc(hx, hy + 3, headRadius + 0.5, 0, Math.PI);
    ctx.fill();

    // Skin
    ctx.fillStyle = "#fbcfe8";
    ctx.beginPath();
    ctx.arc(hx, hy, headRadius - 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Beard Mouth details
    ctx.fillStyle = "#2d1a10";
    ctx.fillRect(hx - 3, hy + 4, 6, 2);

    // Eyes
    ctx.fillStyle = "#000000";
    const eyeOffset = p.facing === "right" ? 3 : -3;
    ctx.beginPath();
    ctx.arc(hx + eyeOffset, hy - 2, 2, 0, Math.PI * 2);
    ctx.arc(hx + eyeOffset + (p.facing === "right" ? 5 : -5), hy - 2, 2, 0, Math.PI * 2);
    ctx.fill();

    // Stylish dark hair
    ctx.fillStyle = "#1c1917";
    ctx.beginPath();
    // Hair cap
    ctx.arc(hx, hy - 4, headRadius - 0.5, Math.PI, 0);
    ctx.fill();
    // Hair tuft
    ctx.fillRect(hx - (p.facing === "right" ? 2 : 10), hy - 16, 12, 6);

    ctx.restore();
  };

  const drawDefenders = (ctx: CanvasRenderingContext2D, defenders: Defender[], cameraX: number) => {
    defenders.forEach((def) => {
      const rx = def.x - cameraX;
      const ry = def.y;

      if (rx < -80 || rx > CANVAS_WIDTH + 80) return;

      const isCelebrating = def.tackleCelebrateTimer && def.tackleCelebrateTimer > 0;

      // Animated run limb offsets (only if not celebrating)
      const leftLegOffset = isCelebrating ? 0 : Math.sin(runCycleRef.current * 0.9 + def.id) * 15;
      const rightLegOffset = isCelebrating ? 0 : -Math.sin(runCycleRef.current * 0.9 + def.id) * 15;

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.ellipse(rx, ry + 15, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Legs
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#ffffff"; // White socks
      ctx.beginPath();
      ctx.moveTo(rx - 7, ry + 2);
      ctx.lineTo(rx - 9 + leftLegOffset * 0.4, ry + 15);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(rx + 7, ry + 2);
      ctx.lineTo(rx + 5 + rightLegOffset * 0.4, ry + 15);
      ctx.stroke();

      // English Blue/Red Shoes
      ctx.fillStyle = "#1e3a8a"; // Navy boots
      ctx.beginPath();
      ctx.arc(rx - 9 + leftLegOffset * 0.4 + 2, ry + 15, 4.5, 0, Math.PI * 2);
      ctx.arc(rx + 5 + rightLegOffset * 0.4 + 2, ry + 15, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Torso (White English Jersey with Red side stripes, Number 5 print)
      const torsoW = 26; // athletic bellingham torso
      const torsoH = 34;
      const tx = rx - torsoW / 2;
      const ty = ry - torsoH;

      ctx.fillStyle = "#ffffff"; // English white jersey
      ctx.fillRect(tx, ty, torsoW, torsoH);

      // Red sleeve collar details
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(tx, ty, torsoW, 3); // collar
      ctx.fillRect(tx, ty, 3, torsoH - 8); // left side stripe
      ctx.fillRect(tx + torsoW - 3, ty, 3, torsoH - 8); // right side stripe

      // Dark Blue Shorts
      ctx.fillStyle = "#1e3a8a";
      ctx.fillRect(tx, ty + torsoH - 6, torsoW, 7);

      // Print Bellingham's iconic Number 5!
      ctx.fillStyle = "#0f172a"; // navy blue print
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("5", rx - 4, ty + 16);

      // Arm Details
      if (isCelebrating) {
        // Bellingham Outstretched Open Arms Celebration!
        ctx.fillStyle = "#b45309"; // skin hands
        ctx.fillRect(rx - 25, ty + 8, 12, 5); // left hand outstretched
        ctx.fillRect(rx + 13, ty + 8, 12, 5); // right hand outstretched
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(rx - 16, ty + 2, 4, 14);
        ctx.fillStyle = "#b45309"; // Skin hand
        ctx.fillRect(rx - 16, ty + 16, 4, 4);
      }

      // Head (Jude Bellingham Caricature)
      const headRadius = 13.5;
      const hx = rx;
      const hy = ry - torsoH - headRadius + 4;

      // Skin (caramel tan complexion)
      ctx.fillStyle = "#b45309";
      ctx.beginPath();
      ctx.arc(hx, hy, headRadius - 1, 0, Math.PI * 2);
      ctx.fill();

      // Neat black fade buzz-cut hair cap
      ctx.fillStyle = "#1c1917";
      ctx.beginPath();
      ctx.arc(hx, hy - 4, headRadius - 0.5, Math.PI, 0);
      ctx.fill();
      // Side hair trim details
      ctx.fillRect(hx - 13, hy - 4, 3, 6);
      ctx.fillRect(hx + 10, hy - 4, 3, 6);

      // Facial expressions
      if (isCelebrating) {
        // Smug closed-eyes smiling face
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 1.5;
        // Closed smiling eyes
        ctx.beginPath();
        ctx.arc(hx - 4, hy - 1, 2, Math.PI, 0);
        ctx.arc(hx + 4, hy - 1, 2, Math.PI, 0);
        ctx.stroke();

        // Happy smug smile mouth
        ctx.beginPath();
        ctx.arc(hx, hy + 4, 4, 0, Math.PI);
        ctx.stroke();

        // Tiny crown or halo over Bellingham celebrating
        ctx.fillStyle = "#f59e0b";
        ctx.font = "11px sans-serif";
        ctx.fillText("👑", hx - 6, hy - 19);
      } else {
        // Focused game face
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(hx - 4, hy - 2, 1.8, 0, Math.PI * 2);
        ctx.arc(hx + 4, hy - 2, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Determined straight line mouth
        ctx.fillStyle = "#7c2d12";
        ctx.fillRect(hx - 3, hy + 4, 6, 2);

        // Brows
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(hx - 6, hy - 5); ctx.lineTo(hx - 1, hy - 3);
        ctx.moveTo(hx + 6, hy - 5); ctx.lineTo(hx + 1, hy - 3);
        ctx.stroke();
      }
    });
  };

  const drawGoalkeeper = (ctx: CanvasRenderingContext2D, gk: Goalkeeper, cameraX: number) => {
    const rx = gk.x - cameraX;
    const ry = gk.y;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(rx, ry + 15, 22, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    const torsoW = 30;
    const torsoH = 34;
    const tx = rx - torsoW / 2;
    const ty = ry - torsoH;

    // Neon Green Goalkeeper Jersey
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(tx, ty, torsoW, torsoH);

    // Black sleeves
    ctx.fillStyle = "#000000";
    ctx.fillRect(tx, ty, 4, torsoH - 10);
    ctx.fillRect(tx + torsoW - 4, ty, 4, torsoH - 10);

    // Goalkeeper Gloves
    ctx.fillStyle = "#f97316"; // Bright Orange gloves
    ctx.fillRect(tx - 3, ty + torsoH - 14, 5, 8);
    ctx.fillRect(tx + torsoW - 2, ty + torsoH - 14, 5, 8);

    // Shorts
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(tx, ty + torsoH - 6, torsoW, 7);

    // Legs
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(rx - 7, ry + 2);
    ctx.lineTo(rx - 7, ry + 15);
    ctx.moveTo(rx + 7, ry + 2);
    ctx.lineTo(rx + 7, ry + 15);
    ctx.stroke();

    // Head
    const headRadius = 14;
    const hx = rx;
    const hy = ry - torsoH - headRadius + 4;

    ctx.fillStyle = "#fed7aa";
    ctx.beginPath();
    ctx.arc(hx, hy, headRadius - 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = "#451a03";
    ctx.beginPath();
    ctx.arc(hx, hy - 4, headRadius - 0.5, Math.PI, 0);
    ctx.fill();

    // Focus eyes
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(hx - 3, hy - 1, 2, 0, Math.PI * 2);
    ctx.arc(hx + 3, hy - 1, 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawBall = (ctx: CanvasRenderingContext2D, b: Ball, cameraX: number) => {
    const rx = b.x - cameraX;
    const ry = b.y - b.height;

    // 1. Shadow underneath (increases & fades based on height)
    const shadowSize = Math.max(4, b.radius - b.height * 0.12);
    const shadowAlpha = Math.max(0.05, 0.35 - b.height * 0.005);
    
    ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(rx, b.y + 12, shadowSize + 4, shadowSize * 0.5 + 1, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Ball circular base
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(b.angle);

    // Outer shell
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pentagons soccer drawing patterns
    ctx.fillStyle = "#1e293b";
    
    // Center pentagon
    ctx.beginPath();
    const r = b.radius * 0.38;
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Outer panels
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const px1 = Math.cos(angle) * r;
      const py1 = Math.sin(angle) * r;
      const px2 = Math.cos(angle) * b.radius;
      const py2 = Math.sin(angle) * b.radius;
      ctx.moveTo(px1, py1);
      ctx.lineTo(px2, py2);
    }
    ctx.stroke();

    ctx.restore();
  };

  const drawParticles = (ctx: CanvasRenderingContext2D, cameraX: number) => {
    particlesRef.current.forEach((part) => {
      const rx = part.x - cameraX;
      if (rx < -10 || rx > CANVAS_WIDTH + 10) return;

      ctx.save();
      ctx.globalAlpha = part.alpha;
      ctx.fillStyle = part.color;
      ctx.beginPath();
      ctx.arc(rx, part.y, part.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  };

  const drawAlerts = (ctx: CanvasRenderingContext2D, cameraX: number) => {
    alertsRef.current.forEach((alert) => {
      const rx = alert.x - cameraX;
      
      ctx.save();
      ctx.globalAlpha = Math.min(1.0, alert.timer * 1.5);
      
      // Box backdrop
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.strokeStyle = alert.color;
      ctx.lineWidth = 2;
      
      ctx.font = "bold 13px monospace";
      const textWidth = ctx.measureText(alert.text).width;
      const paddingX = 14;
      const paddingY = 8;

      ctx.beginPath();
      ctx.roundRect(rx - textWidth / 2 - paddingX, alert.y - 12 - paddingY, textWidth + paddingX * 2, 24 + paddingY, 6);
      ctx.fill();
      ctx.stroke();

      // Comic Arrow indicator
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.beginPath();
      ctx.moveTo(rx - 6, alert.y + 16);
      ctx.lineTo(rx, alert.y + 24);
      ctx.lineTo(rx + 6, alert.y + 16);
      ctx.closePath();
      ctx.fill();

      // Text
      ctx.fillStyle = alert.color;
      ctx.textAlign = "center";
      ctx.fillText(alert.text, rx, alert.y + 6);

      ctx.restore();
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between overflow-x-hidden select-none">
      
      {/* HEADER SECTION */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 shadow-lg z-10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
            <span className="font-extrabold text-lg">10</span>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              EL 10 <span className="text-sky-400">CONTRA INGLATERRA</span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">Dribble & Goal 2D Cartoon Arcade</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* High score badge */}
          <div className="bg-slate-950 border border-amber-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500 animate-pulse" />
            <div className="text-left">
              <p className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Récord Máximo</p>
              <p className="text-sm font-black text-amber-400 font-mono">{stats.highScore} pts</p>
            </div>
          </div>

          {/* Sound toggle */}
          <button
            onClick={handleToggleMute}
            className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            title={isMuted ? "Activar Sonido" : "Silenciar"}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>

          {/* Help instructions button */}
          <button
            onClick={() => setShowInstructions(true)}
            className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            title="Instrucciones"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* MAIN GAME CONTAINER */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 w-full max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          
          {/* START PANEL */}
          {gameState === "start" && (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 w-full max-w-2xl text-center shadow-2xl relative overflow-hidden"
            >
              {/* Decorative Stripes background */}
              <div className="absolute inset-x-0 top-0 h-3 flex">
                <div className="flex-1 bg-sky-400" />
                <div className="flex-1 bg-white" />
                <div className="flex-1 bg-sky-400" />
              </div>

              <div className="mb-6 inline-flex p-4 bg-sky-500/10 border border-sky-500/30 rounded-full text-sky-400">
                <Sparkles className="w-12 h-12" />
              </div>

              <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-2 leading-none">
                EL 10 <span className="text-sky-400 block sm:inline">CONTRA INGLATERRA</span>
              </h2>
              <p className="text-sm text-slate-300 max-w-md mx-auto mb-8 font-mono">
                ¡Esquivá los defensores ingleses con gambetas increíbles, cargá tu barra de magia y convertí goles épicos con el mejor futbolista argentino!
              </p>

              {/* Instructions summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-lg mx-auto mb-8">
                <div className="bg-slate-950/60 p-3.5 border border-slate-800/80 rounded-xl">
                  <p className="font-bold text-sky-400 text-sm mb-1 flex items-center gap-1.5">
                    🎮 Controles de Teclado
                  </p>
                  <ul className="text-xs text-slate-400 space-y-1 font-mono">
                    <li>• <span className="text-slate-200 font-bold">Moverse:</span> Flechas o WASD</li>
                    <li>• <span className="text-slate-200 font-bold">Patear:</span> Barra Espaciadora</li>
                    <li>• <span className="text-slate-200 font-bold">Gambeta Especial:</span> Tecla E</li>
                  </ul>
                </div>
                
                <div className="bg-slate-950/60 p-3.5 border border-slate-800/80 rounded-xl">
                  <p className="font-bold text-amber-400 text-sm mb-1 flex items-center gap-1.5">
                    ✨ Magia del 10
                  </p>
                  <p className="text-xs text-slate-400 font-mono leading-relaxed">
                    Hacé gambetas cerca de los defensores para cargar tu barra. ¡Al activarla, correrás al doble de velocidad, los ingleses quedarán lentos y tu remate será imparable!
                  </p>
                </div>
              </div>

              <button
                onClick={startMatch}
                className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-black text-xl rounded-xl shadow-lg shadow-sky-500/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex items-center justify-center gap-2 mx-auto"
              >
                <Play className="w-6 h-6 fill-current" />
                ¡JUGAR PARTIDO!
              </button>
            </motion.div>
          )}

          {/* ACTIVE IN-GAME SCREEN */}
          {(gameState === "playing" || gameState === "celebrating" || gameState === "gameover") && (
            <motion.div
              key="game"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col gap-4"
            >
              
              {/* GAME STATS BAR */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-xl">
                
                {/* Score */}
                <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">Puntos</p>
                    <p className="text-lg font-black font-mono text-sky-400">{stats.score}</p>
                  </div>
                </div>

                {/* Goals */}
                <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                    <span className="text-xl leading-none">⚽</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">Goles</p>
                    <p className="text-lg font-black font-mono text-emerald-400">{stats.goals}</p>
                  </div>
                </div>

                {/* Energy */}
                <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wide flex justify-between">
                      <span>Energía</span>
                      <span className="font-bold">{playerRef.current.energy}%</span>
                    </p>
                    <div className="w-full bg-slate-800 h-2 rounded-full mt-1 overflow-hidden border border-slate-700">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          playerRef.current.energy > 50 ? "bg-emerald-500" : playerRef.current.energy > 20 ? "bg-amber-500" : "bg-rose-500 animate-pulse"
                        }`}
                        style={{ width: `${playerRef.current.energy}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Time Remaining */}
                <div className={`bg-slate-950 border px-4 py-2 rounded-xl flex items-center gap-3 transition-colors ${
                  stats.timeRemaining < 15 ? "border-rose-500/30 bg-rose-950/20" : "border-slate-800"
                }`}>
                  <div className={`p-2 rounded-lg ${
                    stats.timeRemaining < 15 ? "bg-rose-500/10 text-rose-400 animate-pulse" : "bg-indigo-500/10 text-indigo-400"
                  }`}>
                    <Timer className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">Tiempo</p>
                    <p className={`text-lg font-black font-mono ${
                      stats.timeRemaining < 15 ? "text-rose-400" : "text-indigo-400"
                    }`}>{stats.timeRemaining}s</p>
                  </div>
                </div>

              </div>

              {/* DYNAMIC PROGRESS BAR: MAGIA DEL 10 */}
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-sky-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono leading-none">LA MAGIA DEL 10</h3>
                    <p className="text-[10px] text-slate-400 font-mono">¡Cargala gambeteando defensores ingleses!</p>
                  </div>
                </div>

                <div className="flex-1 w-full flex items-center gap-3">
                  <div className="flex-1 bg-slate-950 h-6 border border-slate-800 rounded-lg relative overflow-hidden flex items-center px-2">
                    <div 
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-sky-400 to-sky-300 transition-all duration-300 opacity-80"
                      style={{ width: `${playerRef.current.magic}%` }}
                    />
                    
                    {/* Glowing golden overlay when active */}
                    {playerRef.current.isMagicActive && (
                      <div className="absolute left-0 top-0 h-full w-full bg-gradient-to-r from-amber-500 via-sky-400 to-amber-400 animate-pulse opacity-90" />
                    )}

                    {/* Magic active overlay countdown */}
                    {playerRef.current.isMagicActive ? (
                      <span className="z-10 text-xs font-black font-mono text-slate-950 mx-auto flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-900 animate-bounce" />
                        ¡MAGIA ENCENDIDA! {Math.ceil(playerRef.current.magicTimer)}s RESTANTES
                      </span>
                    ) : (
                      <span className="z-10 text-xs font-black font-mono text-white tracking-wider">
                        {playerRef.current.magic}%
                      </span>
                    )}
                  </div>

                  {/* Activation Button */}
                  <button
                    onClick={activateMagia}
                    disabled={playerRef.current.magic < 100 || playerRef.current.isMagicActive}
                    className={`px-4 py-2 rounded-lg font-black text-xs font-mono tracking-wider cursor-pointer transition-all ${
                      playerRef.current.magic >= 100 && !playerRef.current.isMagicActive
                        ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 animate-bounce"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                    }`}
                  >
                    {playerRef.current.isMagicActive ? "¡MAGIA ACTIVA!" : "ACTIVAR MAGIA"}
                  </button>
                </div>
              </div>

              {/* GAME STAGE VIEWPORT (CANVAS) */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[#14532d] border-4 border-slate-800 shadow-2xl flex items-center justify-center">
                
                <canvas
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className="w-full h-full object-contain bg-[#14532d]"
                />

                {/* CELEBRATION OVERLAYS (GOAL!) */}
                {gameState === "celebrating" && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center z-20 backdrop-blur-xs">
                    <motion.div
                      initial={{ scale: 0.5, rotate: -15, opacity: 0 }}
                      animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0], opacity: 1 }}
                      transition={{ duration: 0.6 }}
                      className="text-center"
                    >
                      <span className="text-6xl sm:text-8xl block animate-bounce">⚽🔥</span>
                      <h2 className="text-4xl sm:text-7xl font-black text-yellow-400 tracking-tight drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]">
                        ¡¡¡GOLAZO!!!
                      </h2>
                      <p className="text-lg sm:text-2xl font-bold text-white tracking-wider mt-2 bg-sky-500/80 px-6 py-2 rounded-full border border-sky-300/40 inline-block">
                        ¡DEL MEJOR JUGADOR DEL MUNDO!
                      </p>
                    </motion.div>
                  </div>
                )}

                {/* GAME OVER CARD OVERLAY */}
                {gameState === "gameover" && (
                  <div className="absolute inset-0 bg-slate-950/85 flex items-center justify-center z-20 p-4">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center relative overflow-hidden shadow-2xl"
                    >
                      <div className="absolute inset-x-0 top-0 h-2 flex">
                        <div className="flex-1 bg-sky-400" />
                        <div className="flex-1 bg-white" />
                        <div className="flex-1 bg-sky-400" />
                      </div>

                      <Trophy className="w-16 h-16 text-amber-500 mx-auto mb-3 animate-bounce" />
                      <h2 className="text-3xl font-black text-white">¡PARTIDO FINALIZADO!</h2>
                      <p className="text-sm font-mono text-slate-400 mb-6">El silbato final ha sonado en el estadio</p>

                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                          <p className="text-xs text-slate-400 uppercase font-mono tracking-wider">Puntaje Final</p>
                          <p className="text-2xl font-black font-mono text-sky-400">{stats.score}</p>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                          <p className="text-xs text-slate-400 uppercase font-mono tracking-wider">Goles Totales</p>
                          <p className="text-2xl font-black font-mono text-emerald-400">{stats.goals}</p>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 col-span-2 flex justify-between items-center px-4">
                          <p className="text-xs text-slate-400 uppercase font-mono tracking-wider">Gambetas Exitosas</p>
                          <p className="text-xl font-black font-mono text-amber-400">{stats.dribbles}</p>
                        </div>
                      </div>

                      {/* Record indicator */}
                      {stats.score >= stats.highScore && stats.score > 0 && (
                        <div className="mb-6 bg-amber-500/10 border border-amber-500/30 px-3 py-2 rounded-xl text-amber-400 font-bold text-sm flex items-center justify-center gap-1.5">
                          <Sparkles className="w-4 h-4" />
                          ¡NUEVO RÉCORD CONSEGUIDO! 🌟
                        </div>
                      )}

                      <button
                        onClick={startMatch}
                        className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-lg rounded-xl shadow-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <RotateCcw className="w-5 h-5" />
                        ¡VOLVER A JUGAR!
                      </button>
                    </motion.div>
                  </div>
                )}
              </div>

              {/* MOBILE TOUCH CONTROLLERS (Shown nicely on mobile, always visible as a helpful option) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl mt-1">
                
                {/* Direction D-Pad */}
                <div className="flex flex-col items-center justify-center">
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">Controles Táctiles de Dirección</p>
                  
                  <div className="grid grid-cols-3 gap-2 w-48">
                    <div />
                    <button
                      onMouseDown={() => { keysPressed.current["w"] = true; }}
                      onMouseUp={() => { keysPressed.current["w"] = false; }}
                      onTouchStart={(e) => { e.preventDefault(); keysPressed.current["w"] = true; }}
                      onTouchEnd={(e) => { e.preventDefault(); keysPressed.current["w"] = false; }}
                      className="h-12 rounded-xl bg-slate-800 active:bg-slate-700 text-slate-100 border border-slate-700 font-black text-lg cursor-pointer flex items-center justify-center select-none"
                    >
                      ▲
                    </button>
                    <div />

                    <button
                      onMouseDown={() => { keysPressed.current["a"] = true; }}
                      onMouseUp={() => { keysPressed.current["a"] = false; }}
                      onTouchStart={(e) => { e.preventDefault(); keysPressed.current["a"] = true; }}
                      onTouchEnd={(e) => { e.preventDefault(); keysPressed.current["a"] = false; }}
                      className="h-12 rounded-xl bg-slate-800 active:bg-slate-700 text-slate-100 border border-slate-700 font-black text-lg cursor-pointer flex items-center justify-center select-none"
                    >
                      ◀
                    </button>
                    <div className="bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center text-slate-600 font-mono text-[10px]">
                      D-PAD
                    </div>
                    <button
                      onMouseDown={() => { keysPressed.current["d"] = true; }}
                      onMouseUp={() => { keysPressed.current["d"] = false; }}
                      onTouchStart={(e) => { e.preventDefault(); keysPressed.current["d"] = true; }}
                      onTouchEnd={(e) => { e.preventDefault(); keysPressed.current["d"] = false; }}
                      className="h-12 rounded-xl bg-slate-800 active:bg-slate-700 text-slate-100 border border-slate-700 font-black text-lg cursor-pointer flex items-center justify-center select-none"
                    >
                      ▶
                    </button>

                    <div />
                    <button
                      onMouseDown={() => { keysPressed.current["s"] = true; }}
                      onMouseUp={() => { keysPressed.current["s"] = false; }}
                      onTouchStart={(e) => { e.preventDefault(); keysPressed.current["s"] = true; }}
                      onTouchEnd={(e) => { e.preventDefault(); keysPressed.current["s"] = false; }}
                      className="h-12 rounded-xl bg-slate-800 active:bg-slate-700 text-slate-100 border border-slate-700 font-black text-lg cursor-pointer flex items-center justify-center select-none"
                    >
                      ▼
                    </button>
                    <div />
                  </div>
                </div>

                {/* Tactile Action Buttons */}
                <div className="flex flex-col justify-center items-center gap-3">
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Acciones del 10</p>
                  
                  <div className="flex gap-4 w-full max-w-sm">
                    {/* Gambeta Action */}
                    <button
                      onClick={triggerDribble}
                      className="flex-1 h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:from-amber-600 active:to-amber-700 text-white font-extrabold rounded-2xl shadow-md border border-amber-400/30 flex flex-col items-center justify-center cursor-pointer transition-transform select-none"
                    >
                      <span className="text-[11px] font-mono opacity-85">GAMBETA SPECIAL</span>
                      <span className="text-sm">¡GAMBETEAR! ✨</span>
                    </button>

                    {/* Patear Action */}
                    <button
                      onClick={triggerKick}
                      className="flex-1 h-14 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:from-emerald-600 active:to-emerald-700 text-white font-extrabold rounded-2xl shadow-md border border-emerald-400/30 flex flex-col items-center justify-center cursor-pointer transition-transform select-none"
                    >
                      <span className="text-[11px] font-mono opacity-85">REMATAR AL ARCO</span>
                      <span className="text-sm">¡PATEAR! ⚽</span>
                    </button>
                  </div>
                </div>

              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* FULL SCREEN DETAILED INSTRUCTIONS MODAL */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 z-50 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full relative max-h-[90vh] overflow-y-auto shadow-2xl text-left"
            >
              <button
                onClick={() => setShowInstructions(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
                <Info className="w-6 h-6 text-sky-400" />
                <h3 className="text-2xl font-black text-white">Guía de Juego</h3>
              </div>

              <div className="space-y-4 text-slate-300 font-mono text-xs leading-relaxed">
                <div>
                  <h4 className="text-sm font-bold text-sky-400 mb-1">⚽ OBJETIVO</h4>
                  <p>Esquivar a los defensores ingleses conduciendo el balón por el estadio lateral y marcar la mayor cantidad de goles antes de que el cronómetro de 60 segundos llegue a cero.</p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-amber-400 mb-1">🛡️ ENERGÍA & PENALIZACIONES</h4>
                  <p>Si un defensor inglés te toca sin estar ejecutando una gambeta, perderás <span className="text-rose-400 font-bold">20% de energía</span>. Al llegar a 0% de energía quedarás lesionado por 1.5s y se te descontarán <span className="text-rose-400 font-bold">5 segundos</span> del cronómetro general.</p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-teal-400 mb-1">🔥 LA MAGIA DEL 10</h4>
                  <p>Hacer una gambeta exitosa (presionando E o el botón táctil) cerca de un defensor inglés sumará +20 puntos y cargará tu barra de magia un 25%. Al tener el 100% cargado, activala para:</p>
                  <ul className="list-disc list-inside space-y-1 mt-1 pl-2">
                    <li>Doble de velocidad de carrera.</li>
                    <li>Congelar la velocidad de los ingleses al 45%.</li>
                    <li>Darle una potencia de disparo brutal al balón que el arquero no podrá bloquear.</li>
                    <li>Rodearte de un destello estelar celeste y blanco.</li>
                  </ul>
                </div>

                <div className="border-t border-slate-800 pt-3">
                  <h4 className="text-sm font-bold text-indigo-400 mb-1">🎮 CONTROLES TOTALES</h4>
                  <p className="font-bold text-white mb-1">En Computadora:</p>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li><span className="text-white">Moverse:</span> Flechas del teclado o WASD</li>
                    <li><span className="text-white">Patear al Arco:</span> Barra Espaciadora</li>
                    <li><span className="text-white">Gambeta:</span> Tecla E</li>
                  </ul>
                  <p className="font-bold text-white mt-2 mb-1">En Dispositivos Móviles:</p>
                  <p>Utilizá la cruceta de botones de dirección abajo de la pantalla para correr, y las pestañas táctiles grandes "¡GAMBETEAR!" y "¡PATEAR!" para jugar de forma fluida.</p>
                </div>
              </div>

              <button
                onClick={() => setShowInstructions(false)}
                className="w-full mt-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer text-center"
              >
                ¡ENTENDIDO! VOLVER
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER SECTION */}
      <footer className="bg-slate-950 py-3 text-center border-t border-slate-900 font-mono text-[10px] text-slate-500">
        ⚽ "¡La pelota siempre al 10!" - Inspirado en las leyendas de nuestro fútbol argentino. No oficial.
      </footer>

    </div>
  );
}
