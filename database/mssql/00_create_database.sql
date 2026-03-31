-- Create the FRMS operations database (run while connected to `master`).
-- Default JDBC: jdbc:sqlserver://...;databaseName=frms_ops (see server/frms-ops-api application.yml).

USE master;
GO

IF DB_ID(N'frms_ops') IS NULL
BEGIN
  CREATE DATABASE frms_ops COLLATE SQL_Latin1_General_CP1_CI_AS;
END
GO
