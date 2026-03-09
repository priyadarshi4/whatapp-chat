import React from 'react';

export default function FloatingHearts({ hearts }) {
  return (
    <>
      {hearts.map((h) => (
        <div key={h.id} className="heart-float"
          style={{ left: `${h.x}%`, bottom: '80px', '--rot': `${Math.random() * 30 - 15}deg` }}>
          {h.emoji}
        </div>
      ))}
    </>
  );
}
