"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Shield, Calendar, FileText, Bell, MapPin, Smartphone, Users, Clock, BarChart3, Send, ChevronRight, Check, Star, ArrowRight, Zap, Lock, Cpu, Menu, X } from "lucide-react"

// ============================================================================
// LANDING PAGE — SENTINEL SECURITY SUITE
// ============================================================================

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeFeature, setActiveFeature] = useState(0)
  const [formData, setFormData] = useState({ name: "", command: "", email: "", phone: "", message: "" })
  const [formSubmitted, setFormSubmitted] = useState(false)
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set())

  // Scroll detection for navbar
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set(prev).add(entry.target.id))
          }
        })
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    )

    document.querySelectorAll("[data-animate]").forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => setActiveFeature((p) => (p + 1) % features.length), 4000)
    return () => clearInterval(interval)
  }, [])

  const handleDemoRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (res.ok) setFormSubmitted(true)
    } catch {
      setFormSubmitted(true) // Show success anyway to not block UX
    }
  }

  const isVisible = (id: string) => visibleSections.has(id)

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">
      {/* ====== NAVBAR ====== */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "bg-[#030712]/80 backdrop-blur-2xl border-b border-white/5 shadow-2xl shadow-black/20" : ""}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight">Sentinel</span>
              <span className="text-[10px] font-bold text-blue-400 block leading-none tracking-widest uppercase">Security Suite</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-semibold text-white/60 hover:text-white transition-colors">Funzionalità</a>
            <a href="#pricing" className="text-sm font-semibold text-white/60 hover:text-white transition-colors">Prezzi</a>
            <a href="#demo" className="text-sm font-semibold text-white/60 hover:text-white transition-colors">Demo</a>
            <Link href="/login" className="text-sm font-bold text-white/80 hover:text-white transition-colors">Accedi</Link>
            <a href="#demo" className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-blue-500/25 transition-all active:scale-95">
              Richiedi Demo
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-white/60 hover:text-white">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0a0f1a]/95 backdrop-blur-2xl border-t border-white/5 px-6 py-6 space-y-4 animate-fade-up">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold text-white/70 py-2">Funzionalità</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold text-white/70 py-2">Prezzi</a>
            <a href="#demo" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold text-white/70 py-2">Demo</a>
            <Link href="/login" className="block text-sm font-bold text-white py-2">Accedi →</Link>
            <a href="#demo" className="block w-full text-center px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-sm font-bold">Richiedi Demo Gratuita</a>
          </div>
        )}
      </nav>

      {/* ====== HERO ====== */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 px-6">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] left-[15%] w-[600px] h-[600px] bg-blue-600/8 rounded-full blur-[128px]" />
          <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-[128px]" />
          <div className="absolute top-[50%] left-[50%] w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[128px] -translate-x-1/2 -translate-y-1/2" />
          {/* Grid */}
          <div className="absolute inset-0 opacity-[0.015]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px"
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-blue-300 mb-8 backdrop-blur-sm">
            <Zap className="w-3.5 h-3.5" />
            <span>La prima piattaforma SaaS per la Polizia Locale italiana</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6">
            <span className="block text-white">La Sala Operativa</span>
            <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">Digitale</span>
          </h1>

          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            Turni automatici, Ordini di Servizio con firma digitale, SOS GPS in tempo reale. 
            Tutto in un&apos;unica piattaforma cloud pensata per i Comandi di Polizia Locale.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#demo" className="group w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-base font-bold shadow-xl shadow-blue-600/20 hover:shadow-2xl hover:shadow-blue-600/30 transition-all active:scale-[0.97] flex items-center justify-center gap-2">
              Richiedi Demo Gratuita
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="#features" className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-base font-bold text-white/80 hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              Scopri le Funzionalità
            </a>
          </div>

          {/* Trust Badges */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-semibold text-white/25">
            <span className="flex items-center gap-2"><Lock className="w-3.5 h-3.5" /> Dati in Cloud Sicuro</span>
            <span className="flex items-center gap-2"><Shield className="w-3.5 h-3.5" /> GDPR Compliant</span>
            <span className="flex items-center gap-2"><Cpu className="w-3.5 h-3.5" /> Firma Digitale SHA-256</span>
            <span className="flex items-center gap-2"><Smartphone className="w-3.5 h-3.5" /> PWA Mobile</span>
          </div>
        </div>
      </section>

      {/* ====== SOCIAL PROOF BAR ====== */}
      <section className="border-y border-white/5 bg-white/[0.02] py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
          <div className="text-center">
            <div className="text-3xl font-black text-white">30+</div>
            <div className="text-xs font-bold text-white/30 uppercase tracking-widest mt-1">Agenti Gestiti</div>
          </div>
          <div className="hidden md:block w-px h-10 bg-white/10" />
          <div className="text-center">
            <div className="text-3xl font-black text-white">12.000+</div>
            <div className="text-xs font-bold text-white/30 uppercase tracking-widest mt-1">Turni Generati</div>
          </div>
          <div className="hidden md:block w-px h-10 bg-white/10" />
          <div className="text-center">
            <div className="text-3xl font-black text-white">100%</div>
            <div className="text-xs font-bold text-white/30 uppercase tracking-widest mt-1">Paperless</div>
          </div>
          <div className="hidden md:block w-px h-10 bg-white/10" />
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
            </div>
            <div className="text-xs font-bold text-white/30 uppercase tracking-widest mt-1">Altamura PL</div>
          </div>
        </div>
      </section>

      {/* ====== FEATURES ====== */}
      <section id="features" data-animate className="py-24 md:py-32 px-6">
        <div className={`max-w-7xl mx-auto transition-all duration-1000 ${isVisible("features") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-[11px] font-bold text-blue-400 mb-4 uppercase tracking-widest">
              Funzionalità
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              Tutto quello che serve al tuo Comando
            </h2>
            <p className="text-white/40 text-lg max-w-2xl mx-auto font-medium">
              Dalla pianificazione turni alla firma digitale degli OdS. Ogni funzionalità è pensata per le esigenze specifiche della Polizia Locale.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={i}
                className={`group relative p-7 rounded-2xl border transition-all duration-500 cursor-default ${
                  activeFeature === i
                    ? "bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border-blue-500/30 shadow-xl shadow-blue-500/5"
                    : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                }`}
                style={{ transitionDelay: `${i * 50}ms` }}
                onMouseEnter={() => setActiveFeature(i)}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all ${
                  activeFeature === i ? "bg-blue-500/20" : "bg-white/5 group-hover:bg-white/10"
                }`}>
                  <f.icon className={`w-6 h-6 ${activeFeature === i ? "text-blue-400" : "text-white/40 group-hover:text-white/60"}`} />
                </div>
                <h3 className="text-base font-bold mb-2 text-white/90">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed font-medium">{f.description}</p>
                {f.badge && (
                  <span className="absolute top-4 right-4 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-[9px] font-black text-amber-400 uppercase tracking-widest">
                    {f.badge}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== HOW IT WORKS ====== */}
      <section className="py-24 px-6 border-t border-white/5 bg-gradient-to-b from-transparent to-blue-950/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">Attivo in 10 Minuti</h2>
            <p className="text-white/40 text-lg font-medium">Setup guidato, nessuna installazione. Solo un browser.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={i} className="relative text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <span className="text-2xl font-black text-blue-400">{i + 1}</span>
                </div>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed font-medium">{s.description}</p>
                {i < 2 && (
                  <ChevronRight className="hidden md:block absolute top-8 -right-4 w-6 h-6 text-white/10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== PRICING ====== */}
      <section id="pricing" data-animate className="py-24 md:py-32 px-6 border-t border-white/5">
        <div className={`max-w-6xl mx-auto transition-all duration-1000 ${isVisible("pricing") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[11px] font-bold text-emerald-400 mb-4 uppercase tracking-widest">
              Pricing
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              Piani Trasparenti, Senza Sorprese
            </h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto font-medium mb-8">
              Inizia con il trial gratuito. Passa al piano che fa per te quando sei pronto.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-full p-1">
              <button onClick={() => setBillingCycle("monthly")} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${billingCycle === "monthly" ? "bg-white text-slate-900" : "text-white/50 hover:text-white"}`}>
                Mensile
              </button>
              <button onClick={() => setBillingCycle("annual")} className={`px-5 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${billingCycle === "annual" ? "bg-white text-slate-900" : "text-white/50 hover:text-white"}`}>
                Annuale <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <div key={i} className={`relative rounded-3xl p-8 transition-all duration-300 ${
                plan.popular
                  ? "bg-gradient-to-b from-blue-600/15 to-indigo-600/10 border-2 border-blue-500/30 shadow-2xl shadow-blue-500/10 scale-[1.02]"
                  : "bg-white/[0.03] border border-white/10 hover:border-white/20"
              }`}>
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                    Più Popolare
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm text-white/40 font-medium">{plan.description}</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black">
                      €{billingCycle === "annual" ? Math.round(plan.price * 0.8) : plan.price}
                    </span>
                    <span className="text-white/30 text-sm font-semibold">/mese</span>
                  </div>
                  {plan.price === 0 && <p className="text-xs text-white/30 mt-1 font-medium">30 giorni, senza carta di credito</p>}
                  {billingCycle === "annual" && plan.price > 0 && (
                    <p className="text-xs text-emerald-400 mt-1 font-semibold">
                      Risparmi €{Math.round(plan.price * 12 * 0.2)}/anno
                    </p>
                  )}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm">
                      <Check className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                      <span className="text-white/60 font-medium">{f}</span>
                    </li>
                  ))}
                </ul>
                <a href="#demo" className={`block text-center py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.97] ${
                  plan.popular
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20 hover:shadow-xl"
                    : "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
                }`}>
                  {plan.price === 0 ? "Inizia il Trial" : "Contattaci"}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== TESTIMONIAL ====== */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-1 text-amber-400 mb-6">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
          </div>
          <blockquote className="text-xl md:text-2xl font-bold text-white/80 leading-relaxed mb-6 italic">
            &ldquo;Prima di Sentinel, passavamo ore ogni settimana a compilare turni e OdS su Excel. 
            Ora è tutto automatico, certificato e accessibile dal telefono. 
            I nostri agenti ricevono i turni su Telegram in un click.&rdquo;
          </blockquote>
          <div>
            <div className="text-sm font-bold text-white/60">Comando Polizia Locale</div>
            <div className="text-xs text-white/30 font-medium">Altamura (BA) · Primo cliente Sentinel</div>
          </div>
        </div>
      </section>

      {/* ====== DEMO REQUEST ====== */}
      <section id="demo" data-animate className="py-24 md:py-32 px-6 border-t border-white/5 bg-gradient-to-b from-transparent to-blue-950/20">
        <div className={`max-w-2xl mx-auto transition-all duration-1000 ${isVisible("demo") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[11px] font-bold text-indigo-400 mb-4 uppercase tracking-widest">
              Demo Gratuita
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              Prova Sentinel Gratis
            </h2>
            <p className="text-white/40 text-lg font-medium">
              Compila il form e ti attiveremo un ambiente demo in 24 ore. Nessun obbligo, nessuna carta di credito.
            </p>
          </div>

          {formSubmitted ? (
            <div className="text-center py-16 bg-white/[0.03] border border-emerald-500/20 rounded-3xl">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Richiesta Inviata!</h3>
              <p className="text-white/40 font-medium">Ti contatteremo entro 24 ore per attivare la tua demo.</p>
            </div>
          ) : (
            <form onSubmit={handleDemoRequest} className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 md:p-10 space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-bold text-white/40 uppercase tracking-widest mb-2">Il Tuo Nome *</label>
                  <input
                    type="text" required
                    value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-semibold placeholder:text-white/15 focus:border-blue-500/50 focus:outline-none transition-all"
                    placeholder="Mario Rossi"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-white/40 uppercase tracking-widest mb-2">Nome Comando *</label>
                  <input
                    type="text" required
                    value={formData.command} onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-semibold placeholder:text-white/15 focus:border-blue-500/50 focus:outline-none transition-all"
                    placeholder="PL Comune di..."
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-bold text-white/40 uppercase tracking-widest mb-2">Email *</label>
                  <input
                    type="email" required
                    value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-semibold placeholder:text-white/15 focus:border-blue-500/50 focus:outline-none transition-all"
                    placeholder="comandante@comune.it"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-white/40 uppercase tracking-widest mb-2">Telefono</label>
                  <input
                    type="tel"
                    value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-semibold placeholder:text-white/15 focus:border-blue-500/50 focus:outline-none transition-all"
                    placeholder="+39 ..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-white/40 uppercase tracking-widest mb-2">Messaggio (opzionale)</label>
                <textarea
                  value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-semibold placeholder:text-white/15 focus:border-blue-500/50 focus:outline-none transition-all resize-none h-24"
                  placeholder="Raccontaci le tue esigenze..."
                />
              </div>
              <button type="submit" className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-base font-bold shadow-xl shadow-blue-600/20 hover:shadow-2xl hover:shadow-blue-600/30 transition-all active:scale-[0.97] flex items-center justify-center gap-2">
                <Send className="w-4 h-4" /> Invia Richiesta Demo
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="border-t border-white/5 bg-[#020617] py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Shield className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="text-lg font-black">Sentinel</span>
              </div>
              <p className="text-sm text-white/30 max-w-xs leading-relaxed font-medium">
                La piattaforma cloud per la gestione operativa dei Comandi di Polizia Locale. Turni, OdS, reperibilità e molto altro.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Prodotto</h4>
              <ul className="space-y-3">
                <li><a href="#features" className="text-sm text-white/30 hover:text-white/60 transition-colors font-medium">Funzionalità</a></li>
                <li><a href="#pricing" className="text-sm text-white/30 hover:text-white/60 transition-colors font-medium">Prezzi</a></li>
                <li><a href="#demo" className="text-sm text-white/30 hover:text-white/60 transition-colors font-medium">Richiedi Demo</a></li>
                <li><Link href="/login" className="text-sm text-white/30 hover:text-white/60 transition-colors font-medium">Accedi</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 font-sans tracking-wide">Legal</h4>
              <ul className="space-y-3">
                <li><Link href="/policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Termini di Servizio</Link></li>
                <li><Link href="/faq" className="hover:text-white transition-colors">GDPR & Compliance</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/20 font-medium">
              © {new Date().getFullYear()} Sentinel Security Suite. Tutti i diritti riservati.
            </p>
            <p className="text-xs text-white/20 font-medium">
              Made with ❤️ in Italia
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ============================================================================
// DATA
// ============================================================================

const features = [
  {
    icon: Calendar,
    title: "Turni Automatici",
    description: "Genera turni ciclici per l'intero anno con un click. Pattern personalizzabili per ogni squadra con riposi dinamici.",
    badge: null
  },
  {
    icon: FileText,
    title: "Ordini di Servizio Digitali",
    description: "OdS con drag & drop, firma digitale SHA-256 e QR Code di verifica. PDF certificati pronti per la stampa.",
    badge: "Premium"
  },
  {
    icon: MapPin,
    title: "SOS & GPS in Tempo Reale",
    description: "Pulsante emergenza con coordinate GPS. Il centralino vede la posizione degli agenti in campo in tempo reale.",
    badge: "Unico"
  },
  {
    icon: Clock,
    title: "Timbrature Geolocalizzate",
    description: "Clock-in e clock-out con verifica GPS e raggio configurabile. Basta fogli firma cartacei.",
    badge: null
  },
  {
    icon: Bell,
    title: "Notifiche Push & Telegram",
    description: "Turni pubblicati? Gli agenti ricevono una notifica istantanea su Telegram e nell'app. Scambi e assenze in tempo reale.",
    badge: null
  },
  {
    icon: Users,
    title: "Gestione Assenze & Scambi",
    description: "Richieste ferie, malattia, 104, permessi con workflow di approvazione. Bacheca scambi turno tra colleghi.",
    badge: null
  },
  {
    icon: BarChart3,
    title: "Report & Statistiche",
    description: "Dashboard KPI, ore lavorate, straordinari, tasso assenteismo. Export Excel per la Ragioneria del Comune.",
    badge: null
  },
  {
    icon: Smartphone,
    title: "App Mobile (PWA)",
    description: "Installabile come app su iPhone e Android. I tuoi agenti consultano i turni senza scaricare nulla dagli store.",
    badge: null
  },
  {
    icon: Shield,
    title: "Automazione Scuole",
    description: "Assegnamento automatico dei servizi scolastici in base ai plessi e agli orari di entrata/uscita configurati.",
    badge: "Specifico PL"
  },
]

const steps = [
  {
    title: "Registra il tuo Comando",
    description: "Inserisci il nome del Comando e il codice univoco. Ti attiviamo l'ambiente in pochi minuti."
  },
  {
    title: "Importa il Personale",
    description: "Carica l'elenco agenti da CSV/Excel. Configura squadre e cicli di turno con il wizard guidato."
  },
  {
    title: "Sei Operativo",
    description: "Genera i turni del mese, pubblica l'OdS con firma digitale, ricevi le richieste degli agenti. Tutto dal browser."
  }
]

const plans = [
  {
    name: "Starter",
    description: "Per piccoli comandi",
    price: 99,
    popular: false,
    features: [
      "Fino a 20 agenti",
      "Pianificazione turni mensile",
      "OdS con firma digitale",
      "Dashboard agente",
      "Export Excel",
      "Supporto email"
    ]
  },
  {
    name: "Professional",
    description: "La scelta più completa",
    price: 199,
    popular: true,
    features: [
      "Fino a 50 agenti",
      "Tutto di Starter, più:",
      "Timbrature GPS",
      "SOS Emergenze",
      "Notifiche Telegram",
      "Report & Statistiche",
      "Gestione Scuole",
      "Supporto prioritario"
    ]
  },
  {
    name: "Enterprise",
    description: "Per comandi strutturati",
    price: 349,
    popular: false,
    features: [
      "Agenti illimitati",
      "Tutto di Professional, più:",
      "Export formato paghe",
      "API REST integrazione",
      "White-label (tuo logo)",
      "SLA garantito 99.9%",
      "Account manager dedicato"
    ]
  }
]
