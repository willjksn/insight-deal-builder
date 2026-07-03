import type { ReactNode } from "react";
import { StagePropDefinition } from "@/lib/stage/types";

function Svg({ w, h, viewBox, children }: { w: number; h: number; viewBox: string; children: ReactNode }) {
  return (
    <svg width={w} height={h} viewBox={viewBox} aria-hidden>
      {children}
    </svg>
  );
}

export function renderStagePropShape(
  prop: StagePropDefinition,
  w: number,
  h: number,
  colorOverride?: string
) {
  const fill = colorOverride ?? prop.color;
  const stroke = "#334155";
  const s = prop.shape;

  switch (s) {
    case "person":
      return (
        <Svg w={w} h={h} viewBox="0 0 36 36">
          <circle cx="18" cy="10" r="8" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <ellipse cx="18" cy="30" rx="12" ry="8" fill={fill} stroke={stroke} strokeWidth="1.5" />
        </Svg>
      );
    case "person-two":
      return (
        <Svg w={w} h={h} viewBox="0 0 56 36">
          <circle cx="14" cy="10" r="7" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <ellipse cx="14" cy="28" rx="10" ry="7" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <circle cx="42" cy="10" r="7" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <ellipse cx="42" cy="28" rx="10" ry="7" fill={fill} stroke={stroke} strokeWidth="1.5" />
        </Svg>
      );
    case "camera":
      return (
        <Svg w={w} h={h} viewBox="0 0 40 44">
          {/* Top-down plan view — lens / shoot direction is toward bottom (+Y) */}
          <rect x="10" y="6" width="20" height="16" rx="3" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <rect x="16" y="2" width="8" height="4" rx="1" fill={fill} stroke={stroke} strokeWidth="1" opacity={0.85} />
          <polygon
            points="20,26 9,42 31,42"
            fill={fill}
            fillOpacity="0.2"
            stroke={stroke}
            strokeWidth="1"
            strokeOpacity="0.35"
          />
          <circle cx="20" cy="26" r="5" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
          <circle cx="20" cy="26" r="2.5" fill="#334155" />
          <line x1="20" y1="31" x2="20" y2="42" stroke="#64748b" strokeWidth="1" strokeDasharray="2 2" />
        </Svg>
      );
    case "tripod":
      return (
        <Svg w={w} h={h} viewBox="0 0 36 40">
          {/* Top-down — front leg points down (+Y) toward subject */}
          <circle cx="18" cy="14" r="5" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <line x1="18" y1="14" x2="8" y2="36" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="18" y1="14" x2="28" y2="36" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="18" y1="14" x2="18" y2="38" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          <circle cx="18" cy="38" r="2" fill={fill} stroke={stroke} strokeWidth="1" />
        </Svg>
      );
    case "gimbal":
      return (
        <Svg w={w} h={h} viewBox="0 0 36 40">
          <circle cx="18" cy="14" r="9" fill="none" stroke={stroke} strokeWidth="2" />
          <circle cx="18" cy="14" r="4" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <rect x="16" y="4" width="4" height="7" rx="1" fill="#64748b" />
          <line x1="18" y1="23" x2="18" y2="38" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
          <polygon points="18,38 14,32 22,32" fill={fill} stroke={stroke} strokeWidth="1" />
        </Svg>
      );
    case "slider":
      return (
        <Svg w={w} h={h} viewBox="0 0 80 20">
          <rect x="2" y="8" width="76" height="4" rx="2" fill="#475569" />
          <rect x="30" y="5" width="20" height="10" rx="2" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <circle cx="40" cy="10" r="2" fill="#94a3b8" />
          {/* Camera / travel direction toward right (+X) */}
          <polygon points="72,10 64,6 64,14" fill={fill} stroke={stroke} strokeWidth="1" />
        </Svg>
      );
    case "monitor":
      return (
        <Svg w={w} h={h} viewBox="0 0 36 24">
          <rect x="2" y="2" width="32" height="20" rx="2" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <rect x="5" y="5" width="26" height="14" rx="1" fill="#38bdf8" opacity="0.35" />
          <rect x="14" y="20" width="8" height="2" fill="#64748b" />
        </Svg>
      );
    case "softbox":
      return (
        <Svg w={w} h={h} viewBox="0 0 56 44">
          {/* Top-down — light emits toward bottom (+Y); stand at top (back) */}
          <rect x="8" y="4" width="40" height="28" rx="2" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <rect x="14" y="10" width="28" height="16" rx="1" fill="#f8fafc" opacity="0.5" />
          <line x1="28" y1="32" x2="28" y2="40" stroke="#78716c" strokeWidth="2" />
          <line x1="24" y1="40" x2="32" y2="40" stroke="#78716c" strokeWidth="2" />
          <polygon points="28,34 20,42 36,42" fill={fill} fillOpacity="0.25" stroke={stroke} strokeWidth="0.75" />
        </Svg>
      );
    case "strip-softbox":
      return (
        <Svg w={w} h={h} viewBox="0 0 24 64">
          <rect x="2" y="4" width="20" height="52" rx="2" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <rect x="5" y="10" width="14" height="40" rx="1" fill="#f8fafc" opacity="0.45" />
          <line x1="12" y1="56" x2="12" y2="62" stroke="#78716c" strokeWidth="2" />
        </Svg>
      );
    case "octabox":
      return (
        <Svg w={w} h={h} viewBox="0 0 56 56">
          <polygon
            points="28,4 48,14 52,34 38,52 18,52 4,34 8,14"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.5"
          />
          <circle cx="28" cy="28" r="14" fill="#f8fafc" opacity="0.4" />
          <line x1="28" y1="52" x2="28" y2="56" stroke="#78716c" strokeWidth="2" />
        </Svg>
      );
    case "umbrella":
      return (
        <Svg w={w} h={h} viewBox="0 0 52 52">
          <path d="M26 8 A20 20 0 1 1 25.9 8" fill={fill} stroke={stroke} strokeWidth="1.5" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <line
                key={deg}
                x1="26"
                y1="26"
                x2={26 + Math.cos(rad) * 20}
                y2={26 + Math.sin(rad) * 20}
                stroke={stroke}
                strokeWidth="0.75"
                opacity="0.5"
              />
            );
          })}
          <line x1="26" y1="26" x2="26" y2="48" stroke="#78716c" strokeWidth="2" />
        </Svg>
      );
    case "beauty-dish":
      return (
        <Svg w={w} h={h} viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="18" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <circle cx="22" cy="22" r="10" fill="#f8fafc" opacity="0.55" />
          <circle cx="22" cy="22" r="4" fill="#cbd5e1" />
        </Svg>
      );
    case "open-face":
      return (
        <Svg w={w} h={h} viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="14" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <circle cx="18" cy="18" r="8" fill="#fef08a" opacity="0.85" />
          <line x1="18" y1="32" x2="18" y2="36" stroke="#78716c" strokeWidth="2" />
        </Svg>
      );
    case "fresnel":
      return (
        <Svg w={w} h={h} viewBox="0 0 40 32">
          <polygon points="8,4 32,4 36,28 4,28" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <ellipse cx="20" cy="16" rx="8" ry="6" fill="#fef08a" opacity="0.5" />
          <line x1="20" y1="28" x2="20" y2="32" stroke="#78716c" strokeWidth="2" />
        </Svg>
      );
    case "led-panel":
      return (
        <Svg w={w} h={h} viewBox="0 0 48 48">
          <rect x="4" y="4" width="40" height="40" rx="2" fill={fill} stroke={stroke} strokeWidth="1.5" />
          {[12, 24, 36].map((x) =>
            [12, 24, 36].map((y) => (
              <rect key={`${x}-${y}`} x={x - 3} y={y - 3} width="6" height="6" rx="1" fill="#bae6fd" opacity="0.7" />
            ))
          )}
        </Svg>
      );
    case "led-tube":
      return (
        <Svg w={w} h={h} viewBox="0 0 64 16">
          <rect x="2" y="3" width="60" height="10" rx="5" fill={fill} stroke={stroke} strokeWidth="1.5" />
          {[14, 26, 38, 50].map((x) => (
            <circle key={x} cx={x} cy="8" r="2" fill="#e0f2fe" />
          ))}
        </Svg>
      );
    case "practical-lamp":
      return (
        <Svg w={w} h={h} viewBox="0 0 28 28">
          <ellipse cx="14" cy="10" rx="10" ry="7" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <rect x="11" y="16" width="6" height="8" rx="1" fill="#78716c" />
          <circle cx="14" cy="8" r="4" fill="#fef08a" opacity="0.6" />
        </Svg>
      );
    case "ring-light":
      return (
        <Svg w={w} h={h} viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="16" fill="none" stroke={fill} strokeWidth="6" />
          <circle cx="20" cy="20" r="8" fill="none" stroke={stroke} strokeWidth="1" opacity="0.4" />
        </Svg>
      );
    case "diffuser":
      return (
        <Svg w={w} h={h} viewBox="0 0 56 40">
          <rect x="4" y="4" width="48" height="32" rx="1" fill="none" stroke={stroke} strokeWidth="2" />
          <rect x="8" y="8" width="40" height="24" rx="1" fill={fill} stroke={stroke} strokeWidth="1" opacity="0.65" />
          <line x1="4" y1="4" x2="8" y2="8" stroke={stroke} strokeWidth="1" />
          <line x1="52" y1="4" x2="48" y2="8" stroke={stroke} strokeWidth="1" />
        </Svg>
      );
    case "scrim":
      return (
        <Svg w={w} h={h} viewBox="0 0 48 36">
          <rect x="4" y="4" width="40" height="28" rx="1" fill={fill} stroke={stroke} strokeWidth="1.5" />
          {[10, 18, 26, 34].map((y) => (
            <line key={y} x1="6" y1={y} x2="42" y2={y} stroke={stroke} strokeWidth="0.5" opacity="0.35" />
          ))}
        </Svg>
      );
    case "eggcrate":
      return (
        <Svg w={w} h={h} viewBox="0 0 48 36">
          <rect x="4" y="4" width="40" height="28" rx="1" fill={fill} stroke={stroke} strokeWidth="1.5" />
          {[12, 20, 28, 36].map((x) => (
            <line key={`v${x}`} x1={x} y1="6" x2={x} y2="30" stroke={stroke} strokeWidth="0.75" opacity="0.5" />
          ))}
          {[12, 20, 28].map((y) => (
            <line key={`h${y}`} x1="6" y1={y} x2="42" y2={y} stroke={stroke} strokeWidth="0.75" opacity="0.5" />
          ))}
        </Svg>
      );
    case "bounce":
      return (
        <Svg w={w} h={h} viewBox="0 0 40 32">
          <polygon points="6,28 34,20 38,8 10,16" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <line x1="10" y1="16" x2="6" y2="28" stroke={stroke} strokeWidth="1" opacity="0.4" />
        </Svg>
      );
    case "reflector":
      return (
        <Svg w={w} h={h} viewBox="0 0 36 36">
          <path d="M18 4 A16 16 0 0 1 18 32 A16 16 0 0 1 18 4" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <line x1="18" y1="32" x2="18" y2="36" stroke="#78716c" strokeWidth="2" />
        </Svg>
      );
    case "flag":
      return (
        <Svg w={w} h={h} viewBox="0 0 40 32">
          <rect x="18" y="2" width="4" height="28" fill="#78716c" />
          <rect x="4" y="4" width="16" height="24" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <line x1="20" y1="30" x2="16" y2="32" stroke="#78716c" strokeWidth="1.5" />
          <line x1="20" y1="30" x2="24" y2="32" stroke="#78716c" strokeWidth="1.5" />
        </Svg>
      );
    case "finger-flag":
      return (
        <Svg w={w} h={h} viewBox="0 0 20 12">
          <rect x="10" y="1" width="2" height="10" fill="#78716c" />
          <rect x="2" y="2" width="8" height="8" fill={fill} stroke={stroke} strokeWidth="1" />
        </Svg>
      );
    case "barn-doors":
      return (
        <Svg w={w} h={h} viewBox="0 0 36 28">
          <rect x="10" y="6" width="16" height="16" rx="1" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <path d="M10 6 L4 2 L4 26 L10 22" fill="none" stroke={stroke} strokeWidth="1.5" />
          <path d="M26 6 L32 2 L32 26 L26 22" fill="none" stroke={stroke} strokeWidth="1.5" />
        </Svg>
      );
    case "snoot":
      return (
        <Svg w={w} h={h} viewBox="0 0 24 24">
          <polygon points="12,2 20,20 4,20" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <circle cx="12" cy="18" r="3" fill="#1c1917" />
        </Svg>
      );
    case "cookie":
      return (
        <Svg w={w} h={h} viewBox="0 0 48 32">
          <rect x="4" y="4" width="40" height="24" rx="1" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <circle cx="14" cy="12" r="3" fill="#292524" />
          <circle cx="28" cy="10" r="2" fill="#292524" />
          <circle cx="34" cy="20" r="2.5" fill="#292524" />
          <rect x="18" y="18" width="8" height="4" rx="1" fill="#292524" />
        </Svg>
      );
    case "c-stand":
      return (
        <Svg w={w} h={h} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <line x1="12" y1="12" x2="4" y2="20" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="12" x2="20" y2="20" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="12" x2="12" y2="4" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="8" x2="20" y2="6" stroke="#78716c" strokeWidth="1.5" />
        </Svg>
      );
    case "sandbag":
      return (
        <Svg w={w} h={h} viewBox="0 0 28 20">
          <path
            d="M4 14 Q4 4 14 4 Q24 4 24 14 Q24 18 14 18 Q4 18 4 14"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.5"
          />
          <path d="M8 8 Q14 6 20 8" fill="none" stroke={stroke} strokeWidth="0.75" opacity="0.4" />
        </Svg>
      );
    case "apple-box":
      return (
        <Svg w={w} h={h} viewBox="0 0 32 24">
          <rect x="4" y="6" width="24" height="16" rx="1" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <polygon points="4,6 10,2 28,2 28,6" fill={fill} stroke={stroke} strokeWidth="1" opacity="0.7" />
          <line x1="10" y1="2" x2="10" y2="6" stroke={stroke} strokeWidth="0.75" />
          <line x1="28" y1="2" x2="28" y2="6" stroke={stroke} strokeWidth="0.75" />
        </Svg>
      );
    case "chair":
      return (
        <Svg w={w} h={h} viewBox="0 0 28 28">
          <rect x="6" y="8" width="16" height="14" rx="2" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <rect x="6" y="4" width="16" height="6" rx="1" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <line x1="8" y1="22" x2="8" y2="26" stroke={stroke} strokeWidth="1.5" />
          <line x1="20" y1="22" x2="20" y2="26" stroke={stroke} strokeWidth="1.5" />
        </Svg>
      );
    case "couch":
      return (
        <Svg w={w} h={h} viewBox="0 0 72 32">
          <rect x="10" y="8" width="52" height="18" rx="4" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <rect x="4" y="10" width="8" height="14" rx="2" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <rect x="60" y="10" width="8" height="14" rx="2" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <rect x="12" y="4" width="48" height="6" rx="2" fill={fill} stroke={stroke} strokeWidth="1" />
        </Svg>
      );
    case "bed":
      return (
        <Svg w={w} h={h} viewBox="0 0 80 48">
          <rect x="4" y="10" width="72" height="34" rx="2" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <rect x="8" y="12" width="20" height="12" rx="1" fill="#fef3c7" stroke={stroke} strokeWidth="1" />
          <rect x="52" y="12" width="20" height="12" rx="1" fill="#fef3c7" stroke={stroke} strokeWidth="1" />
          <line x1="4" y1="10" x2="76" y2="10" stroke={stroke} strokeWidth="1" />
        </Svg>
      );
    case "nightstand":
      return (
        <Svg w={w} h={h} viewBox="0 0 28 24">
          <rect x="4" y="6" width="20" height="16" rx="1" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <line x1="4" y1="14" x2="24" y2="14" stroke={stroke} strokeWidth="0.75" />
          <circle cx="22" cy="10" r="2" fill="#fcd34d" opacity="0.7" />
        </Svg>
      );
    case "table":
      return (
        <Svg w={w} h={h} viewBox="0 0 48 32">
          <rect x="4" y="6" width="40" height="22" rx="2" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <line x1="8" y1="28" x2="8" y2="32" stroke={stroke} strokeWidth="2" />
          <line x1="40" y1="28" x2="40" y2="32" stroke={stroke} strokeWidth="2" />
        </Svg>
      );
    case "desk":
      return (
        <Svg w={w} h={h} viewBox="0 0 56 32">
          <rect x="4" y="8" width="48" height="20" rx="1" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <rect x="38" y="10" width="12" height="8" rx="1" fill="#475569" opacity="0.35" />
          <line x1="8" y1="28" x2="8" y2="32" stroke={stroke} strokeWidth="2" />
          <line x1="48" y1="28" x2="48" y2="32" stroke={stroke} strokeWidth="2" />
          <line x1="4" y1="18" x2="36" y2="18" stroke={stroke} strokeWidth="0.75" opacity="0.35" />
        </Svg>
      );
    case "backdrop":
      return (
        <Svg w={w} h={h} viewBox="0 0 120 24">
          <path d="M8 24 L8 8 Q60 0 112 8 L112 24 Z" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <line x1="8" y1="24" x2="8" y2="20" stroke={stroke} />
          <line x1="112" y1="24" x2="112" y2="20" stroke={stroke} />
        </Svg>
      );
    case "wall":
      return (
        <Svg w={w} h={h} viewBox="0 0 96 16">
          <rect x="2" y="4" width="92" height="8" fill={fill} stroke={stroke} strokeWidth="1.5" />
          {[16, 32, 48, 64, 80].map((x) => (
            <line key={x} x1={x} y1="4" x2={x} y2="12" stroke={stroke} strokeWidth="0.5" opacity="0.25" />
          ))}
        </Svg>
      );
    case "window":
      return (
        <Svg w={w} h={h} viewBox="0 0 48 12">
          <rect x="2" y="2" width="44" height="8" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <line x1="24" y1="2" x2="24" y2="10" stroke={stroke} strokeWidth="1" />
          <line x1="2" y1="6" x2="46" y2="6" stroke={stroke} strokeWidth="1" />
        </Svg>
      );
    case "door":
      return (
        <Svg w={w} h={h} viewBox="0 0 32 16">
          <rect x="2" y="2" width="12" height="12" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <path d="M14 14 A12 12 0 0 1 14 2" fill="none" stroke={stroke} strokeWidth="1" strokeDasharray="2 2" />
          <circle cx="12" cy="8" r="1" fill={stroke} />
        </Svg>
      );
    case "boom-mic":
      return (
        <Svg w={w} h={h} viewBox="0 0 48 48">
          <line x1="8" y1="40" x2="38" y2="10" stroke="#57534e" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="38" cy="10" rx="6" ry="4" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <rect x="35" y="6" width="6" height="4" rx="1" fill="#64748b" />
          <line x1="8" y1="40" x2="6" y2="44" stroke="#57534e" strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case "lav":
      return (
        <Svg w={w} h={h} viewBox="0 0 16 16">
          <rect x="3" y="5" width="10" height="8" rx="2" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <line x1="8" y1="5" x2="8" y2="2" stroke={stroke} strokeWidth="1" />
          <circle cx="8" cy="2" r="1" fill={stroke} />
          <circle cx="6" cy="9" r="1" fill="#94a3b8" />
        </Svg>
      );
    case "light-cone":
      return (
        <Svg w={w} h={h} viewBox="0 0 80 120">
          <polygon
            points="40,4 6,116 74,116"
            fill={fill}
            fillOpacity="0.45"
            stroke={stroke}
            strokeWidth="1"
            strokeOpacity="0.35"
          />
          <line x1="40" y1="4" x2="40" y2="116" stroke={fill} strokeWidth="0.75" strokeOpacity="0.25" />
        </Svg>
      );
    case "circle":
      return (
        <Svg w={w} h={h} viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill={fill} stroke={stroke} strokeWidth="1.5" />
        </Svg>
      );
    default:
      return (
        <Svg w={w} h={h} viewBox="0 0 48 48">
          <rect x="4" y="4" width="40" height="40" rx="4" fill={fill} stroke={stroke} strokeWidth="1.5" />
        </Svg>
      );
  }
}
