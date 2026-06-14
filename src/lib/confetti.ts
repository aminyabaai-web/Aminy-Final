import confetti from 'canvas-confetti';

// Aminy brand palette
const AMINY_COLORS = ['#43AA8B', '#2A7D99', '#E07A5F', '#F6A623', '#7BA7BC', '#90BE6D'];
const STREAK_COLORS = ['#F59E0B', '#F97316', '#FBBF24', '#FCD34D', '#FDE68A'];
const UPGRADE_COLORS = ['#43AA8B', '#2A7D99', '#7BA7BC', '#E07A5F', '#F6A623', '#9333EA'];

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function fireConfetti(type: 'goal' | 'streak' | 'upgrade' | 'task' | 'junior') {
  if (prefersReducedMotion()) return;

  switch (type) {
    case 'task':
      // Quick burst from center-bottom — small, doesn't interrupt flow
      confetti({
        particleCount: 40,
        spread: 55,
        origin: { x: 0.5, y: 0.75 },
        colors: AMINY_COLORS,
        gravity: 1.2,
        scalar: 0.85,
        ticks: 120,
      });
      break;

    case 'goal':
      // Two-cannon burst — goal completion deserves a proper moment
      confetti({
        particleCount: 70,
        angle: 60,
        spread: 65,
        origin: { x: 0, y: 0.65 },
        colors: AMINY_COLORS,
        gravity: 1,
        scalar: 1,
        ticks: 200,
      });
      confetti({
        particleCount: 70,
        angle: 120,
        spread: 65,
        origin: { x: 1, y: 0.65 },
        colors: AMINY_COLORS,
        gravity: 1,
        scalar: 1,
        ticks: 200,
      });
      break;

    case 'streak':
      // Full-screen fire + stars — milestone moment
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { x: 0.5, y: 0.4 },
        colors: STREAK_COLORS,
        shapes: ['circle', 'square'],
        scalar: 1.1,
        ticks: 300,
        gravity: 0.8,
      });
      // Second wave of stars with slight delay
      setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 50,
          origin: { x: 0.1, y: 0.5 },
          colors: STREAK_COLORS,
          scalar: 0.9,
          ticks: 200,
        });
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 50,
          origin: { x: 0.9, y: 0.5 },
          colors: STREAK_COLORS,
          scalar: 0.9,
          ticks: 200,
        });
      }, 250);
      break;

    case 'upgrade':
      // Premium burst — multi-wave, premium feel
      const end = Date.now() + 1500;
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.65 },
          colors: UPGRADE_COLORS,
          scalar: 1.1,
          ticks: 250,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.65 },
          colors: UPGRADE_COLORS,
          scalar: 1.1,
          ticks: 250,
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
      break;

    case 'junior':
      // Big cheerful burst for kids — maximum joy
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'],
        shapes: ['circle', 'square'],
        scalar: 1.3,
        ticks: 350,
        gravity: 0.75,
        startVelocity: 45,
      });
      break;
  }
}
