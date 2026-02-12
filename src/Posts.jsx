import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './styles/posts.css';

const Posts = ({ profile }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState({ title: '', description: '' });
  const [showNewPost, setShowNewPost] = useState(false);
  const [expandedPost, setExpandedPost] = useState(null);
  const [newReply, setNewReply] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editData, setEditData] = useState({ title: '', description: '' });

  const canCreatePost = profile?.role === 'admin' || profile?.role === 'leader';
  const canManagePosts = profile?.role === 'admin' || profile?.role === 'leader';

  useEffect(() => {
    fetchPosts();
    
    const subscription = supabase
      .channel('communications_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'communications' },
        () => fetchPosts()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    
    const { data: postsData, error: postsError } = await supabase
      .from('communications')
      .select('*')
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      alert('Error loading posts: ' + postsError.message);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(postsData.map(post => post.user_id))];
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    const profilesMap = {};
    (profilesData || []).forEach(profile => {
      profilesMap[profile.id] = profile;
    });

    const processedData = postsData.map(post => ({
      ...post,
      replies: post.replies || [],
      profiles: profilesMap[post.user_id]
    }));

    setPosts(processedData);
    setLoading(false);
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    
    if (!newPost.title.trim() || !newPost.description.trim()) {
      alert('Please fill in both title and description');
      return;
    }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('communications')
      .insert([{
        user_id: user.id,
        title: newPost.title.trim(),
        description: newPost.description.trim(),
        replies: []
      }]);

    if (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Make sure you have permission.');
    } else {
      setNewPost({ title: '', description: '' });
      setShowNewPost(false);
      fetchPosts();
    }
    setSubmitting(false);
  };

  const handleUpdatePost = async (postId) => {
    if (!editData.title.trim() || !editData.description.trim()) {
      alert('Please fill in both title and description');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase
      .from('communications')
      .update({
        title: editData.title.trim(),
        description: editData.description.trim()
      })
      .eq('id', postId);

    if (error) {
      console.error('Error updating post:', error);
      alert('Failed to update post.');
    } else {
      setEditingPost(null);
      setEditData({ title: '', description: '' });
      fetchPosts();
    }
    setSubmitting(false);
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    setSubmitting(true);
    const { error } = await supabase
      .from('communications')
      .delete()
      .eq('id', postId);

    if (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post.');
    } else {
      fetchPosts();
    }
    setSubmitting(false);
  };

  const startEditingPost = (post) => {
    setEditingPost(post.id);
    setEditData({ title: post.title, description: post.description });
  };

  const cancelEditing = () => {
    setEditingPost(null);
    setEditData({ title: '', description: '' });
  };

  const handleTogglePost = (postId) => {
    setExpandedPost(expandedPost === postId ? null : postId);
  };

  const handleCreateReply = async (post) => {
    const replyContent = newReply[post.id]?.trim();
    
    if (!replyContent) {
      alert('Reply cannot be empty');
      return;
    }

    setSubmitting(true);

    const replyObject = {
      content: replyContent,
      user_id: profile.id,
      user_name: `${profile.first_name} ${profile.last_name}`,
      created_at: new Date().toISOString()
    };

    const currentReplies = post.replies || [];
    const updatedReplies = [...currentReplies, replyObject];

    const { error } = await supabase
      .from('communications')
      .update({ replies: updatedReplies })
      .eq('id', post.id);

    if (error) {
      console.error('Error creating reply:', error);
      alert('Failed to create reply');
    } else {
      setNewReply(prev => ({ ...prev, [post.id]: '' }));
      fetchPosts();
    }
    setSubmitting(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return <div className="posts-loading">Loading posts...</div>;
  }

  return (
    <div className="posts-container">
      <div className="posts-header">
        <h2>Recent Posts</h2>
        {canCreatePost && (
          <button 
            className="new-post-btn"
            onClick={() => setShowNewPost(!showNewPost)}
            disabled={submitting}
          >
            {showNewPost ? 'Cancel' : 'Create New Post'}
          </button>
        )}
      </div>

      {showNewPost && canCreatePost && (
        <form className="new-post-form" onSubmit={handleCreatePost}>
          <input
            type="text"
            placeholder="Title"
            value={newPost.title}
            onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
            maxLength="200"
            disabled={submitting}
          />
          <textarea
            placeholder="Description"
            value={newPost.description}
            onChange={(e) => setNewPost({ ...newPost, description: e.target.value })}
            rows="4"
            disabled={submitting}
          />
          <button 
            type="submit" 
            className="submit-post-btn" 
            disabled={submitting || !newPost.title.trim() || !newPost.description.trim()}
          >
            {submitting ? 'Posting...' : 'Post'}
          </button>
        </form>
      )}

      <div className="posts-list">
        {posts.length === 0 ? (
          <div className="no-posts">No posts yet. Check back later!</div>
        ) : (
          posts.map((post) => {
            const replies = post.replies || [];
            const isEditing = editingPost === post.id;
            
            return (
              <div key={post.id} className="post-card">
                <div className="post-header">
                  <div className="post-author">
                    <span className="author-name">
                      {post.profiles?.first_name} {post.profiles?.last_name}
                    </span>
                    {post.profiles?.role === 'admin' && (
                      <span className="role-badge admin">Administrator</span>
                    )}
                    {post.profiles?.role === 'leader' && (
                      <span className="role-badge leader">Leader</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="post-date">{formatDate(post.created_at)}</span>
                    {canManagePosts && !isEditing && (
                      <div 
                        className="post-actions-buttons"
                        style={{ display: 'flex', gap: '0.25rem' }}
                      >
                        <button 
                          className="btn-icon edit"
                          onClick={() => startEditingPost(post)}
                          title="Edit post"
                        >
                          ✎
                        </button>
                        <button 
                          className="btn-icon delete"
                          onClick={() => handleDeletePost(post.id)}
                          title="Delete post"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="edit-post-form">
                    <input
                      type="text"
                      value={editData.title}
                      onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                      maxLength="200"
                      disabled={submitting}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        marginBottom: '0.5rem',
                        border: '2px solid #000',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontFamily: 'inherit'
                      }}
                    />
                    <textarea
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      rows="3"
                      disabled={submitting}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        marginBottom: '0.5rem',
                        border: '2px solid #000',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontFamily: 'inherit'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleUpdatePost(post.id)}
                        disabled={submitting || !editData.title.trim() || !editData.description.trim()}
                        className="submit-post-btn"
                      >
                        {submitting ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEditing}
                        disabled={submitting}
                        className="cancel-edit-btn"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="post-title">{post.title}</h3>
                    <p className="post-description">{post.description}</p>
                  </>
                )}

                <button 
                  className="reply-toggle-btn"
                  onClick={() => handleTogglePost(post.id)}
                >
                  {expandedPost === post.id ? 'Hide' : 'View'} Replies ({replies.length})
                </button>

                {expandedPost === post.id && (
                  <div className="replies-section">
                    <div className="replies-list">
                      {replies.map((reply, index) => (
                        <div key={index} className="reply-card">
                          <div className="reply-header">
                            <span className="reply-author">
                              {reply.user_name}
                            </span>
                            <span className="reply-date">
                              {formatDate(reply.created_at)}
                            </span>
                          </div>
                          <p className="reply-content">{reply.content}</p>
                        </div>
                      ))}
                    </div>

                    <div className="new-reply-form">
                      <textarea
                        placeholder="Write a reply..."
                        value={newReply[post.id] || ''}
                        onChange={(e) => setNewReply(prev => ({ 
                          ...prev, 
                          [post.id]: e.target.value 
                        }))}
                        rows="2"
                        disabled={submitting}
                      />
                      <button 
                        onClick={() => handleCreateReply(post)}
                        className="submit-reply-btn"
                        disabled={submitting || !newReply[post.id]?.trim()}
                      >
                        {submitting ? 'Replying...' : 'Reply'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Posts;