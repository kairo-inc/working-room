export const LogoIcon = ({ size = 24 }: { size?: number }) => {
  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="-10 -10 306 306" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M254.842 78.4277V207.572L143 272.144L31.1582 207.572V78.4277L143 13.8564L254.842 78.4277Z"
          style={{ stroke: "var(--foreground)" }}
          strokeWidth="32"
          strokeLinejoin="round"
        />
        <line x1="143.2" y1="9" x2="143.2" y2="177" style={{ stroke: "var(--foreground)" }} strokeWidth="32" />
        <path d="M143 143L265 213L143 283L21 213L143 143Z" style={{ fill: "var(--foreground)" }} />
      </svg>
    </div>
  )
}
