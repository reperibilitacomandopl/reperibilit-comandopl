import { prisma } from "@/lib/prisma"
import { ShieldCheck, ShieldAlert, Calendar, User, Building, Fingerprint, Clock, FileCheck } from "lucide-react"
import Image from "next/image"

export default async function VerifyPage({ params }: { params: { hash: string } }) {
  const { hash } = params
  
  const doc = await prisma.certifiedDocument.findUnique({
    where: { hash },
    include: { tenant: true }
  })

  const metadata = doc?.metadata ? JSON.parse(doc.metadata) : null

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Header Istituzionale */}
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        <div className={`p-8 text-center ${doc ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          <div className="flex justify-center mb-4">
            {doc ? (
              <div className="bg-white/20 p-4 rounded-full backdrop-blur-md">
                <ShieldCheck className="text-white w-16 h-16" />
              </div>
            ) : (
              <div className="bg-white/20 p-4 rounded-full backdrop-blur-md">
                <ShieldAlert className="text-white w-16 h-16" />
              </div>
            )}
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
            {doc ? "Documento Autentico" : "Verifica Fallita"}
          </h1>
          <p className="text-white/80 text-sm mt-2 font-medium">
            Sentinel Security Suite - Protocollo Validazione Digitale
          </p>
        </div>

        <div className="p-8">
          {doc ? (
            <div className="space-y-8">
              <div className="flex items-start gap-4 p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                <FileCheck className="text-emerald-600 w-8 h-8 shrink-0 mt-1" />
                <div>
                  <h3 className="text-emerald-900 font-bold text-lg leading-tight">Certificazione di Integrità</h3>
                  <p className="text-emerald-700 text-sm mt-1">
                    Il presente documento è conforme all'originale generato dal sistema. L'impronta digitale coincide con il record depositato presso il Comando.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <Building className="text-slate-400 w-5 h-5" />
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Ente Emittente</p>
                    <p className="text-sm font-black text-slate-800">{doc.tenant?.name || "Comando Polizia Locale"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <User className="text-slate-400 w-5 h-5" />
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Responsabile Emissione</p>
                    <p className="text-sm font-black text-slate-800">{doc.issuerName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="text-slate-400 w-5 h-5" />
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Tipo Documento</p>
                    <p className="text-sm font-black text-slate-800">{doc.type}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="text-slate-400 w-5 h-5" />
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Data Emissione</p>
                    <p className="text-sm font-black text-slate-800">{new Date(doc.issuedAt).toLocaleString('it-IT')}</p>
                  </div>
                </div>
              </div>

              {metadata && (
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Dettagli del Protocollo</h4>
                  <div className="flex flex-wrap gap-4">
                    <div className="bg-white px-4 py-2 rounded-xl border border-slate-200">
                        <p className="text-[9px] text-slate-500 font-bold">MESE RIFERIMENTO</p>
                        <p className="text-xs font-black text-slate-800">{metadata.month} / {metadata.year}</p>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-xl border border-slate-200">
                        <p className="text-[9px] text-slate-500 font-bold">AGENTI GESTITI</p>
                        <p className="text-xs font-black text-slate-800">{metadata.agentsCount} Operatori</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-slate-100">
                <div className="flex items-start gap-4">
                  <Fingerprint className="text-slate-300 w-10 h-10 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Identificativo Crittografico Hash</p>
                    <p className="text-[11px] font-mono text-slate-600 break-all bg-slate-100 p-2 rounded-lg mt-1 select-all">
                      {hash}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100 mb-6">
                <p className="text-rose-700 font-bold">
                  Attenzione: L'identificativo fornito non corrisponde ad alcun documento certificato nel nostro sistema.
                </p>
              </div>
              <p className="text-slate-500 text-sm">
                Se hai scansionato un codice da un documento ufficiale, contatta immediatamente il Comando di competenza per segnalare una possibile contraffazione o un errore di sistema.
              </p>
            </div>
          )}
        </div>
      </div>
      
      <p className="mt-8 text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">
        &copy; 2026 Sentinel Security Suite &middot; Protocollo PA-DIGIT-V1
      </p>
    </div>
  )
}
