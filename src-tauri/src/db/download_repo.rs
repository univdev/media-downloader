use crate::models::download::Download;
use rusqlite::{params, Connection};

pub fn insert_download(
    conn: &Connection,
    sequence_name: &str,
    sequence_json: &str,
    save_directory: &str,
) -> rusqlite::Result<i64> {
    conn.execute(
        "INSERT INTO downloads (sequence_name, sequence_json, status, save_directory, started_at)
         VALUES (?1, ?2, 'scanning', ?3, datetime('now'))",
        params![sequence_name, sequence_json, save_directory],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn update_download_status(
    conn: &Connection,
    id: i64,
    status: &str,
    total_files: u32,
    completed_files: u32,
    failed_files: u32,
) -> rusqlite::Result<()> {
    let finished = if status == "completed" || status == "failed" || status == "cancelled" {
        "datetime('now')"
    } else {
        "NULL"
    };

    conn.execute(
        &format!(
            "UPDATE downloads SET status = ?1, total_files = ?2, completed_files = ?3,
             failed_files = ?4, finished_at = {} WHERE id = ?5",
            finished
        ),
        params![status, total_files, completed_files, failed_files, id],
    )?;
    Ok(())
}

pub fn get_download(conn: &Connection, id: i64) -> rusqlite::Result<Download> {
    conn.query_row(
        "SELECT id, sequence_name, sequence_json, status, total_files, completed_files,
                failed_files, save_directory, started_at, finished_at, created_at
         FROM downloads WHERE id = ?1",
        params![id],
        |row| {
            Ok(Download {
                id: row.get(0)?,
                sequence_name: row.get(1)?,
                sequence_json: row.get(2)?,
                status: row.get(3)?,
                total_files: row.get(4)?,
                completed_files: row.get(5)?,
                failed_files: row.get(6)?,
                save_directory: row.get(7)?,
                started_at: row.get(8)?,
                finished_at: row.get(9)?,
                created_at: row.get(10)?,
            })
        },
    )
}

pub fn list_downloads(
    conn: &Connection,
    page: u32,
    page_size: u32,
) -> rusqlite::Result<(Vec<Download>, u32)> {
    let total: u32 = conn.query_row("SELECT COUNT(*) FROM downloads", [], |row| row.get(0))?;

    let offset = (page.saturating_sub(1)) * page_size;
    let mut stmt = conn.prepare(
        "SELECT id, sequence_name, sequence_json, status, total_files, completed_files,
                failed_files, save_directory, started_at, finished_at, created_at
         FROM downloads ORDER BY created_at DESC LIMIT ?1 OFFSET ?2",
    )?;

    let downloads = stmt
        .query_map(params![page_size, offset], |row| {
            Ok(Download {
                id: row.get(0)?,
                sequence_name: row.get(1)?,
                sequence_json: row.get(2)?,
                status: row.get(3)?,
                total_files: row.get(4)?,
                completed_files: row.get(5)?,
                failed_files: row.get(6)?,
                save_directory: row.get(7)?,
                started_at: row.get(8)?,
                finished_at: row.get(9)?,
                created_at: row.get(10)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok((downloads, total))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::schema;

    fn setup_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        schema::initialize(&conn).unwrap();
        conn
    }

    #[test]
    fn test_insert_and_get_download() {
        let conn = setup_db();
        let id = insert_download(&conn, "Test Seq", "{}", "/tmp/test").unwrap();
        let dl = get_download(&conn, id).unwrap();

        assert_eq!(dl.sequence_name, "Test Seq");
        assert_eq!(dl.status, "scanning");
        assert_eq!(dl.save_directory, "/tmp/test");
    }

    #[test]
    fn test_update_download_status() {
        let conn = setup_db();
        let id = insert_download(&conn, "Test", "{}", "/tmp").unwrap();

        update_download_status(&conn, id, "completed", 10, 8, 2).unwrap();
        let dl = get_download(&conn, id).unwrap();

        assert_eq!(dl.status, "completed");
        assert_eq!(dl.total_files, 10);
        assert_eq!(dl.completed_files, 8);
        assert_eq!(dl.failed_files, 2);
    }

    #[test]
    fn test_list_downloads_pagination() {
        let conn = setup_db();
        for i in 0..5 {
            insert_download(&conn, &format!("Seq {}", i), "{}", "/tmp").unwrap();
        }

        let (downloads, total) = list_downloads(&conn, 1, 3).unwrap();
        assert_eq!(total, 5);
        assert_eq!(downloads.len(), 3);

        let (downloads, _) = list_downloads(&conn, 2, 3).unwrap();
        assert_eq!(downloads.len(), 2);
    }
}
