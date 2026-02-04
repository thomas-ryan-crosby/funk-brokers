function mapRowToPost(row) {
  if (!row) return null;
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name,
    type: row.type,
    body: row.body,
    propertyId: row.property_id,
    propertyAddress: row.property_address,
    imageUrl: row.image_url,
    pollOptions: row.poll_options || [],
    hashtags: row.hashtags || [],
    userTags: row.user_tags || [],
    likeCount: row.like_count ?? 0,
    commentCount: row.comment_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseLimit(value, fallback = 50, max = 100) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
}

function mapRowToComment(row) {
  if (!row) return null;
  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at,
  };
}

module.exports = { mapRowToPost, mapRowToComment, parseLimit };
