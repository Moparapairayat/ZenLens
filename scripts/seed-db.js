/**
 * Seed script for testing
 * Populates SQLite database with sample media entries for simulator testing
 */

const Database = require('react-native-sqlite-storage').default;

async function seedDatabase() {
  try {
    const db = await Database.openDatabase({
      name: 'zenlens.db',
      location: 'default',
    });

    const sampleMedia = [
      {
        id: 'sample_1',
        uri: 'file:///sample/photo1.jpg',
        filename: 'photo1.jpg',
        width: 1000,
        height: 1000,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      },
      {
        id: 'sample_2',
        uri: 'file:///sample/photo2.jpg',
        filename: 'landscape.jpg',
        width: 1920,
        height: 1080,
        createdAt: Date.now() - 86400000,
        modifiedAt: Date.now() - 86400000,
      },
      {
        id: 'sample_3',
        uri: 'file:///sample/photo3.jpg',
        filename: 'portrait.jpg',
        width: 1080,
        height: 1920,
        createdAt: Date.now() - 172800000,
        modifiedAt: Date.now() - 172800000,
      },
    ];

    for (const media of sampleMedia) {
      await new Promise((resolve, reject) => {
        db.transaction((tx) => {
          tx.executeSql(
            `INSERT OR IGNORE INTO media (id, uri, filename, width, height, createdAt, modifiedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              media.id,
              media.uri,
              media.filename,
              media.width,
              media.height,
              media.createdAt,
              media.modifiedAt,
            ],
            () => resolve(null),
            (_, err) => reject(err)
          );
        });
      });
    }

    console.log('Database seeded with sample media');
  } catch (error) {
    console.error('Seed error:', error);
  }
}

seedDatabase();
