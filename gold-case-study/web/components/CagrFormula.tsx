/**
 * สูตร CAGR แบบเรียงพิมพ์ด้วย HTML/CSS ล้วน
 * ไม่ใช้ไลบรารีคณิตศาสตร์ เพราะต้องการสูตรเดียวและอยากคุมฟอนต์/สีให้เข้ากับธีม
 *
 * CAGR = (Ending Value / Beginning Value)^(1/n) − 1
 */
export function CagrFormula({ note }: { note?: string }) {
  return (
    <figure className="panel bg-panel2/40 px-4 py-5">
      <div className="flex items-center justify-center overflow-x-auto">
        <div className="flex items-center gap-2.5 font-display text-[15px] italic text-ink sm:text-[17px]">
          <span>CAGR</span>
          <span aria-hidden>=</span>

          {/* (เศษ/ส่วน) ยกกำลัง 1/n */}
          <span className="flex items-start">
            <Paren>(</Paren>

            <span className="flex flex-col items-center px-1.5 leading-tight">
              <span className="px-1.5 pb-1">Ending Value</span>
              <span className="w-full border-t border-ink-dim" />
              <span className="px-1.5 pt-1">Beginning Value</span>
            </span>

            <Paren>)</Paren>

            {/* เลขชี้กำลัง 1/n */}
            <span className="mt-0.5 flex flex-col items-center text-[9px] not-italic leading-none sm:text-[10px]">
              <span className="px-1 pb-[2px]">1</span>
              <span className="w-full border-t border-ink-dim" />
              <span className="px-1 pt-[2px] italic">n</span>
            </span>
          </span>

          <span aria-hidden>&minus;</span>
          <span className="not-italic">1</span>
        </div>
      </div>

      <figcaption className="mt-3.5 border-t border-line pt-3 text-center text-[11.5px] leading-relaxed text-ink-faint">
        <span className="font-mono not-italic text-ink-dim">n</span> = จำนวนปีของช่วงที่วัด ·
        CAGR คืออัตราผลตอบแทนทบต้นคงที่ที่ทำให้เงินต้นเติบโตจากมูลค่าต้นงวดไปถึงมูลค่าปลายงวดพอดี
        {note ? ` · ${note}` : ""}
      </figcaption>
    </figure>
  );
}

/** วงเล็บขนาดใหญ่ที่สูงคลุมเศษส่วนพอดี */
function Paren({ children }: { children: string }) {
  return (
    <span
      aria-hidden
      className="select-none font-display text-[2.5em] font-light not-italic leading-[0.72] text-ink-dim"
    >
      {children}
    </span>
  );
}
