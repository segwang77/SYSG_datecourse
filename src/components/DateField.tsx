"use client";

interface Props {
  /** "date": 날짜(YYYY-MM-DD) / "time": 시각(HH:mm) */
  type?: "date" | "time";
  value: string;
  onChange: (value: string) => void;
  /** 값이 비어 있을 때 보여줄 안내 문구 */
  placeholder?: string;
  /** 값을 지우는 ✕ 버튼을 보여줄지 (선택 입력일 때) */
  clearable?: boolean;
  className?: string;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** "2026-10-07" → "10월 7일 (수)" (올해가 아니면 연도도 표시) */
function formatDate(v: string): string {
  const [y, m, d] = v.split("-").map(Number);
  if (!y || !m || !d) return v;
  const date = new Date(y, m - 1, d);
  const year = y === new Date().getFullYear() ? "" : `${y}년 `;
  return `${year}${m}월 ${d}일 (${WEEKDAYS[date.getDay()]})`;
}

/** "13:30" → "오후 1:30" */
function formatTime(v: string): string {
  const [h, m] = v.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return v;
  return `${h < 12 ? "오전" : "오후"} ${h % 12 || 12}:${String(m).padStart(2, "0")}`;
}

/**
 * 날짜·시간 입력칸.
 *
 * iOS Safari는 <input type="date">를 자체 방식으로 그려서, 값이 없으면 빈칸으로 보이고
 * 칸이 부모 너비를 넘어가기도 한다. 그래서 화면에 보이는 칸은 직접 그리고,
 * 실제 입력칸은 투명하게 그 위에 겹쳐 둔다. 누르면 기기의 기본 날짜·시간 선택 창이 열린다.
 */
export default function DateField({ type = "date", value, onChange, placeholder, clearable, className = "" }: Props) {
  const text = value ? (type === "date" ? formatDate(value) : formatTime(value)) : "";
  const label = placeholder ?? (type === "date" ? "날짜 선택" : "시각 선택");

  return (
    <div className={`input relative flex min-h-[38px] items-center gap-2 focus-within:border-rose-400 ${className}`}>
      {/* 실제 입력칸: 칸 전체를 덮는 투명한 층. (label 안에서도 이 입력칸이 먼저 선택되도록 맨 앞에 둔다) */}
      <input
        type={type}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => {
          // PC 브라우저는 글자 부분을 눌러도 선택 창이 안 열리므로 직접 연다 (모바일은 누르면 바로 열림)
          try {
            e.currentTarget.showPicker?.();
          } catch {
            /* 지원하지 않는 브라우저는 기본 동작에 맡김 */
          }
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
      <span aria-hidden className="shrink-0">{type === "date" ? "📅" : "🕐"}</span>
      <span suppressHydrationWarning className={`min-w-0 flex-1 truncate text-left ${text ? "" : "text-stone-400"}`}>
        {text || label}
      </span>
      {clearable && value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={type === "date" ? "날짜 지우기" : "시각 지우기"}
          className="relative z-10 -my-1 shrink-0 px-1 text-stone-400 hover:text-stone-700"
        >
          ✕
        </button>
      )}
    </div>
  );
}
