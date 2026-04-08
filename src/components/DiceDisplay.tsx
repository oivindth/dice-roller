"use client";

interface DiceDisplayProps {
  value?: number;
  rolling?: boolean;
}

const dotPositions: Record<number, number[][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};

export default function DiceDisplay({ value, rolling = false }: DiceDisplayProps) {
  const dots = value && !rolling ? dotPositions[value] : null;

  return (
    <div
      className={`relative w-24 h-24 bg-white rounded-2xl shadow-2xl flex items-center justify-center select-none ${
        rolling ? "dice-rolling" : value ? "dice-landed" : ""
      }`}
    >
      {rolling ? (
        <span className="text-4xl font-black text-gray-800">?</span>
      ) : dots ? (
        <svg viewBox="0 0 100 100" className="w-16 h-16" aria-label={`Dice showing ${value}`}>
          {dots.map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={8} fill="#1f2937" />
          ))}
        </svg>
      ) : (
        <span className="text-4xl font-black text-gray-300">-</span>
      )}
    </div>
  );
}
