use rusqlite::Connection;

pub fn initialize(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS downloads (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            sequence_name   TEXT NOT NULL,
            sequence_json   TEXT NOT NULL,
            status          TEXT NOT NULL DEFAULT 'pending',
            total_files     INTEGER NOT NULL DEFAULT 0,
            completed_files INTEGER NOT NULL DEFAULT 0,
            failed_files    INTEGER NOT NULL DEFAULT 0,
            save_directory  TEXT NOT NULL,
            started_at      TEXT,
            finished_at     TEXT,
            created_at      TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS media_files (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            download_id     INTEGER NOT NULL REFERENCES downloads(id) ON DELETE CASCADE,
            source_url      TEXT NOT NULL,
            page_url        TEXT NOT NULL,
            file_path       TEXT,
            file_name       TEXT,
            file_size       INTEGER DEFAULT 0,
            media_type      TEXT NOT NULL DEFAULT 'image',
            status          TEXT NOT NULL DEFAULT 'pending',
            retry_count     INTEGER NOT NULL DEFAULT 0,
            error_message   TEXT,
            created_at      TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
        CREATE INDEX IF NOT EXISTS idx_downloads_created ON downloads(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_media_files_download ON media_files(download_id);
        CREATE INDEX IF NOT EXISTS idx_media_files_status ON media_files(status);
        ",
    )
}
