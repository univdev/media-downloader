use crate::models::media_file::MediaFile;
use rusqlite::{params, Connection};

pub fn insert_media_file(
    conn: &Connection,
    download_id: i64,
    source_url: &str,
    page_url: &str,
    media_type: &str,
) -> rusqlite::Result<i64> {
    conn.execute(
        "INSERT INTO media_files (download_id, source_url, page_url, media_type, status)
         VALUES (?1, ?2, ?3, ?4, 'pending')",
        params![download_id, source_url, page_url, media_type],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn update_media_file_status(
    conn: &Connection,
    id: i64,
    status: &str,
    file_path: Option<&str>,
    file_name: Option<&str>,
    file_size: u64,
    retry_count: u32,
    error_message: Option<&str>,
) -> rusqlite::Result<()> {
    conn.execute(
        "UPDATE media_files SET status = ?1, file_path = ?2, file_name = ?3,
         file_size = ?4, retry_count = ?5, error_message = ?6 WHERE id = ?7",
        params![status, file_path, file_name, file_size, retry_count, error_message, id],
    )?;
    Ok(())
}

pub fn list_media_files_by_download(
    conn: &Connection,
    download_id: i64,
) -> rusqlite::Result<Vec<MediaFile>> {
    let mut stmt = conn.prepare(
        "SELECT id, download_id, source_url, page_url, file_path, file_name,
                file_size, media_type, status, retry_count, error_message, created_at
         FROM media_files WHERE download_id = ?1 ORDER BY id",
    )?;

    let files = stmt
        .query_map(params![download_id], |row| {
            Ok(MediaFile {
                id: row.get(0)?,
                download_id: row.get(1)?,
                source_url: row.get(2)?,
                page_url: row.get(3)?,
                file_path: row.get(4)?,
                file_name: row.get(5)?,
                file_size: row.get(6)?,
                media_type: row.get(7)?,
                status: row.get(8)?,
                retry_count: row.get(9)?,
                error_message: row.get(10)?,
                created_at: row.get(11)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(files)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{download_repo, schema};

    fn setup_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        schema::initialize(&conn).unwrap();
        conn
    }

    #[test]
    fn test_insert_and_list_media_files() {
        let conn = setup_db();
        let dl_id = download_repo::insert_download(&conn, "Test", "{}", "/tmp").unwrap();

        insert_media_file(&conn, dl_id, "https://img.com/1.jpg", "https://page.com", "image")
            .unwrap();
        insert_media_file(&conn, dl_id, "https://img.com/2.jpg", "https://page.com", "image")
            .unwrap();

        let files = list_media_files_by_download(&conn, dl_id).unwrap();
        assert_eq!(files.len(), 2);
        assert_eq!(files[0].source_url, "https://img.com/1.jpg");
        assert_eq!(files[0].status, "pending");
    }

    #[test]
    fn test_update_media_file_status() {
        let conn = setup_db();
        let dl_id = download_repo::insert_download(&conn, "Test", "{}", "/tmp").unwrap();
        let file_id =
            insert_media_file(&conn, dl_id, "https://img.com/1.jpg", "https://page.com", "image")
                .unwrap();

        update_media_file_status(
            &conn,
            file_id,
            "completed",
            Some("/tmp/img.jpg"),
            Some("img.jpg"),
            1024,
            0,
            None,
        )
        .unwrap();

        let files = list_media_files_by_download(&conn, dl_id).unwrap();
        assert_eq!(files[0].status, "completed");
        assert_eq!(files[0].file_path, Some("/tmp/img.jpg".to_string()));
        assert_eq!(files[0].file_size, 1024);
    }

    #[test]
    fn test_update_media_file_with_error() {
        let conn = setup_db();
        let dl_id = download_repo::insert_download(&conn, "Test", "{}", "/tmp").unwrap();
        let file_id =
            insert_media_file(&conn, dl_id, "https://img.com/1.jpg", "https://page.com", "image")
                .unwrap();

        update_media_file_status(
            &conn, file_id, "failed", None, None, 0, 3, Some("Connection timeout"),
        )
        .unwrap();

        let files = list_media_files_by_download(&conn, dl_id).unwrap();
        assert_eq!(files[0].status, "failed");
        assert_eq!(files[0].retry_count, 3);
        assert_eq!(
            files[0].error_message,
            Some("Connection timeout".to_string())
        );
    }
}
