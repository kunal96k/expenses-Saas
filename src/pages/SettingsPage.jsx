import React, { useMemo } from 'react';
import Swal from 'sweetalert2';
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

const SettingsPage = ({ activePage, userRole, systemSettings, setSystemSettings, defaultSystemSettings, onSaveSettings, onResetSettings }) => {
  const isGeneral = activePage === 'general-settings';
  const isPreferences = activePage === 'preferences';

  const canEditGeneral = ['Super Admin', 'Superior Super Admin'].includes(userRole);
  const canEditPreferences = true; // All roles can edit preferences

  const canEdit = isGeneral ? canEditGeneral : canEditPreferences;

  const settings = systemSettings || defaultSystemSettings;
  const setAtPath = (path, value) => {
    if (!setSystemSettings) return;
    setSystemSettings(prev => {
      const base = prev || defaultSystemSettings;
      const next = (typeof structuredClone === 'function') ? structuredClone(base) : JSON.parse(JSON.stringify(base));
      let cur = next;
      for (let i = 0; i < path.length - 1; i += 1) {
        cur = cur[path[i]];
      }
      cur[path[path.length - 1]] = value;
      return next;
    });
  };

  const validationErrors = useMemo(() => {
    const errs = [];
    const s = settings;

    const sessionTimeout = Number(s?.general?.security?.sessionTimeoutMins);
    if (!Number.isFinite(sessionTimeout) || sessionTimeout < 5 || sessionTimeout > 240) {
      errs.push('Session Timeout must be between 5 and 240 minutes.');
    }

    const minLen = Number(s?.general?.security?.passwordMinLength);
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
              <SettingsRow iconClass="bi-bell" iconBg="s-icon-slate" label="Enable Notifications" desc="Show system alerts and important operational notifications.">
                <SettingsSwitch checked={!!settings.general.system.enableNotifications} disabled={!canEdit} onChange={(v) => setAtPath(['general', 'system', 'enableNotifications'], v)} />
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

          <div className="settings-group">
            <div className="settings-group-title">Report Settings</div>
            <div className="settings-card">
              <SettingsRow iconClass="bi-file-earmark-bar-graph" iconBg="s-icon-blue" label="Default Export Format" desc="Preselect export type in Reports module.">
                <select className="settings-select" value={settings.preferences.reports.defaultExportFormat} disabled={!canEdit} onChange={(e) => setAtPath(['preferences', 'reports', 'defaultExportFormat'], e.target.value)}>
                  <option value="PDF">PDF</option>
                  <option value="Excel">Excel</option>
                </select>
              </SettingsRow>
              <SettingsRow iconClass="bi-envelope-check" iconBg="s-icon-blue" label="Auto-Email Reports" desc="Automatically send scheduled reports to company email.">
                <SettingsSwitch checked={!!settings.preferences.reports.autoEmailReports} disabled={!canEdit} onChange={(v) => setAtPath(['preferences', 'reports', 'autoEmailReports'], v)} />
              </SettingsRow>
              <SettingsRow iconClass="bi-clock-history" iconBg="s-icon-blue" label="Schedule Frequency" desc="How often should automated reports be sent?">
                <select className="settings-select" value={settings.preferences.reports.scheduleFrequency} disabled={!canEdit} onChange={(e) => setAtPath(['preferences', 'reports', 'scheduleFrequency'], e.target.value)}>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </SettingsRow>
              <SettingsRow iconClass="bi-calendar-event" iconBg="s-icon-blue" label="Scheduled Day" desc="Day of month (1-28) to avoid calendar errors.">
                <input type="number" className="settings-input" style={{ width: '80px' }} value={settings.preferences.reports.scheduledDay} disabled={!canEdit} onChange={(e) => setAtPath(['preferences', 'reports', 'scheduledDay'], e.target.value)} min={1} max={28} />
              </SettingsRow>
              <SettingsRow iconClass="bi-alarm" iconBg="s-icon-blue" label="Scheduled Time" desc="Exact time of day to trigger report generation.">
                <input type="time" className="settings-input" style={{ width: '120px' }} value={settings.preferences.reports.scheduledTime} disabled={!canEdit} onChange={(e) => setAtPath(['preferences', 'reports', 'scheduledTime'], e.target.value)} />
              </SettingsRow>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SettingsPage;
