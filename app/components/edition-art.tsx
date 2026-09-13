/** Lightweight, decorative artwork. No external assets or client-side animation runtime. */
export function BookPortrait() {
  return <figure className="edition-portrait" aria-label="深い青の表紙に人生の歩みを描いた、自分史の装丁イメージ">
    <div className="edition-orbit orbit-one" aria-hidden="true" /><div className="edition-orbit orbit-two" aria-hidden="true" />
    <div className="edition-book" aria-hidden="true">
      <div className="edition-book-pages" />
      <div className="edition-book-cover">
        <div className="edition-book-topline"><span>THE STORY OF MY LIFE</span><span>01</span></div>
        <div className="edition-book-title">わたしの<br />自分史<span>日々の記憶を、未来へ。</span></div>
        <svg className="edition-book-drawing" viewBox="0 0 240 180" fill="none">
          <path d="M-10 155C40 165 58 105 98 113S174 173 243 103M-10 142C39 151 61 87 105 94S175 152 243 87M-10 128C40 140 67 70 111 77S176 131 243 68M-10 113C42 123 75 53 119 60S182 107 243 48M-10 99C44 105 82 35 126 43S187 83 243 27" stroke="currentColor" strokeWidth=".7" />
          <circle cx="158" cy="39" r="16" stroke="currentColor" strokeWidth=".7" />
          <path d="M158 17V61M136 39H180" stroke="currentColor" strokeWidth=".35" />
        </svg>
        <div className="edition-book-bottom"><span>A LIFE, WELL REMEMBERED.</span><span>自分史</span></div>
      </div>
    </div>
    <figcaption><span />あなたの歩みが、一冊になる。<small>装丁イメージ</small></figcaption>
  </figure>;
}

export function StepArtwork({ step }: { step: number }) {
  const paths = [
    <g key="timeline"><path d="M8 4v24M15 8h12M15 16h8M15 24h12" /><circle cx="8" cy="8" r="2" /><circle cx="8" cy="16" r="2" /><circle cx="8" cy="24" r="2" /></g>,
    <g key="episode"><path d="M27 15a11 11 0 0 1-11 11H5l3-5a11 11 0 1 1 19-6Z" /><path d="M11 13h10M11 18h6" /></g>,
    <g key="personality"><path d="M16 28S4 21 4 12a7 7 0 0 1 12-5 7 7 0 0 1 12 5c0 9-12 16-12 16Z" /><path d="m10 15 4 4 8-8" /></g>,
    <g key="story"><path d="m19 3 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6ZM6 21h12M6 26h20M6 16h3" /></g>,
    <g key="book"><path d="M16 8C12 5 7 4 3 5v21c5-1 9 0 13 3 4-3 8-4 13-3V5c-4-1-9 0-13 3ZM16 8v21" /><path d="m7 10 5 2M7 15l5 2m8-5 5-2m-5 7 5-2" /></g>,
  ];
  return <svg viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[step - 1]}</svg>;
}
