-- Investigation cases — aligns with:
--   JPA: server/frms-ops-api/.../cases/InvestigationCaseEntity.java (+ CaseNoteEmbeddable)
--   REST: InvestigationCaseController @RequestMapping("/investigation-cases") under context /api/v1
--   UI:   src/integrations/investigationCases/caseRepository.ts → localStorage cache when offline
-- Hibernate `ddl-auto: update` can create these; script is for explicit DBA deploy.

IF OBJECT_ID(N'dbo.investigation_case', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.investigation_case (
    id VARCHAR(64) NOT NULL CONSTRAINT pk_investigation_case PRIMARY KEY,
    title NVARCHAR(512) NOT NULL,
    source NVARCHAR(32) NOT NULL,
    ref NVARCHAR(128) NULL,
    subject NVARCHAR(256) NULL,
    priority NVARCHAR(16) NOT NULL,
    status NVARCHAR(32) NOT NULL,
    assignee NVARCHAR(128) NOT NULL,
    created_at NVARCHAR(32) NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.investigation_case_note', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.investigation_case_note (
    case_id VARCHAR(64) NOT NULL,
    note_order INT NOT NULL,
    note_at NVARCHAR(32) NOT NULL,
    note_by NVARCHAR(128) NOT NULL,
    note_text NVARCHAR(4000) NOT NULL,
    CONSTRAINT pk_investigation_case_note PRIMARY KEY (case_id, note_order),
    CONSTRAINT fk_investigation_case_note_case FOREIGN KEY (case_id) REFERENCES dbo.investigation_case (id) ON DELETE CASCADE
  );
END
GO
