import Link from "next/link"
import { Shield, Accessibility, FileText, Info, Building2 } from "lucide-react"

export default function InstitutionalFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-slate-900 text-slate-400 py-12 px-6 border-t border-slate-800">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand & Mission */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 text-white mb-4">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-xl font-black tracking-tight">Sentinel <span className="text-indigo-400">PL</span></span>
            </div>
            <p className="text-sm leading-relaxed max-w-sm">
              La piattaforma cloud avanzata per la gestione operativa dei Comandi di Polizia Locale. 
              Sicurezza, efficienza e trasparenza al servizio del cittadino e delle istituzioni.
            </p>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" /> Compliance PA
            </h4>
            <ul className="space-y-4 text-sm font-medium">
              <li>
                <Link href="/policy" className="hover:text-indigo-400 transition-colors flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Privacy Policy (GDPR)
                </Link>
              </li>
              <li>
                <Link href="/cookie-policy" className="hover:text-indigo-400 transition-colors flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/accessibilita" className="hover:text-indigo-400 transition-colors flex items-center gap-2">
                  <Accessibility className="w-4 h-4" /> Dichiarazione di Accessibilità
                </Link>
              </li>
            </ul>
          </div>

          {/* Institutional Links */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" /> Trasparenza
            </h4>
            <ul className="space-y-4 text-sm font-medium">
              <li>
                <Link href="/terms" className="hover:text-indigo-400 transition-colors flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Termini di Servizio
                </Link>
              </li>
              <li>
                <Link href="/trasparenza" className="hover:text-indigo-400 transition-colors flex items-center gap-2">
                  <Info className="w-4 h-4" /> Amministrazione Trasparente
                </Link>
              </li>
              <li>
                <a href="mailto:supporto@sentinel-pl.it" className="hover:text-indigo-400 transition-colors flex items-center gap-2">
                  <Info className="w-4 h-4" /> Supporto Tecnico
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-xs font-medium">
            © {currentYear} Sentinel Security Suite — Prodotto SaaS per la Pubblica Amministrazione.
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black bg-slate-800 px-2 py-1 rounded text-slate-500 uppercase tracking-tighter">
              v2.5.0-PROD
            </span>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Sistemi Operativi
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
