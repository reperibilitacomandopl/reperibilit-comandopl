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
import BachecaPanel from "./BachecaPanel"
import WelcomeTour from "./admin/WelcomeTour"

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
  isLocked,
  settings, 
  tenantSlug,
  rotationGroups = [],
  categories = [],
  currentUser
}: any) {
  const router = useRouter()
  
  // Modals Local Visiblity
  const canManageShifts = currentUser?.role === "ADMIN" || currentUser?.isSuperAdmin || currentUser?.canManageShifts;
  const [showAnagrafica, setShowAnagrafica] = useState(false)
  const [showAuditLog, setShowAuditLog] = useState(false)
  const [showBulkAbsence, setShowBulkAbsence] = useState(false)
  const [showSettings, setShowSettings] = useState<boolean | string>(false)
  const [showVerbatelSync, setShowVerbatelSync] = useState(false)
  const [showSwapApprovals, setShowSwapApprovals] = useState(false)
  const [showSalaOperativa, setShowSalaOperativa] = useState(false)
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [showStampaOds, setShowStampaOds] = useState(false)
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
    isLocked,
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
        {/* Welcome Tour for new admins */}
        <WelcomeTour 
          tenantSlug={tenantSlug}
          hasAgents={allAgents.length > 0}
          hasGroups={rotationGroups.length > 0}
          hasSchools={false}
          hasCategories={categories.length > 0}
          hasPecConfig={!!settings?.pecHost}
        />

        <AdminToolbar 
          currentUser={currentUser}
          currentMonth={currentMonth} 
          currentYear={currentYear} 
          currentMonthName={admin.currentMonthName}
          isPublished={isPublished}
          isLocked={isLocked}
          onPublish={() => admin.handlePublish(isPublished)}
          onLock={() => admin.handleLock(isLocked)}
          onShowAnagrafica={() => setShowAnagrafica(true)}
          onShowAudit={() => { setShowAuditLog(true); admin.fetchAuditLogs(); }}
          onShowBulkAbsence={() => setShowBulkAbsence(true)}
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
          onExportPayroll={admin.handleExportPayroll}
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
          onShowRadio={() => router.push(`/${tenantSlug}/admin/radio`)}
          onShowSezioni={() => router.push(`/${tenantSlug}/admin/sezioni`)}
        />

        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
          <AdminShiftGrid 
            agents={admin.sortedAgents}
            shifts={shifts}
            isMobileView={isMobileView}
            dayInfo={admin.dayInfo}
            readOnly={!canManageShifts}
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


         {showBacheca && (
           <div className="fixed inset-0 z-[90] bg-slate-100/80 backdrop-blur-sm p-4 sm:p-10 overflow-auto flex justify-center">
              <div className="w-full max-w-4xl relative h-fit bg-transparent">
                 <div className="mt-8 h-[700px] overflow-hidden rounded-2xl">
                   <BachecaPanel isAdmin={true} onClose={() => setShowBacheca(false)} />
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
