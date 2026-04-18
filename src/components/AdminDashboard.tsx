"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useAdminData } from "@/hooks/useAdminData"
import { AdminStateProvider } from "./admin/AdminStateContext"

// UI Components
import { AdminToolbar } from "./admin/AdminToolbar"
import AdminShiftGrid from "./admin/AdminShiftGrid"
import AdminVerbatelPanel from "./admin/AdminVerbatelPanel"
import AdminSwapApprovals from "./admin/AdminSwapApprovals"
import AdminAlertModal from "./admin/AdminAlertModal"
import SettingsPanel, { TabType } from "./SettingsPanel"
import ServiceManagerPanel from "./ServiceManagerPanel"
import ServiceOrderDashboard from "./ServiceOrderDashboard"
import AdminRegistersPanel from "./admin/AdminRegistersPanel"
import BachecaPanel from "./BachecaPanel"

// Modals
import { AdminPersonnelModal } from "./admin/AdminPersonnelModal"
import { AdminAuditModal } from "./admin/AdminAuditModal"
import { AdminBulkAbsenceModal } from "./admin/AdminBulkAbsenceModal"

export default function AdminDashboard({ 
  allAgents, 
  shifts, 
  currentMonth, 
  currentYear, 
  isPublished, 
  settings, 
  tenantSlug,
  rotationGroups = [],
  categories = []
}: any) {
  const router = useRouter()
  
  // Modals Local Visiblity
  const [showAnagrafica, setShowAnagrafica] = useState(false)
  const [showAuditLog, setShowAuditLog] = useState(false)
  const [showBulkAbsence, setShowBulkAbsence] = useState(false)
  const [showSettings, setShowSettings] = useState<boolean | string>(false)
  const [showVerbatelSync, setShowVerbatelSync] = useState(false)
  const [showSwapApprovals, setShowSwapApprovals] = useState(false)
  const [showSalaOperativa, setShowSalaOperativa] = useState(false)
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [showStampaOds, setShowStampaOds] = useState(false)
  const [showRegisters, setShowRegisters] = useState(false)
  const [showBacheca, setShowBacheca] = useState(false)
  
  const [isMobileView, setIsMobileView] = useState(false)

  // Centralized Hook
  const admin = useAdminData(
    allAgents,
    shifts,
    currentYear,
    currentMonth,
    tenantSlug,
    settings
  )

  const stateValue = {
    currentYear,
    currentMonth,
    currentMonthName: admin.currentMonthName,
    isPublished,
    allAgents,
    shifts,
    tenantSlug,
    settings,
    rotationGroups,
    categories,
    fetchAgentBalances: admin.fetchAgentBalances
  }

  return (
    <AdminStateProvider value={stateValue}>
      <div className="space-y-6">
        <AdminToolbar 
          currentMonth={currentMonth} 
          currentYear={currentYear} 
          currentMonthName={admin.currentMonthName}
          isPublished={isPublished}
          onPublish={() => admin.handlePublish(isPublished)}
          onShowAnagrafica={() => setShowAnagrafica(true)}
          onShowAudit={() => { setShowAuditLog(true); admin.fetchAuditLogs(); }}
          onShowBulkAbsence={() => setShowBulkAbsence(true)}
          onShowRegisters={() => setShowRegisters(true)}
          onShowSettings={() => setShowSettings(true)}
          onShowVerbatel={() => setShowVerbatelSync(true)}
          onShowSwaps={() => { setShowSwapApprovals(true); admin.fetchPendingApprovals(); }}
          onShowBacheca={() => setShowBacheca(true)}
          pendingSwapsCount={admin.pendingSwaps.length}
          pendingRequestsCount={admin.pendingRequests.length}
          onSearch={admin.setSearchQuery}
          onRoleFilter={admin.setRoleFilter}
          onExportExcel={admin.handleExportExcel}
          onExportRepExcel={admin.handleExportRepExcel}
          onExportUfficialiExcel={admin.handleExportUfficialiExcel}
          onExportPDF={admin.handleExportPDF}
          onExportRepPDF={admin.handleExportRepPDF}
          onPrevMonth={admin.handlePrevMonth}
          onNextMonth={admin.handleNextMonth}
          onClear={admin.handleClear}
          onSyncVerbatel={admin.handleFetchVerbatelData}
          onAIResolve={admin.handleAIResolve}
          onSendPec={admin.handlePecSend}
          onSendAlert={() => setShowAlertModal(true)}
          onImportShifts={admin.handleImportShifts}
          onGenerateMonth={admin.handleGenerateMonth}
          isGenerating={admin.isGenerating}
          isResolving={admin.isResolving}
          isSendingPec={admin.isSendingPec}
          isSendingAlert={admin.isSendingAlert}
          isExportingPDF={admin.isExportingPDF}
          isPublishing={admin.isPublishing}
          isClearing={admin.isClearing}
          uploadStatus={admin.uploadStatus}
          isMobileView={isMobileView}
          onToggleMobileView={() => setIsMobileView(!isMobileView)}
          onShowSalaOperativa={() => setShowSalaOperativa(true)}
          onShowStampaOds={() => setShowStampaOds(true)}
          onShowParcoAuto={() => router.push(`/${tenantSlug}/admin/parco-auto`)}
          onShowSezioni={() => router.push(`/${tenantSlug}/admin/sezioni`)}
        />

        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
          <AdminShiftGrid 
            agents={admin.sortedAgents}
            shifts={shifts}
            isMobileView={isMobileView}
            dayInfo={admin.dayInfo}
            onToggleUfficiale={admin.handleToggleUff}
            onRecalcAgent={admin.handleRecalcAgent}
            onSaveCell={admin.handleSaveCellEdit}
            sortConfig={admin.sortConfig}
            onSort={admin.setSortConfig}
          />
        </div>

        {/* MODALS */}
        <AdminPersonnelModal 
          isOpen={showAnagrafica} 
          onClose={() => setShowAnagrafica(false)} 
        />

        <AdminAuditModal 
          isOpen={showAuditLog} 
          onClose={() => setShowAuditLog(false)}
          auditLogs={admin.auditLogs}
          isLoadingAudit={admin.isLoadingAudit}
          onRefresh={admin.fetchAuditLogs}
        />

        <AdminBulkAbsenceModal 
          isOpen={showBulkAbsence} 
          onClose={() => setShowBulkAbsence(false)}
        />

        {showSettings && (
          <SettingsPanel 
            initialTab={typeof showSettings === 'string' ? showSettings as TabType : undefined} 
            onClose={() => { setShowSettings(false); router.refresh() }} 
          />
        )}

        <AdminVerbatelPanel 
          isOpen={showVerbatelSync} 
          onClose={() => setShowVerbatelSync(false)} 
          script={admin.verbatelScript}
          isLoading={admin.isLoadingVerbatel}
          onFetch={admin.handleFetchVerbatelData}
          onGenerate={admin.handleGenerateVerbatelScript}
          testMode={admin.verbatelTestMode}
          onToggleTestMode={admin.setVerbatelTestMode}
          agents={admin.verbatelAgents}
        />

        <AdminSwapApprovals 
          isOpen={showSwapApprovals} 
          onClose={() => setShowSwapApprovals(false)} 
          isLoadingSwaps={admin.isLoadingSwaps}
          pendingSwaps={admin.pendingSwaps}
          pendingRequests={admin.pendingRequests}
          onApproveAction={admin.handleApproveAction}
        />

        {showSalaOperativa && (
          <div className="fixed inset-0 z-[100] bg-slate-900">
            <ServiceManagerPanel onClose={() => setShowSalaOperativa(false)} tenantSlug={tenantSlug} />
          </div>
        )}

        {showStampaOds && (
          <div className="fixed inset-0 z-[100] bg-slate-900 p-0 sm:p-4 overflow-auto">
             <div className="max-w-[1600px] mx-auto min-h-full sm:min-h-[calc(100vh-2rem)] shadow-2xl sm:rounded-3xl overflow-hidden bg-slate-50 relative border border-slate-700">
                <ServiceOrderDashboard onClose={() => setShowStampaOds(false)} tenantName={settings?.tenantName} />
             </div>
          </div>
        )}

        {showRegisters && (
          <div className="fixed inset-0 z-[90] bg-slate-100/80 backdrop-blur-sm p-4 sm:p-10 overflow-auto flex justify-center">
             <div className="w-full max-w-6xl relative h-fit bg-transparent">
                <div className="absolute -top-6 right-0">
                  <button onClick={() => setShowRegisters(false)} className="bg-white p-3 rounded-2xl shadow-xl text-slate-500 hover:text-rose-600 transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2 border border-slate-200 hover:border-rose-200">
                     Chiudi Registri
                  </button>
                </div>
                <div className="mt-8 h-full min-h-[500px]">
                  <AdminRegistersPanel 
                    allAgents={admin.sortedAgents}
                    currentYear={currentYear}
                    currentMonth={currentMonth}
                    settings={settings}
                  />
                </div>
             </div>
          </div>
        )}

         {showBacheca && (
           <div className="fixed inset-0 z-[90] bg-slate-100/80 backdrop-blur-sm p-4 sm:p-10 overflow-auto flex justify-center">
              <div className="w-full max-w-4xl relative h-fit bg-transparent">
                 <div className="absolute -top-6 right-0">
                   <button onClick={() => setShowBacheca(false)} className="bg-white p-3 rounded-2xl shadow-xl text-slate-500 hover:text-rose-600 transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2 border border-slate-200 hover:border-rose-200">
                      Chiudi Bacheca
                   </button>
                 </div>
                 <div className="mt-8 h-[700px] overflow-hidden rounded-2xl">
                   <BachecaPanel isAdmin={true} />
                 </div>
              </div>
           </div>
         )}

        {showAlertModal && (
          <AdminAlertModal
            onClose={() => setShowAlertModal(false)}
            isSending={admin.isSendingAlert}
            onSend={admin.handleSendAlert}
            recipients={admin.todayReperibili}
          />
        )}

      </div>
    </AdminStateProvider>
  )
}
