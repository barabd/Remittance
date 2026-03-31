-- Head Office Module (A.1.4) Dashboard Aggregations
-- The Head Office dashboard primarily aggregates metrics from Operations, Finance, and Compliance modules.
-- Below are structural representations of user specific dashboard layout preferences or quick-link configs, 
-- in case the layout is personalized in the future. 

CREATE TABLE frms_ho_dashboard_config (
    user_id VARCHAR(50) PRIMARY KEY,
    theme VARCHAR(50) DEFAULT 'light',
    layout_json NVARCHAR(MAX),
    updated_at VARCHAR(50)
);

-- Note: The live metrics for Queue Pending Approvals, Disbursments, and Master Active counts
-- are pulled live from their respective transaction tables (e.g. frms_remittance_queue, frms_masters_beneficiary).
