import React, { useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { apiService } from '../services/api';
import './SettingsPage.css';

const SettingsRow = ({ iconClass, iconBg, label, desc, children }) => (
  <div className="settings-row">
    <div className={`settings-icon-wrap ${iconBg}`}>
      <i className={`bi ${iconClass}`}></i>
    </div>
    <div className="settings-content">
      <div className="settings-label">{label}</div>
      <div className="settings-desc" title={desc}>{desc}</div>
    </div>
    <div className="settings-action">
      {children}
    </div>
  </div>
);

const SettingsSwitch = ({ checked, onChange, disabled }) => (
  <label className={`settings-switch ${checked ? 'active-switch' : ''}`}>
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} disabled={disabled} />
    <span className="slider"></span>
  </label>
);

const SettingsPage = ({ activePage, userRole, userProfile, systemSettings, setSystemSettings, defaultSystemSettings, onSaveSettings, onResetSettings }) => {
  const isGeneral = activePage === 'general-settings';
  const isPreferences = activePage === 'preferences';

  const canEditGeneral = ['Super Admin', 'Superior Super Admin'].includes(userRole);
  const canEditPreferences = true; // All roles can edit preferences

  const canEdit = isGeneral ? canEditGeneral : canEditPreferences;
  const [isSendingTestStatement, setIsSendingTestStatement] = useState(false);

  const settings = systemSettings || defaultSystemSettings;
  const reportSettings = settings.general?.reports || settings.preferences?.reports || defaultSystemSettings?.general?.reports || {};
  const setAtPath = (path, value) => {
    if (!setSystemSettings) return;
    setSystemSettings(prev => {
      const base = prev || defaultSystemSettings;
      const next = (typeof structuredClone === 'function') ? structuredClone(base) : JSON.parse(JSON.stringify(base));
      let cur = next;
      for (let i = 0; i < path.length - 1; i += 1) {
        if (!cur[path[i]]) cur[path[i]] = {};
        cur = cur[path[i]];
      }
      cur[path[path.length - 1]] = value;
      return next;
    });

    // Auto-persist immediately to backend if modifying report configuration
    if (path[0] === 'general' && path[1] === 'reports') {
      const updatedReports = {
        ...(settings.general?.reports || reportSettings),
        [path[2]]: value
      };
      const payload = {
        ...(settings.preferences || {}),
        general: {
          ...(settings.general || {}),
          reports: updatedReports
        },
        reports: updatedReports
      };
      apiService.patch('/auth/me/preferences', payload).catch(err => {
        console.error("Auto-persist schedule failed:", err);
      });
    }
  };

  const validationErrors = useMemo(() => {
    const errs = [];
    const s = settings;

    const sessionTimeout = Number(s?.general?.security?.sessionTimeoutMins ?? 30);
    if (!Number.isFinite(sessionTimeout) || sessionTimeout < 5 || sessionTimeout > 240) {
      errs.push('Session Timeout must be between 5 and 240 minutes.');
    }

    const minLen = Number(s?.general?.security?.passwordMinLength ?? 8);
    if (!Number.isFinite(minLen) || minLen < 6 || minLen > 64) {
      errs.push('Password Minimum Length must be between 6 and 64.');
    }

    return errs;
  }, [settings]);

  const handleSave = () => {
    if (!canEdit) return;
    if (validationErrors.length) {
      Swal.fire('Validation Error', validationErrors.join('\n'), 'error');
      return;
    }
    Swal.fire({
      icon: 'success',
      title: 'Settings Saved!',
      text: 'System settings were saved successfully.',
      timer: 1500,
      showConfirmButton: false
    });
    onSaveSettings?.(settings);
  };

  const handleSaveSchedule = async () => {
    if (!canEdit) return;
    try {
      const currentReports = settings.general?.reports || reportSettings;
      const payload = {
        ...(settings.preferences || {}),
        general: {
          ...(settings.general || {}),
          reports: currentReports
        },
        reports: currentReports
      };
      await apiService.patch('/auth/me/preferences', payload);
      Swal.fire({
        icon: 'success',
        title: 'Schedule Saved!',
        text: `Automated statement schedule saved (${currentReports.scheduleFrequency || 'Monthly'} on day ${currentReports.scheduledDay || '1'} at ${currentReports.scheduledTime || '10:00'}).`,
        timer: 2000,
        showConfirmButton: false
      });
      onSaveSettings?.({ ...settings, general: { ...(settings.general || {}), reports: currentReports } });
    } catch (err) {
      Swal.fire('Save Failed', err?.message || 'Unable to save schedule to server', 'error');
    }
  };

  const handleReset = () => {
    if (!canEdit) return;
    Swal.fire({
      title: 'Reset to Default?',
      text: 'This will overwrite current system settings.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, reset'
    }).then((result) => {
      if (result.isConfirmed) {
        if (setSystemSettings) setSystemSettings(defaultSystemSettings);
        onResetSettings?.(defaultSystemSettings);
        Swal.fire({
          icon: 'success',
          title: 'Reset Done',
          text: 'Settings were reset to default.',
          timer: 1200,
          showConfirmButton: false
        });
      }
    });
  };

  const handleSendTestStatement = async () => {
    try {
      setIsSendingTestStatement(true);
      const recipientTarget = reportSettings.recipientTarget || 'SUPERADMIN_ONLY';
      const exportFormat = reportSettings.defaultExportFormat || 'Excel';
      const res = await apiService.post(
        `/reports/send-scheduled-statement?recipientTarget=${encodeURIComponent(recipientTarget)}&exportFormat=${encodeURIComponent(exportFormat)}`,
        null
      );
      if (res?.success) {
        const recipientsList = Array.isArray(res.recipients) ? res.recipients.join(', ') : (res.recipient || 'Super Admin');
        Swal.fire({
          icon: 'success',
          title: 'Statement Dispatched!',
          html: `
            <div style="text-align: left; font-size: 0.85rem; line-height: 1.6;">
              <p class="mb-2">A bank-grade executive monthly financial statement has been generated and dispatched as per your settings.</p>
              <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 8px;">
                <div><strong>Recipient Group:</strong> <span class="badge bg-primary">${res.recipientTarget || recipientTarget}</span></div>
                <div><strong>Dispatched To:</strong> ${recipientsList} (${res.recipientCount || 1} recipients)</div>
                <div><strong>Format:</strong> <span class="badge bg-success">${res.exportFormat || exportFormat}</span></div>
                <div><strong>Reference:</strong> <code>${res.statementRef}</code></div>
                <div><strong>Period:</strong> ${res.period}</div>
                <div><strong>Total Inflow:</strong> <span style="color: #16a34a; font-weight: 700;">+₹${Number(res.totalCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                <div><strong>Total Outflow:</strong> <span style="color: #dc2626; font-weight: 700;">-₹${Number(res.totalDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                <div><strong>Net Position:</strong> <strong>₹${Number(res.netBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
                <div><strong>Attachment:</strong> <code>${res.attachmentFileName}</code></div>
              </div>
              <p class="text-muted small mb-0">Check the recipient inboxes for the styled statement email and attached ${res.exportFormat || exportFormat} document.</p>
            </div>
          `
        });
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Statement Generated with Notice',
          text: res?.error || 'Email dispatch completed with warnings. Check server mail logs.'
        });
      }
    } catch (err) {
      console.error('Failed to dispatch test statement:', err);
      Swal.fire('Dispatch Failed', err?.message || 'Failed to dispatch test statement email', 'error');
    } finally {
      setIsSendingTestStatement(false);
    }
  };

  return (
    <div className="settings-page p-3 p-md-4">
      {/* Premium Header */}
      <div className="settings-header">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
          <div>
            <h2 className="page-title mb-1">Settings</h2>
            <p className="text-muted small mb-0">System-wide configuration and user experience defaults.</p>
          </div>
          <div className="settings-action-btns d-flex gap-2">
            <button className="settings-reset-btn" disabled={!canEdit} onClick={handleReset}>
              <i className="bi bi-arrow-counterclockwise me-2"></i> Reset
            </button>
            <button className="settings-save-btn" disabled={!canEdit} onClick={handleSave}>
              <i className="bi bi-check2-circle me-2"></i> Save Settings
            </button>
          </div>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className="alert alert-danger" role="alert" style={{ borderRadius: '16px' }}>
          <div className="fw-bold mb-1">Please fix these settings:</div>
          <div className="small" style={{ whiteSpace: 'pre-line' }}>{validationErrors.join('\n')}</div>
        </div>
      )}

      {/* Segmented Control Tabs (Only visible if mobile, otherwise sidebar handles it) */}
      <div className="settings-tabs-wrapper d-block d-md-none">
        <div className="settings-tabs">
          {canEditGeneral && (
            <button className={`settings-tab ${isGeneral ? 'active' : ''}`} disabled>
              <i className="bi bi-gear"></i>
              General
            </button>
          )}
          <button className={`settings-tab ${isPreferences ? 'active' : ''}`} disabled>
            <i className="bi bi-sliders"></i>
            Preferences
          </button>
        </div>
      </div>

      {isGeneral && (
        <>
          <div className="settings-group">
            <div className="settings-group-title">Company Defaults</div>
            <div className="settings-card">
              <SettingsRow iconClass="bi-building" iconBg="s-icon-blue" label="Default Currency" desc="Applied as default currency for new companies and transactions.">
                <select className="settings-select" value={settings.general.companyDefaults.currency} disabled={!canEdit} onChange={(e) => setAtPath(['general', 'companyDefaults', 'currency'], e.target.value)}>
                  <option value="INR (₹)">INR (₹)</option>
                </select>
              </SettingsRow>
              <SettingsRow iconClass="bi-calendar-date" iconBg="s-icon-blue" label="Default Date Format" desc="Controls date display across tables and reports.">
                <select className="settings-select" value={settings.general.companyDefaults.dateFormat} disabled={!canEdit} onChange={(e) => setAtPath(['general', 'companyDefaults', 'dateFormat'], e.target.value)}>
                  <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </SettingsRow>
              <SettingsRow iconClass="bi-globe" iconBg="s-icon-blue" label="Default Time Zone" desc="Used for timestamps and audit logs.">
                <select className="settings-select" value={settings.general.companyDefaults.timeZone} disabled={!canEdit} onChange={(e) => setAtPath(['general', 'companyDefaults', 'timeZone'], e.target.value)}>
                  <option value="Asia/Kolkata">Asia/Kolkata</option>
                  <option value="UTC">UTC</option>
                </select>
              </SettingsRow>
            </div>
          </div>




          <div className="settings-group">
            <div className="settings-group-title">Security Settings</div>
            <div className="settings-card">
              <SettingsRow iconClass="bi-clock-history" iconBg="s-icon-red" label="Session Timeout" desc="Recommended: 30 minutes. Range: 5–240.">
                <input type="number" className="settings-input" style={{ width: '80px' }} value={settings.general.security.sessionTimeoutMins} disabled={!canEdit} onChange={(e) => setAtPath(['general', 'security', 'sessionTimeoutMins'], Number(e.target.value))} min={5} max={240} />
              </SettingsRow>
              <SettingsRow iconClass="bi-key" iconBg="s-icon-red" label="Password Minimum Length" desc="Minimum allowed characters for user passwords.">
                <input type="number" className="settings-input" style={{ width: '80px' }} value={settings.general.security.passwordMinLength} disabled={!canEdit} onChange={(e) => setAtPath(['general', 'security', 'passwordMinLength'], Number(e.target.value))} min={6} max={64} />
              </SettingsRow>
              <SettingsRow iconClass="bi-shield-lock" iconBg="s-icon-red" label="Strong Password Policy" desc="Encourage stronger passwords (uppercase, lowercase, number, symbol).">
                <SettingsSwitch checked={!!settings.general.security.strongPasswordPolicy} disabled={!canEdit} onChange={(v) => setAtPath(['general', 'security', 'strongPasswordPolicy'], v)} />
              </SettingsRow>
            </div>
          </div>

          <div className="settings-group">
            <div className="settings-group-title">System Settings</div>
            <div className="settings-card">
              <SettingsRow iconClass="bi-info-circle" iconBg="s-icon-blue" label="Application Version" desc="Current running build of TechnoKraft Expenses SaaS.">
                <span className="badge bg-primary-subtle text-primary fw-bold px-3 py-2 rounded-pill" style={{ fontSize: '0.8rem' }}>v3.1</span>
              </SettingsRow>
              <SettingsRow iconClass="bi-bell" iconBg="s-icon-slate" label="Enable Notifications" desc="Show system alerts and important operational notifications.">
                <SettingsSwitch checked={!!settings.general.system.enableNotifications} disabled={!canEdit} onChange={(v) => setAtPath(['general', 'system', 'enableNotifications'], v)} />
              </SettingsRow>
              <SettingsRow iconClass="bi-code-square" iconBg="s-icon-slate" label="Enable Developer Tools" desc="Show floating developer support gear icon for Super Admins.">
                <SettingsSwitch checked={!!settings.general.system.enableDevTools} disabled={!canEdit} onChange={(v) => setAtPath(['general', 'system', 'enableDevTools'], v)} />
              </SettingsRow>
            </div>
          </div>

          <div className="settings-group">
            <div className="settings-group-title d-flex justify-content-between align-items-center">
              <span>Report Settings</span>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                <i className="bi bi-shield-check me-1"></i> System Executive
              </span>
            </div>
            <div className="settings-card">
              <SettingsRow iconClass="bi-file-earmark-bar-graph" iconBg="s-icon-blue" label="Default Export Format" desc="Format for automated statements and ledger attachments.">
                <select className="settings-select" value={reportSettings.defaultExportFormat || 'Excel'} disabled={!canEdit} onChange={(e) => setAtPath(['general', 'reports', 'defaultExportFormat'], e.target.value)}>
                  <option value="Excel">Excel Spreadsheet (.xlsx)</option>
                  <option value="PDF">PDF Document (.pdf)</option>
                  <option value="CSV">CSV Spreadsheet (.csv)</option>
                </select>
              </SettingsRow>
              <SettingsRow 
                iconClass="bi-people-fill" 
                iconBg="s-icon-indigo" 
                label="Statement Recipients" 
                desc="Select who receives automated monthly statements: Super Admin only, Viewers only, or Both."
              >
                <select 
                  className="settings-select" 
                  value={reportSettings.recipientTarget || 'SUPERADMIN_ONLY'} 
                  disabled={!canEdit} 
                  onChange={(e) => setAtPath(['general', 'reports', 'recipientTarget'], e.target.value)}
                >
                  <option value="SUPERADMIN_ONLY">Super Admin Only</option>
                  <option value="BOTH">Both (Super Admin &amp; Viewers)</option>
                  <option value="VIEWER_ONLY">Viewers Only</option>
                </select>
              </SettingsRow>
              <SettingsRow 
                iconClass="bi-envelope-check" 
                iconBg="s-icon-blue" 
                label="Auto-Email Reports" 
                desc="Automatically send scheduled consolidated monthly statements as per recipient selection."
              >
                <div className="d-flex align-items-center gap-3">
                  <span className="text-muted small d-none d-md-inline" style={{ fontSize: '0.78rem' }}>
                    <i className="bi bi-person-badge text-primary me-1"></i>
                    {reportSettings.recipientTarget === 'BOTH' ? 'Super Admin & Viewers' : reportSettings.recipientTarget === 'VIEWER_ONLY' ? 'Viewers Only' : (userProfile?.email ? userProfile.email : 'Super Admin')}
                  </span>
                  <SettingsSwitch checked={!!reportSettings.autoEmailReports} disabled={!canEdit} onChange={(v) => setAtPath(['general', 'reports', 'autoEmailReports'], v)} />
                </div>
              </SettingsRow>
              <SettingsRow iconClass="bi-clock-history" iconBg="s-icon-blue" label="Schedule Frequency" desc="How often should automated reports be sent?">
                <select className="settings-select" value={reportSettings.scheduleFrequency || 'Monthly'} disabled={!canEdit} onChange={(e) => setAtPath(['general', 'reports', 'scheduleFrequency'], e.target.value)}>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </SettingsRow>
              <SettingsRow iconClass="bi-calendar-event" iconBg="s-icon-blue" label="Scheduled Day" desc="Day of month (1-28) to avoid calendar errors.">
                <input type="number" className="settings-input" style={{ width: '80px' }} value={reportSettings.scheduledDay || '1'} disabled={!canEdit} onChange={(e) => setAtPath(['general', 'reports', 'scheduledDay'], e.target.value)} min={1} max={28} />
              </SettingsRow>
              <SettingsRow iconClass="bi-alarm" iconBg="s-icon-blue" label="Scheduled Time" desc="Exact time of day to trigger report generation.">
                <input type="time" className="settings-input" style={{ width: '120px' }} value={reportSettings.scheduledTime || '10:00'} disabled={!canEdit} onChange={(e) => setAtPath(['general', 'reports', 'scheduledTime'], e.target.value)} />
              </SettingsRow>
              <SettingsRow 
                iconClass="bi-send-check" 
                iconBg="s-icon-green" 
                label="Save &amp; Test Schedule" 
                desc={`Save your active schedule or dispatch an instant test statement with ${reportSettings.defaultExportFormat || 'Excel'} attachment.`}
              >
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    className="btn btn-sm btn-primary d-inline-flex align-items-center gap-2 px-3 py-1 fw-semibold"
                    style={{ borderRadius: '8px', fontSize: '0.82rem' }}
                    onClick={handleSaveSchedule}
                    disabled={!canEdit}
                  >
                    <i className="bi bi-check-circle-fill"></i>
                    <span>Save Schedule</span>
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-2 px-3 py-1 fw-semibold"
                    style={{ borderRadius: '8px', fontSize: '0.82rem' }}
                    onClick={handleSendTestStatement}
                    disabled={isSendingTestStatement || !canEdit}
                  >
                    {isSendingTestStatement ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        <span>Sending Statement...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-send-fill"></i>
                        <span>Send Test Statement Now</span>
                      </>
                    )}
                  </button>
                </div>
              </SettingsRow>
            </div>
          </div>
        </>
      )}

      {isPreferences && (
        <>
          <div className="settings-group">
            <div className="settings-group-title">UI Settings</div>
            <div className="settings-card">
              <SettingsRow iconClass={settings.preferences.ui.theme === 'Dark' ? 'bi-moon-fill' : 'bi-sun-fill'} iconBg="s-icon-purple" label="Dark Mode" desc="Switch between light and dark application themes.">
                <SettingsSwitch checked={settings.preferences.ui.theme === 'Dark'} disabled={!canEdit} onChange={(v) => setAtPath(['preferences', 'ui', 'theme'], v ? 'Dark' : 'Light')} />
              </SettingsRow>
              <SettingsRow iconClass="bi-arrows-collapse" iconBg="s-icon-purple" label="Compact View" desc="Reduce whitespace for data-heavy screens.">
                <SettingsSwitch checked={!!settings.preferences.ui.compactView} disabled={!canEdit} onChange={(v) => setAtPath(['preferences', 'ui', 'compactView'], v)} />
              </SettingsRow>
            </div>
          </div>

          <div className="settings-group">
            <div className="settings-group-title">Dashboard Settings</div>
            <div className="settings-card">
              <SettingsRow iconClass="bi-bar-chart-fill" iconBg="s-icon-orange" label="Show Charts" desc="Enable or disable graphs across dashboards.">
                <SettingsSwitch checked={!!settings.preferences.dashboard.showCharts} disabled={!canEdit} onChange={(v) => setAtPath(['preferences', 'dashboard', 'showCharts'], v)} />
              </SettingsRow>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SettingsPage;
