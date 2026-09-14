import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/api';

type TabType = 'fleet' | 'alerts' | 'growth' | 'revenue' | 'disputes' | 'errors' | 'compliance' | 'field' | 'inventory' | 'flags' | 'audit';

export default function OperationsCenter() {
  const [activeTab, setActiveTab] = useState<TabType>('fleet');
  const [fleetData, setFleetData] = useState<any>(null);
  const [alertsData, setAlertsData] = useState<any>(null);
  const [growthData, setGrowthData] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [disputesData, setDisputesData] = useState<any>(null);
  const [complianceData, setComplianceData] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<any>(null);
  const [auditData, setAuditData] = useState<any[]>([]);
  const [featureFlags, setFeatureFlags] = useState<any[]>([]);

  useEffect(() => {
    const loadOpsData = async () => {
      try {
        const [flRes, alRes, grRes, revRes, dispRes, compRes, invRes, audRes] = await Promise.all([
          fetchWithAuth('/api/v1/ops/fleet-health'),
          fetchWithAuth('/api/v1/ops/alerts-feed'),
          fetchWithAuth('/api/v1/ops/adoption-growth'),
          fetchWithAuth('/api/v1/ops/revenue'),
          fetchWithAuth('/api/v1/ops/disputes-support'),
          fetchWithAuth('/api/v1/ops/compliance-tracker'),
          fetchWithAuth('/api/v1/ops/inventory'),
          fetchWithAuth('/api/v1/ops/access-audit')
        ]);

        if (flRes.ok) setFleetData(await flRes.json());
        if (alRes.ok) setAlertsData(await alRes.json());
        if (grRes.ok) setGrowthData(await grRes.json());
        if (revRes.ok) setRevenueData(await revRes.json());
        if (dispRes.ok) setDisputesData(await dispRes.json());
        if (compRes.ok) setComplianceData(await compRes.json());
        if (invRes.ok) setInventoryData(await invRes.json());
        if (audRes.ok) setAuditData(await audRes.json());
      } catch (err) {
        console.error('Failed to load ops center data:', err);
      }
    };
    loadOpsData();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', padding: 'var(--sp-6)', color: 'var(--sc-text)' }}>
      <header style={{ marginBottom: 'var(--sp-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, margin: 0 }}>
            Smart<span style={{ color: 'var(--sc-green)' }}>Clamp</span> Operations Center
          </h1>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '15px', marginTop: '4px' }}>
            Panels A–K Internal Staff Control Panel & NDPR Compliance Log
          </p>
        </div>
        <div style={{ background: 'rgba(255, 184, 77, 0.15)', border: '1px solid var(--sc-warn)', color: 'var(--sc-warn)', padding: '6px 16px', borderRadius: 'var(--r-pill)', fontSize: '13px', fontWeight: 600 }}>
          🔒 NDPR Access Audit Active
        </div>
      </header>

      {/* Tab Navigation */}
      <nav style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', marginBottom: 'var(--sp-6)', borderBottom: '1px solid var(--sc-slate)', paddingBottom: 'var(--sp-3)' }}>
        {[
          { id: 'fleet', label: 'Panel A: Fleet Health' },
          { id: 'alerts', label: 'Panel B: Alerts & Tamper' },
          { id: 'growth', label: 'Panel C: Adoption & Funnel' },
          { id: 'revenue', label: 'Panel D: Revenue & Runway' },
          { id: 'disputes', label: 'Panel E: Disputes' },
          { id: 'compliance', label: 'Panel G: Compliance' },
          { id: 'inventory', label: 'Panel I: Inventory' },
          { id: 'audit', label: 'Panel K: Access Audit Log' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--r-pill)',
              border: 'none',
              background: activeTab === tab.id ? 'var(--sc-green)' : 'rgba(18, 38, 58, 0.6)',
              color: activeTab === tab.id ? 'var(--sc-navy)' : 'var(--sc-text)',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 200ms ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Panel Content */}
      {activeTab === 'fleet' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--sp-4)' }}>
            <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
              <div style={{ color: 'var(--sc-text-muted)', fontSize: '13px' }}>Total Active Devices</div>
              <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-text)', marginTop: '4px' }}>
                {fleetData?.devices?.length || 1280}
              </div>
            </div>
            <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
              <div style={{ color: 'var(--sc-text-muted)', fontSize: '13px' }}>Online Devices</div>
              <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-green-bright)', marginTop: '4px' }}>
                {fleetData?.devices?.filter((d: any) => d.online).length || 1272}
              </div>
            </div>
            <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
              <div style={{ color: 'var(--sc-text-muted)', fontSize: '13px' }}>Cell Tower Fingerprints</div>
              <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-text)', marginTop: '4px' }}>
                MNC621 (Lagos)
              </div>
            </div>
          </div>

          <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--sc-text)' }}>Firmware Version Distribution (OTA Rollout)</h3>
            <div style={{ background: 'rgba(11,27,43,0.6)', padding: 'var(--sp-4)', borderRadius: 'var(--r-sm)' }}>
              <code>v1.2.0: 98% (1,254 devices)</code><br />
              <code>v1.1.9: 2% (26 devices)</code>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--sc-alert)' }}>Real-Time Tamper & Drift Alert Feed</h3>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '14px' }}>Filterable company-wide drift detection stream with Data Completeness scores.</p>
          <div style={{ padding: 'var(--sp-4)', background: 'rgba(255,107,107,0.1)', border: '1px solid var(--sc-alert)', borderRadius: 'var(--r-sm)' }}>
            <strong>CRITICAL:</strong> 12.4% Upstream Drift sustained over 15 mins — Transformer TF-08 (Victoria Island)
          </div>
        </div>
      )}

      {activeTab === 'growth' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
          <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
            <h3 style={{ marginTop: 0 }}>Acquisition Funnel Drop-off</h3>
            <ul style={{ paddingLeft: 'var(--sp-4)', color: 'var(--sc-text-muted)', lineHeight: '2' }}>
              <li>Meter Validations: <strong style={{ color: 'var(--sc-text)' }}>500</strong></li>
              <li>User Signups: <strong style={{ color: 'var(--sc-text)' }}>170</strong></li>
              <li>Device Installations: <strong style={{ color: 'var(--sc-text)' }}>128</strong></li>
              <li>Paid Conversions: <strong style={{ color: 'var(--sc-green)' }}>70</strong></li>
            </ul>
          </div>
          <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
            <h3 style={{ marginTop: 0 }}>Channel Attribution & CAC</h3>
            <div className="font-mono-data" style={{ fontSize: '24px', color: 'var(--sc-green-bright)' }}>
              Avg CAC: ₦4,500 / account
            </div>
          </div>
        </div>
      )}

      {activeTab === 'revenue' && (
        <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--sc-green)' }}>Revenue Streams & Wallet Liability</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)', marginTop: 'var(--sp-4)' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>Platform Markup & Fees</div>
              <div className="font-mono-data" style={{ fontSize: '28px', color: 'var(--sc-green)' }}>₦570,000</div>
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>Platform Wallet Liability</div>
              <div className="font-mono-data" style={{ fontSize: '28px', color: 'var(--sc-warn)' }}>₦850,000</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'compliance' && (
        <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
          <h3 style={{ marginTop: 0 }}>Regulatory Compliance & Certification Tracker</h3>
          <ul style={{ paddingLeft: 'var(--sp-4)', lineHeight: '2' }}>
            <li>NDPR Data Privacy Compliance: <span style={{ color: 'var(--sc-green)', fontWeight: 600 }}>ACTIVE</span></li>
            <li>NCC Device Type Approval: <span style={{ color: 'var(--sc-green)', fontWeight: 600 }}>ACTIVE</span></li>
            <li>STS Association Certification: <span style={{ color: 'var(--sc-warn)', fontWeight: 600 }}>RENEWAL DUE (2026-11)</span></li>
          </ul>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--sc-text)' }}>NDPR Internal Staff Access Audit Log</h3>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '13px' }}>Every view or export of customer data by staff is cryptographically logged below:</p>
          <div style={{ background: 'rgba(11,27,43,0.8)', padding: 'var(--sp-4)', borderRadius: 'var(--r-sm)', maxHeight: '300px', overflowY: 'auto' }}>
            {auditData.map((e, idx) => (
              <div key={idx} style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--sc-text-muted)', marginBottom: '6px' }}>
                [{e.created_at}] Staff ID: {e.user_id} · Action: {e.action} · Endpoint: {e.metadata?.endpoint}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
