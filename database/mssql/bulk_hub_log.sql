-- Bulk hub preview / audit events — aligns with:
--   JPA: server/frms-ops-api/.../bulk/BulkHubEventEntity.java
--   REST: BulkHubEventController @RequestMapping("/bulk-hub/events") under context /api/v1
--   UI:   src/integrations/bulkDataHub/bulkHubRepository.ts + src/state/bulkHubStore.ts + BulkDataHubPage

IF OBJECT_ID(N'dbo.bulk_hub_event', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.bulk_hub_event (
    id VARCHAR(64) NOT NULL CONSTRAINT pk_bulk_hub_event PRIMARY KEY,
    target NVARCHAR(64) NOT NULL,
    file_name NVARCHAR(512) NOT NULL,
    row_count INT NOT NULL CONSTRAINT df_bulk_hub_row_count DEFAULT 0,
    column_count INT NOT NULL CONSTRAINT df_bulk_hub_col_count DEFAULT 0,
    sheet_name NVARCHAR(256) NULL,
    recorded_at NVARCHAR(32) NOT NULL
  );
END
GO
