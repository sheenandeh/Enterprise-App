import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, postsRes, usersRes] = await Promise.all([
        axios.get('/dashboard'),
        axios.get('/posts'),
        axios.get('/users')
      ]);

      setStats(dashboardRes.data.stats);
      setPosts(postsRes.data.posts);
      setUsers(usersRes.data.users);
    } catch (error) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPost.title || !newPost.content) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await axios.post('/posts', newPost);
      setNewPost({ title: '', content: '' });
      setSuccess('Post created successfully!');
      setError('');
      // Refresh data
      fetchDashboardData();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to create post');
    }
  };

  const handlePostChange = (e) => {
    setNewPost({
      ...newPost,
      [e.target.name]: e.target.value
    });
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Users</h3>
            <div className="number">{stats.totalUsers}</div>
          </div>
          <div className="stat-card">
            <h3>Total Posts</h3>
            <div className="number">{stats.totalPosts}</div>
          </div>
          <div className="stat-card">
            <h3>Your Account</h3>
            <div className="number">{user?.username || 'N/A'}</div>
          </div>
        </div>
      )}

      <div className="section">
        <h3>Create New Post</h3>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <form onSubmit={handlePostSubmit} className="post-form">
          <input
            type="text"
            name="title"
            placeholder="Post title..."
            value={newPost.title}
            onChange={handlePostChange}
            required
          />
          <textarea
            name="content"
            placeholder="Write your post content..."
            value={newPost.content}
            onChange={handlePostChange}
            required
          />
          <button type="submit" className="btn">Create Post</button>
        </form>
      </div>

      <div className="section">
        <h3>Recent Posts</h3>
        {posts.length > 0 ? (
          <div className="posts-list">
            {posts.slice(0, 5).map(post => (
              <div key={post.id} className="post-item">
                <h4>{post.title}</h4>
                <div className="meta">
                  By {post.username} • {new Date(post.created_at).toLocaleDateString()}
                </div>
                <div className="content">{post.content}</div>
              </div>
            ))}
          </div>
        ) : (
          <p>No posts yet. Create the first one!</p>
        )}
      </div>

      <div className="section">
        <h3>All Users</h3>
        {users.length > 0 ? (
          <div className="users-list">
            {users.map(user => (
              <div key={user.id} className="user-item">
                <div className="info">
                  <div className="username">{user.username}</div>
                  <div className="email">{user.email}</div>
                </div>
                <div className="date">
                  Joined {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No users found.</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;