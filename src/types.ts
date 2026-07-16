/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Position {
  x: number;
  y: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  speed: number;
  facing: "left" | "right";
  energy: number; // 0 to 100
  magic: number;  // 0 to 100 ("Magia del 10")
  isDribbling: boolean;
  dribbleCooldown: number;
  invincibilityTime: number; // seconds
  isMagicActive: boolean;
  magicTimer: number; // seconds remaining
  stunTimer: number; // seconds remaining (when energy = 0)
}

export interface Defender {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseX: number; // original defense line
  width: number;
  height: number;
  speed: number;
  state: "patrol" | "chase" | "returned";
  patrolDir: 1 | -1;
  patrolRange: number;
  tackleCelebrateTimer?: number; // Jude Bellingham open arms pose timer
}

export interface Goalkeeper {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  diveTimer: number;
  diveY: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  height: number; // 3D height/altitude for kicks
  vHeight: number; // vertical velocity in 3D
  owner: "player" | "none" | "keeper";
  angle: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  gravity?: number;
}

export interface GameAlert {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  timer: number; // seconds remaining
  scale: number;
}

export interface MatchStats {
  score: number;
  goals: number;
  dribbles: number;
  timeRemaining: number; // seconds
  highScore: number;
}
