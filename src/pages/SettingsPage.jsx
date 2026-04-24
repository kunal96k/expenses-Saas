import React, { useMemo } from 'react';
import Swal from 'sweetalert2';

const SettingsPage = ({ activePage, userRole, systemSettings, setSystemSettings, defaultSystemSettings }) => {
  const isGeneral = activePage === 'general-settings';
  const isPreferences = activePage === 'preferences';

  const canEdit = userRole === 'Super Admin';

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

    const openingBehavior = s?.general?.financial?.openingBalanceBehavior;
    if (!['Manual', 'Auto-calculated'].includes(openingBehavior)) {
      errs.push('Default Opening Balance Behavior must be Manual or Auto-calculated.');
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
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="page-title mb-1">Settings</h2>
          <p className="text-muted small mb-0">System-wide configuration and user experience defaults.</p>
        </div>
        <div className="d-flex gap-2 w-100 w-md-auto">
          <button className="btn btn-light w-50 w-md-auto" disabled={!canEdit} onClick={handleReset}>
            <i className="bi bi-arrow-counterclockwise me-2"></i> Reset to Default
          </button>
          <button className="btn btn-primary-custom w-50 w-md-auto" disabled={!canEdit} onClick={handleSave}>
            <i className="bi bi-check2-circle me-2"></i> Save Settings
          </button>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className="alert alert-danger" role="alert">
          <div className="fw-bold mb-1">Please fix these settings:</div>
          <div className="small" style={{ whiteSpace: 'pre-line' }}>{validationErrors.join('\n')}</div>
        </div>
      )}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex gap-2">
            <button
              type="button"
              className={`btn ${isGeneral ? 'btn-primary-custom' : 'btn-light'}`}
              onClick={() => {}}
              disabled
            >
              <i className="bi bi-gear me-2"></i>
              General Settings
            </button>
            <button
              type="button"
              className={`btn ${isPreferences ? 'btn-primary-custom' : 'btn-light'}`}
              onClick={() => {}}
              disabled
            >
              <i className="bi bi-sliders me-2"></i>
              Preferences
            </button>
          </div>
          <div className="small text-muted mt-2">
            Use the left sidebar to switch between <b>General Settings</b> and <b>Preferences</b>.
          </div>
        </div>
      </div>

      {isGeneral && (
        <>
          <div className="row g-4">
            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <i className="bi bi-building text-primary"></i>
                    <h5 className="mb-0 fw-bold">Company Defaults</h5>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Default Currency</label>
                    <select
                      className="form-select"
                      value={settings.general.companyDefaults.currency}
                      disabled={!canEdit}
                      onChange={(e) => setAtPath(['general', 'companyDefaults', 'currency'], e.target.value)}
                    >
                      <option value="INR (₹)">INR (₹)</option>
                    </select>
                    <div className="form-text">Applied as default currency for new companies and transactions.</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Default Date Format</label>
                    <select
                      className="form-select"
                      value={settings.general.companyDefaults.dateFormat}
                      disabled={!canEdit}
                      onChange={(e) => setAtPath(['general', 'companyDefaults', 'dateFormat'], e.target.value)}
                    >
                      <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                    <div className="form-text">Controls date display across tables and reports.</div>
                  </div>

                  <div>
                    <label className="form-label">Default Time Zone</label>
                    <select
                      className="form-select"
                      value={settings.general.companyDefaults.timeZone}
                      disabled={!canEdit}
                      onChange={(e) => setAtPath(['general', 'companyDefaults', 'timeZone'], e.target.value)}
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata</option>
                      <option value="UTC">UTC</option>
                    </select>
                    <div className="form-text">Used for timestamps and audit logs.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <i className="bi bi-cash-coin text-success"></i>
                    <h5 className="mb-0 fw-bold">Financial Settings</h5>
                  </div>

                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={!!settings.general.financial.allowNegativeBalance}
                      disabled={!canEdit}
                      onChange={(e) => setAtPath(['general', 'financial', 'allowNegativeBalance'], e.target.checked)}
                      id="allowNegativeBalance"
                    />
                    <label className="form-check-label" htmlFor="allowNegativeBalance">Allow Negative Balance</label>
                    <div className="form-text">If disabled, you should block transactions that result in negative balances.</div>
                  </div>

                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={!!settings.general.financial.enableCashAccounts}
                      disabled={!canEdit}
                      onChange={(e) => setAtPath(['general', 'financial', 'enableCashAccounts'], e.target.checked)}
                      id="enableCashAccounts"
                    />
                    <label className="form-check-label" htmlFor="enableCashAccounts">Enable Cash Accounts</label>
                    <div className="form-text">If disabled, hide/disable the Cash account type in Accounts module.</div>
                  </div>

                  <div>
                    <label className="form-label">Default Opening Balance Behavior</label>
                    <select
                      className="form-select"
                      value={settings.general.financial.openingBalanceBehavior}
                      disabled={!canEdit}
                      onChange={(e) => setAtPath(['general', 'financial', 'openingBalanceBehavior'], e.target.value)}
                    >
                      <option value="Manual">Manual</option>
                      <option value="Auto-calculated">Auto-calculated</option>
                    </select>
                    <div className="form-text">Controls how opening balances are set when creating accounts.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <i className="bi bi-arrow-left-right text-primary"></i>
                    <h5 className="mb-0 fw-bold">Transaction Settings</h5>
                  </div>

                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={!!settings.general.transactions.autoSetCurrentDate}
                      disabled={!canEdit}
                      onChange={(e) => setAtPath(['general', 'transactions', 'autoSetCurrentDate'], e.target.checked)}
                      id="autoSetCurrentDate"
                    />
                    <label className="form-check-label" htmlFor="autoSetCurrentDate">Auto-set Current Date</label>
                    <div className="form-text">Default the transaction date to today for new entries.</div>
                  </div>

                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={!!settings.general.transactions.allowBackdatedEntries}
                      disabled={!canEdit}
                      onChange={(e) => setAtPath(['general', 'transactions', 'allowBackdatedEntries'], e.target.checked)}
                      id="allowBackdatedEntries"
                    />
                    <label className="form-check-label" htmlFor="allowBackdatedEntries">Allow Backdated Entries</label>
                    <div className="form-text">If disabled, block choosing dates before today.</div>
                  </div>

                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={!!settings.general.transactions.requireReferenceNumber}
                      disabled={!canEdit}
                      onChange={(e) => setAtPath(['general', 'transactions', 'requireReferenceNumber'], e.target.checked)}
                      id="requireReferenceNumber"
                    />
                    <label className="form-check-label" htmlFor="requireReferenceNumber">Require Reference Number</label>
                    <div className="form-text">If enabled, reference number becomes mandatory for all transactions.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <i className="bi bi-shield-lock text-danger"></i>
                    <h5 className="mb-0 fw-bold">Security Settings</h5>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Session Timeout (minutes)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={settings.general.security.sessionTimeoutMins}
                      disabled={!canEdit}
                      onChange={(e) => setAtPath(['general', 'security', 'sessionTimeoutMins'], Number(e.target.value))}
                      min={5}
                      max={240}
                    />
                    <div className="form-text">Recommended: 30 minutes. Range: 5–240.</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Password Minimum Length</label>
                    <input
                      type="number"
                      className="form-control"
                      value={settings.general.security.passwordMinLength}
                      disabled={!canEdit}
                      onChange={(e) => setAtPath(['general', 'security', 'passwordMinLength'], Number(e.target.value))}
                      min={6}
                      max={64}
                    />
                    <div className="form-text">Minimum allowed characters for user passwords.</div>
                  </div>

                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={!!settings.general.security.strongPasswordPolicy}
                      disabled={!canEdit}
                      onChange={(e) => setAtPath(['general', 'security', 'strongPasswordPolicy'], e.target.checked)}
                      id="strongPasswordPolicy"
                    />
                    <label className="form-check-label" htmlFor="strongPasswordPolicy">Enable Strong Password Policy</label>
                    <div className="form-text">Encourage stronger passwords (uppercase, lowercase, number, symbol).</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <i className="bi bi-sliders text-secondary"></i>
                    <h5 className="mb-0 fw-bold">System Settings</h5>
                  </div>

                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={!!settings.general.system.enableAuditLogs}
                          disabled={!canEdit}
                          onChange={(e) => setAtPath(['general', 'system', 'enableAuditLogs'], e.target.checked)}
                          id="enableAuditLogs"
                        />
                        <label className="form-check-label" htmlFor="enableAuditLogs">Enable Audit Logs</label>
                        <div className="form-text">Track critical changes to masters, accounts, and transactions.</div>
                      </div>
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={!!settings.general.system.enableNotifications}
                          disabled={!canEdit}
                          onChange={(e) => setAtPath(['general', 'system', 'enableNotifications'], e.target.checked)}
                          id="enableNotifications"
                        />
                        <label className="form-check-label" htmlFor="enableNotifications">Enable Notifications</label>
                        <div className="form-text">Show system alerts and important operational notifications.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {isPreferences && (
        <>
          <div className="row g-4">
            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <i className="bi bi-palette text-primary"></i>
                    <h5 className="mb-0 fw-bold">UI Settings</h5>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Theme</label>
                    <select
                      className="form-select"
                      value={settings.preferences.ui.theme}
                      disabled={!canEdit}
                      onChange={(e) => setAtPath(['preferences', 'ui', 'theme'], e.target.value)}
                    >
                      <option value="Light">Light</option>
                      <option value="Dark">Dark</option>
                    </select>
                    <div className="form-text">Controls overall application appearance.</div>
                  </div>

                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={!!settings.preferences.ui.compactView}
                      disabled={!canEdit}
                      onChange={(e) => setAtPath(['preferences', 'ui', 'compactView'], e.target.checked)}
                      id="compactView"
                    />
                    <label className="form-check-label" htmlFor="compactView">Compact View</label>
                    <div className="form-text">Reduce whitespace for data-heavy screens.</div>
                  </div>

                  <div>
                    <label className="form-label">Table Density</label>
                    <select
                      className="form-select"
                      value={settings.preferences.ui.tableDensity}
                      disabled={!canEdit}
                      onChange={(e) => setAtPath(['preferences', 'ui', 'tableDensity'], e.target.value)}
                    >
                      <option value="Comfortable">Comfortable</option>
                      <option value="Compact">Compact</option>
                    </select>
                    <div className="form-text">Applies to tables like Accounts and Transactions.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <i className="bi bi-speedometer2 text-success"></i>
                    <h5 className="mb-0 fw-bold">Dashboard Settings</h5>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Default Dashboard View</label>
                    <select
                      className="form-select"
                      value={settings.preferences.dashboard.defaultView}
                      disabled={!canEdit}
                      onChange={(e) => setAtPath(['preferences', 'dashboard', 'defaultView'], e.target.value)}
                    >
                      <option value="Company-wise">Company-wise</option>
                      <option value="Account-wise">Account-wise</option>
                    </select>
                    <div className="form-text">Chooses which dashboard widget set loads by default.</div>
                  </div>

                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={!!settings.preferences.dashboard.showCharts}
                      disabled={!canEdit}
                      onChange={(e) => setAtPath(['preferences', 'dashboard', 'showCharts'], e.target.checked)}
                      id="showCharts"
                    />
                    <label className="form-check-label" htmlFor="showCharts">Show Charts</label>
                    <div className="form-text">Enable or disable graphs across dashboards.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <i className="bi bi-file-earmark-bar-graph text-primary"></i>
                    <h5 className="mb-0 fw-bold">Report Settings</h5>
                  </div>

                  <div className="row g-3">
                    <div className="col-12 col-md-4">
                      <label className="form-label">Default Export Format</label>
                      <select
                        className="form-select"
                        value={settings.preferences.reports.defaultExportFormat}
                        disabled={!canEdit}
                        onChange={(e) => setAtPath(['preferences', 'reports', 'defaultExportFormat'], e.target.value)}
                      >
                        <option value="PDF">PDF</option>
                        <option value="Excel">Excel</option>
                      </select>
                      <div className="form-text">Preselect export type in Reports module.</div>
                    </div>

                    <div className="col-12 col-md-4">
                      <div className="form-check form-switch mt-md-4">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={!!settings.preferences.reports.includeReference}
                          disabled={!canEdit}
                          onChange={(e) => setAtPath(['preferences', 'reports', 'includeReference'], e.target.checked)}
                          id="includeReference"
                        />
                        <label className="form-check-label" htmlFor="includeReference">Include Reference in Reports</label>
                        <div className="form-text">Adds reference number column to exports.</div>
                      </div>
                    </div>

                    <div className="col-12 col-md-4">
                      <div className="form-check form-switch mt-md-4">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={!!settings.preferences.reports.includePaymentMode}
                          disabled={!canEdit}
                          onChange={(e) => setAtPath(['preferences', 'reports', 'includePaymentMode'], e.target.checked)}
                          id="includePaymentMode"
                        />
                        <label className="form-check-label" htmlFor="includePaymentMode">Include Payment Mode in Reports</label>
                        <div className="form-text">Adds payment mode column to exports.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SettingsPage;
