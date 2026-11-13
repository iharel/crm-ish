import { Check, FileSignature, FileText, PenLine } from 'lucide-react'
import { MockupFrame } from '../MockupFrame'
import { Button } from '../../components/ui'

/** SigningSignMockup — the signer's page (no login): progress bar, the document with their fields, Finish and sign. */
export default function SigningSignMockup() {
  return (
    <MockupFrame name="signing-sign" title="Signer page">
      <div data-cmp="signsign.root_div" className="h-full w-full flex flex-col bg-bg">
        <header data-cmp="signsign.header" className="h-12 px-4 flex items-center gap-2 border-b border-border bg-surface text-sm"><FileSignature size={16} className="text-primary" /><span data-cmp="signsign.brand" className="font-semibold">Document signing</span><span data-cmp="signsign.sender" className="ml-auto text-xs text-fg-muted">Sent by Alex Morgan</span></header>
        <div data-cmp="signsign.bar" className="border-b border-border bg-surface px-4 py-2 flex items-center gap-3">
          <div data-cmp="signsign.bar_meta" className="flex-1"><div data-cmp="signsign.bar_title" className="text-sm font-semibold">Northfield — Master agreement + appendices</div><div data-cmp="signsign.bar_progress" className="text-xs text-fg-muted">2 of 4 required fields done</div></div>
          <span data-cmp="signsign.decline" className="text-xs text-fg-muted">Decline</span>
          <Button cmp="signsign.next_button" size="sm" variant="secondary">Next field</Button>
          <Button cmp="signsign.finish_button" size="sm" variant="primary" disabled>Finish and sign</Button>
        </div>
        <div data-cmp="signsign.pages" className="flex-1 min-h-0 overflow-auto bg-surface-2 flex flex-col items-center gap-3 py-4">
          <div data-cmp="signsign.doc_title" className="w-[560px] text-xs text-fg-muted flex items-center gap-2"><FileText size={12} /><span className="font-medium text-fg">1. Master agreement.pdf</span></div>
          <div data-cmp="signsign.page" className="relative w-[560px] h-[792px] bg-white rounded-sm shadow-elevated text-gray-800 p-12 text-[11px] leading-relaxed">
            <div data-cmp="signsign.page_heading" className="text-base font-semibold mb-3">Master Services Agreement</div>
            <p data-cmp="signsign.page_text">This agreement is made between Acme Demo Ltd. and Northfield Logistics B.V. The parties agree to the terms set out below and in Appendices A and B, which form part of this agreement.</p>
            <div data-cmp="signsign.field_check" className="absolute left-[56px] top-[560px] w-[18px] h-[18px] rounded-[3px] border border-emerald-500/70 bg-emerald-400/10 grid place-items-center text-gray-900"><Check size={13} strokeWidth={3} /></div>
            <span data-cmp="signsign.field_check_label" className="absolute left-[84px] top-[561px]">I have read Appendix B (SLA)</span>
            <div data-cmp="signsign.field_signature" className="absolute left-[56px] top-[620px] w-[150px] h-[46px] rounded-[3px] border border-amber-500 bg-amber-300/25 ring-2 ring-amber-500 ring-offset-1 flex items-center justify-center gap-1 text-[11px] font-medium text-amber-900"><PenLine size={11} /> Sign here</div>
            <div data-cmp="signsign.field_name" className="absolute left-[56px] top-[676px] w-[150px] h-[22px] rounded-[3px] border border-emerald-500/70 bg-emerald-400/10 flex items-center px-1 text-gray-900">Maya Lindqvist</div>
            <div data-cmp="signsign.field_date" className="absolute left-[56px] top-[704px] w-[110px] h-[22px] rounded-[3px] border border-emerald-500/70 bg-emerald-400/10 flex items-center px-1 text-gray-700">2026-11-13</div>
          </div>
        </div>
      </div>
    </MockupFrame>
  )
}
