/**
 * ONE-TIME OPTIONAL: Copy Firestore social data (posts, comments, likes, follows) into Neon Postgres.
 * Run after Wave 4 migration (001_social_schema.sql) so Feed shows historical data when VITE_USE_SOCIAL_READS=true.
 *
 * Prereqs:
 * - Run scripts/migrations/001_social_schema.sql on Neon.
 * - Set DATABASE_URL (env or .env).
 * - firebase/serviceAccountKey.json present.
 *
 * Run from project root: node scripts/backfillSocialToPostgres.js
 */

const admin = require('firebase-admin');
const { Pool } = require('pg');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '../firebase/serviceAccountKey.json');
let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (e) {
  console.error('Missing firebase/serviceAccountKey.json');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Set DATABASE_URL (e.g. from Neon connection string).');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const firestore = admin.firestore();
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

function toDate(v) {
  if (!v) return null;
  const d = v?.toDate ? v.toDate() : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function backfill() {
  console.log('Backfill Firestore → Postgres (social)...');

  const client = await pool.connect();

  try {
    // 1) Posts + users (from authors)
    const postsSnap = await firestore.collection('posts').orderBy('createdAt', 'desc').get();
    console.log(`  Posts: ${postsSnap.size}`);

    for (const doc of postsSnap.docs) {
      const d = doc.data();
      const id = doc.id;
      const authorId = d.authorId || '';
      const authorName = d.authorName || 'User';
      const createdAt = toDate(d.createdAt) || new Date();
      const updatedAt = toDate(d.updatedAt) || createdAt;

      await client.query(
        `INSERT INTO users (id, name, public_username, created_at, updated_at) VALUES ($1, $2, $2, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET name = COALESCE(EXCLUDED.name, users.name), updated_at = NOW()`,
        [authorId, authorName]
      );
      await client.query(
        `INSERT INTO posts (id, author_id, author_name, type, body, property_id, property_address, image_url, poll_options, hashtags, user_tags, like_count, comment_count, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO UPDATE SET body = EXCLUDED.body, image_url = EXCLUDED.image_url, like_count = EXCLUDED.like_count, comment_count = EXCLUDED.comment_count, updated_at = EXCLUDED.updated_at`,
        [
          id,
          authorId,
          authorName,
          d.type || 'text',
          d.body || '',
          d.propertyId || null,
          d.propertyAddress || null,
          d.imageUrl || null,
          JSON.stringify(d.pollOptions || []),
          Array.isArray(d.hashtags) ? d.hashtags : [],
          Array.isArray(d.userTags) ? d.userTags : [],
          typeof d.likeCount === 'number' ? d.likeCount : 0,
          typeof d.commentCount === 'number' ? d.commentCount : 0,
          createdAt,
          updatedAt,
        ]
      );
    }

    // 2) Comments (subcollection posts/{id}/comments)
    let commentsTotal = 0;
    for (const doc of postsSnap.docs) {
      const commentsSnap = await firestore.collection('posts').doc(doc.id).collection('comments').orderBy('createdAt', 'asc').get();
      for (const c of commentsSnap.docs) {
        const d = c.data();
        const createdAt = toDate(d.createdAt) || new Date();
        await client.query(
          `INSERT INTO comments (id, post_id, author_id, author_name, body, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
          [c.id, doc.id, d.authorId || '', d.authorName || 'User', d.body || '', createdAt]
        );
        commentsTotal++;
      }
    }
    console.log(`  Comments: ${commentsTotal}`);

    // 3) Likes: from userLikes/{userId} postIds array → (post_id, user_id)
    const userLikesSnap = await firestore.collection('userLikes').get();
    let likesTotal = 0;
    for (const doc of userLikesSnap.docs) {
      const userId = doc.id;
      const postIds = doc.data()?.postIds || [];
      for (const postId of postIds) {
        await client.query(
          `INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT (post_id, user_id) DO NOTHING`,
          [postId, userId]
        );
        likesTotal++;
      }
    }
    console.log(`  Likes: ${likesTotal}`);

    // 4) Following: userFollowing/{followerId} following: [ids]
    const followingSnap = await firestore.collection('userFollowing').get();
    let followsTotal = 0;
    for (const doc of followingSnap.docs) {
      const followerId = doc.id;
      const following = doc.data()?.following || [];
      for (const followingId of following) {
        if (followingId && followingId !== followerId) {
          await client.query(
            `INSERT INTO user_following (follower_id, following_id) VALUES ($1, $2) ON CONFLICT (follower_id, following_id) DO NOTHING`,
            [followerId, followingId]
          );
          followsTotal++;
        }
      }
    }
    console.log(`  Following: ${followsTotal}`);

    console.log('Backfill done.');
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

backfill().catch((err) => {
  console.error(err);
  process.exit(1);
});
